"""
Reconnaissance des sons du myènè parlé (demande de Capp, 22 nov. 2026) : ZIPA (Zhu et al., ACL 2025 ; poids CC BY 4.0, jamais les
modèles « ns », non commerciaux) transcrit ce qu'il entend en alphabet phonétique international (API), quelle que soit la langue.
Il n'a jamais entendu d'ôrungu : la transcription est une proposition, convertie ensuite en graphie v3 par l'API Nkala.

Entrée : un court enregistrement (webm, m4a, wav… décodé par ffmpeg), 30 s au plus. Sortie : la suite de sons (API, sans tons).
Préparation du son : bancs de filtres Kaldi (kaldi-native-fbank, sans torch), mêmes réglages que la préparation officielle (lhotse) ;
échelle fixée par l'essai du 22 nov. 2026 (ZIPA_ECHELLE).
"""
import os
import subprocess

import kaldi_native_fbank as knf
import numpy as np
import onnxruntime as ort

MODELE = os.environ.get('ZIPA_MODELE', '/modele/zipa/model.int8.onnx')
JETONS = os.environ.get('ZIPA_JETONS', '/modele/zipa/tokens.txt')
ECHELLE = float(os.environ.get('ZIPA_ECHELLE', '1.0'))
DUREE_MAX = 30.0

_session = None
_vocab: dict[int, str] = {}


def _charger():
    global _session
    if _session is None:
        o = ort.SessionOptions()
        o.intra_op_num_threads = int(os.environ.get('OMP_NUM_THREADS', '2'))
        _session = ort.InferenceSession(MODELE, sess_options=o, providers=['CPUExecutionProvider'])
        with open(JETONS, encoding='utf-8') as f:
            for i, ligne in enumerate(f):
                p = ligne.strip().split()
                if p:
                    _vocab[int(p[1]) if len(p) > 1 else i] = p[0]
    return _session


def decoder_audio(octets: bytes) -> np.ndarray:
    """Tout format courant → 16 kHz, mono, flottants. ffmpeg lit depuis l'entrée standard, rien n'est écrit sur disque."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-t', str(DUREE_MAX), '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:1'],
                       input=octets, capture_output=True, timeout=30)
    if p.returncode != 0 or not p.stdout:
        raise ValueError('audio illisible')
    return np.frombuffer(p.stdout, dtype=np.float32)


def bancs_filtres(audio: np.ndarray) -> np.ndarray:
    o = knf.FbankOptions()
    o.frame_opts.samp_freq = 16000
    o.frame_opts.dither = 0
    o.frame_opts.snip_edges = False
    o.mel_opts.num_bins = 80
    o.mel_opts.low_freq = 20
    o.mel_opts.high_freq = -400
    f = knf.OnlineFbank(o)
    f.accept_waveform(16000, (audio * ECHELLE).tolist())
    f.input_finished()
    if f.num_frames_ready == 0:
        raise ValueError('audio trop court')
    return np.stack([f.get_frame(i) for i in range(f.num_frames_ready)]).astype(np.float32)


def reconnaitre(octets: bytes) -> dict:
    audio = decoder_audio(octets)
    if len(audio) < 1600:
        raise ValueError('audio trop court')
    sess = _charger()
    feat = bancs_filtres(audio)[None]
    proba = sess.run(None, {'x': feat, 'x_lens': np.array([feat.shape[1]], dtype=np.int64)})[0][0]
    # Décodage CTC glouton : on garde le meilleur symbole, on fusionne les répétitions, on retire le blanc (0).
    ids, prec, sons = np.argmax(proba, axis=-1), -1, []
    for i in ids:
        if i != 0 and i != prec:
            sons.append(_vocab.get(int(i), ''))
        prec = i
    texte = ''.join(sons).replace('▁', ' ').strip()
    return {'api': texte, 'duree_s': round(len(audio) / 16000, 2)}
