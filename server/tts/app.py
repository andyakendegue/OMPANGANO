"""
Synthèse vocale du myènè à partir de la transcription phonétique (API), pour Nkala.

Moteur : Kokoro-82M (licence Apache 2.0), version ONNX quantifiée, sur processeur. Le modèle lit directement une suite
de symboles phonétiques : tous les sons du myènè y figurent (ɛ ɔ ɲ ŋ β ɣ ɾ tʃ dʒ…). Il n'a jamais été entraîné sur le myènè :
la voix est celle d'un locuteur d'une autre langue qui lit l'API. Les tons sont rendus par la hauteur (accent) faute de mieux.
Le service est fait pour accueillir plus tard un modèle entraîné sur des enregistrements myènè (même entrée : l'API tonale).

Écoute seulement sur LISTEN_HOST (passerelle Docker interne 172.17.0.1 sur le serveur) ; jamais exposé sur Internet.

  POST /synthese  {"api": "[m̩bólò]", "voix": "im_nicola", "vitesse": 0.9, "tons": "accent"}  → audio/wav
  POST /phonemes  {"api": "..."}                                                          → ce que lit le modèle (contrôle)
  GET  /sante                                                                              → état, voix disponibles
"""
import io
import json
import os
import re
import threading
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODELE = os.environ.get('TTS_MODELE', '/modele/kokoro-v1.0.onnx')
VOIX = os.environ.get('TTS_VOIX_FICHIER', '/modele/voices-v1.0.bin')
VOIX_DEFAUT = os.environ.get('TTS_VOIX', 'im_nicola')
HOTE = os.environ.get('LISTEN_HOST', '127.0.0.1')
PORT = int(os.environ.get('LISTEN_PORT', '8700'))
MAX_CAR = 600

moteur = Kokoro(MODELE, VOIX)
VOCAB = set(moteur.tokenizer.vocab.keys()) if hasattr(moteur, 'tokenizer') and hasattr(moteur.tokenizer, 'vocab') else None
verrou = threading.Lock()  # un seul calcul à la fois : 4 cœurs partagés avec l'API et la base

AIGU, GRAVE, CIRC, CARON, MACRON = '́', '̀', '̂', '̌', '̄'
TONS = {AIGU: 'H', GRAVE: 'B', CIRC: 'HB', CARON: 'BH', MACRON: 'M'}
# Symboles de l'API myènè absents du modèle → équivalent le plus proche qu'il connaît.
REMPLACER = [
    ('t͡ʃ', 'ʧ'), ('tʃ', 'ʧ'), ('d͡ʒ', 'ʤ'), ('dʒ', 'ʤ'), ('t͡s', 'ʦ'), ('ts', 'ʦ'), ('d͡z', 'ʣ'),
    ('ⁿ', 'n'), ('ᵐ', 'm'), ('ᵑ', 'ŋ'), ('ʷ', 'w'), ('ɓ', 'b'), ('ɗ', 'd'), ('g', 'ɡ'), ('ɱ', 'm'),
    ('‖', '. '), ('|', ', '), ('ʼ', ''), ("'", ''), ('’', ''), ('-', ''), ('.', '. '),
]
VOYELLES = set('aeiouɛɔəɐɪʊæœøyɑɒʌɨ')


def vers_phonemes(api: str, tons: str = 'accent') -> str:
    """API myènè (avec tons en diacritiques) → suite de symboles du modèle.
    tons : 'accent' (ton haut = syllabe accentuée ˈ), 'fleches' (↗ ↘ après la voyelle), 'aucun'."""
    s = unicodedata.normalize('NFD', api.strip().strip('[]/'))
    s = s.replace('̩', '').replace('̍', '')  # nasale syllabique : m̩ → m
    for a, b in REMPLACER:
        s = s.replace(a, b)
    sortie = []
    for c in s:
        if c in TONS:
            t = TONS[c]
            if tons == 'fleches':
                sortie.append({'H': '↗', 'B': '↘', 'HB': '↘', 'BH': '↗'}.get(t, ''))
            elif tons == 'accent' and t in ('H', 'HB') and sortie:
                # ˈ au début de la syllabe : avant les consonnes qui précèdent la voyelle (syllabes ouvertes, CV)
                j = len(sortie) - 1
                while j > 0 and sortie[j - 1] not in VOYELLES and sortie[j - 1] not in ' .,!?ˈ':
                    j -= 1
                sortie.insert(j, 'ˈ')
            continue
        if unicodedata.category(c) == 'Mn':  # autre diacritique : ignoré
            continue
        sortie.append(c)
    p = re.sub(r'\s+', ' ', ''.join(sortie)).strip()
    p = re.sub(r'(\. )+', '. ', p)
    if VOCAB:
        p = ''.join(ch for ch in p if ch in VOCAB or ch == ' ')
    return p


def synthese(api: str, voix: str, vitesse: float, tons: str) -> bytes:
    ph = vers_phonemes(api, tons)
    if not ph:
        raise ValueError('transcription vide')
    with verrou:
        audio, sr = moteur.create(ph, voice=voix, speed=vitesse, is_phonemes=True)
    tampon = io.BytesIO()
    sf.write(tampon, np.asarray(audio), sr, format='WAV', subtype='PCM_16')
    return tampon.getvalue()


class Gestion(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):  # pas de texte des demandes dans le journal
        pass

    def do_GET(self):
        if self.path == '/sante':
            return self._json(200, {'ok': True, 'moteur': 'kokoro-82m', 'fichier': os.path.basename(MODELE), 'voix': sorted(moteur.get_voices()), 'voixDefaut': VOIX_DEFAUT})
        self._json(404, {'erreur': 'introuvable'})

    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length') or 0)
            if n > 20000:
                return self._json(413, {'erreur': 'demande trop longue'})
            d = json.loads(self.rfile.read(n) or b'{}')
            api = str(d.get('api') or '')[:MAX_CAR]
            tons = d.get('tons') if d.get('tons') in ('accent', 'fleches', 'aucun') else 'accent'
            if self.path == '/phonemes':
                return self._json(200, {'phonemes': vers_phonemes(api, tons)})
            if self.path != '/synthese':
                return self._json(404, {'erreur': 'introuvable'})
            voix = d.get('voix') if d.get('voix') in moteur.get_voices() else VOIX_DEFAUT
            vitesse = min(1.5, max(0.5, float(d.get('vitesse') or 0.9)))
            wav = synthese(api, voix, vitesse, tons)
            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(wav)))
            self.end_headers()
            self.wfile.write(wav)
        except ValueError as e:
            self._json(400, {'erreur': str(e)})
        except Exception as e:  # noqa: BLE001
            self._json(500, {'erreur': type(e).__name__})


if __name__ == '__main__':
    print(f'synthèse myènè sur {HOTE}:{PORT}', flush=True)
    ThreadingHTTPServer((HOTE, PORT), Gestion).serve_forever()
