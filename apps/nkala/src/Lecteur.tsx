/**
 * Lecteur d'Ontci (principes à la Spotify, NKALA_AUDIT_COMPLET.md §5.6) : file d'attente, lecteur flottant partout, préchargement
 * de l'adresse du titre suivant, mesure du délai « toucher → premier son », arrière-plan, protection contre l'enregistrement d'écran
 * pour les contenus protégés. Le chiffrement des segments (niveaux 1 et 2) se branche sur `licence` à la connexion des services.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as ScreenCapture from 'expo-screen-capture';
import { demanderLicence, resoudreMedia, verifierAcces } from '@nkala/noyau';
import { useAuth } from './AuthProvider';

export interface Piste {
  id: string; titre: string; artiste: string; pochette?: string | null; couleur?: string | null; audio_url?: string | null; duree_s?: number | null;
  paroles?: string | null; traduction?: string | null; niveau_acces?: string | null; collection?: string; protege?: boolean;
}
type Boucle = 'aucune' | 'file' | 'piste';

interface Etat {
  courant: Piste | null; file: Piste[]; index: number; enLecture: boolean; charge: boolean; position: number; duree: number;
  aleatoire: boolean; boucle: Boucle; refus: string | null; delaiPremierSonMs: number | null;
  jouer: (pistes: Piste[], index?: number) => void; basculer: () => void; suivant: () => void; precedent: () => void; aller: (s: number) => void;
  ajouter: (p: Piste) => void; basculerAleatoire: () => void; changerBoucle: () => void; arreter: () => void;
}
const Ctx = createContext<Etat | null>(null);
export const useLecteur = () => { const c = useContext(Ctx); if (!c) throw new Error('useLecteur hors de LecteurProvider'); return c; };

const resoudre = async (u?: string | null) => (u ? (/^https?:\/\//.test(u) ? u : await resoudreMedia(u)) : null);

export function LecteurProvider({ children }: { children: React.ReactNode }) {
  const { profil } = useAuth();
  const [file, setFile] = useState<Piste[]>([]);
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState<string | null>(null);
  const [aleatoire, setAleatoire] = useState(false);
  const [boucle, setBoucle] = useState<Boucle>('aucune');
  const [refus, setRefus] = useState<string | null>(null);
  const [delai, setDelai] = useState<number | null>(null);
  const [veutJouer, setVeutJouer] = useState(false);
  const toucheA = useRef(0);
  const prefetch = useRef<{ id: string; url: string | null } | null>(null);
  const player = useAudioPlayer(source ? { uri: source } : null);
  const statut = useAudioPlayerStatus(player);
  const courant = file[index] ?? null;

  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true } as any).catch(() => {}); }, []);

  // Charge la piste courante : contrôle d'accès côté serveur, puis adresse (préchargée si possible)
  useEffect(() => {
    let annule = false;
    setRefus(null); setSource(null);
    if (!courant) return;
    (async () => {
      try {
        let hls: string | null = null;
        // Média chiffré (HLS AES-128) : la licence courte donne l'adresse de la liste de lecture ; la clé n'est livrée qu'avec elle
        if (profil && courant.collection !== 'demo' && (courant.protege || (courant.niveau_acces && courant.niveau_acces !== 'libre'))) {
          const a = await verifierAcces(courant.collection ?? 'titres', courant.id);
          if (!a.autorise) { if (!annule) { setRefus(a.motif ?? 'acces_refuse'); setVeutJouer(false); } return; }
          hls = (await demanderLicence(courant.collection ?? 'titres', courant.id).catch(() => null))?.urlHls ?? null;
        }
        const u = hls ?? (prefetch.current?.id === courant.id ? prefetch.current.url : await resoudre(courant.audio_url));
        if (!annule) setSource(u);
        if (!annule && !u) setRefus('audio_indisponible');
      } catch { if (!annule) setRefus('audio_indisponible'); }
    })();
    return () => { annule = true; };
  }, [courant?.id, profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (source && veutJouer) { toucheA.current = toucheA.current || Date.now(); try { player.play(); } catch { /* lecteur non prêt */ } } }, [source]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (statut.playing && toucheA.current) { setDelai(Date.now() - toucheA.current); toucheA.current = 0; } }, [statut.playing]);

  // Préchargement : l'adresse du titre suivant est résolue pendant l'écoute
  useEffect(() => {
    const p = file[(index + 1) % Math.max(file.length, 1)];
    if (!p || p.id === courant?.id) return;
    resoudre(p.audio_url).then(url => { prefetch.current = { id: p.id, url }; }).catch(() => {});
  }, [index, file, courant?.id]);

  // Contenu protégé : pas d'enregistrement d'écran pendant la lecture (limites du système : voir NKALA_AUDIT_COMPLET.md §5.6bis)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const protege = !!courant && !!courant.niveau_acces && courant.niveau_acces !== 'libre' && statut.playing;
    (protege ? ScreenCapture.preventScreenCaptureAsync('lecture') : ScreenCapture.allowScreenCaptureAsync('lecture')).catch(() => {});
  }, [courant?.niveau_acces, statut.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const suivant = useCallback(() => {
    toucheA.current = Date.now(); setVeutJouer(true);
    setIndex(i => (aleatoire && file.length > 1 ? (i + 1 + Math.floor(Math.random() * (file.length - 1))) % file.length : i + 1 < file.length ? i + 1 : boucle === 'file' ? 0 : i));
  }, [aleatoire, boucle, file.length]);
  useEffect(() => { if (statut.didJustFinish) { if (boucle === 'piste') { player.seekTo(0); player.play(); } else suivant(); } }, [statut.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const valeur = useMemo<Etat>(() => ({
    courant, file, index, enLecture: statut.playing, charge: !!courant && !refus && (!source || !statut.isLoaded || statut.isBuffering), position: statut.currentTime || 0, duree: statut.duration || courant?.duree_s || 0,
    aleatoire, boucle, refus, delaiPremierSonMs: delai,
    jouer: (pistes, i = 0) => { toucheA.current = Date.now(); setDelai(null); setVeutJouer(true); setFile(pistes); setIndex(i); },
    basculer: () => { if (statut.playing) { player.pause(); setVeutJouer(false); } else { setVeutJouer(true); player.play(); } },
    suivant, precedent: () => { if ((statut.currentTime || 0) > 3) player.seekTo(0); else { toucheA.current = Date.now(); setVeutJouer(true); setIndex(i => Math.max(0, i - 1)); } },
    aller: (s) => player.seekTo(Math.max(0, s)), ajouter: (p) => setFile(f => (f.some(x => x.id === p.id) ? f : [...f, p])),
    basculerAleatoire: () => setAleatoire(a => !a), changerBoucle: () => setBoucle(b => (b === 'aucune' ? 'file' : b === 'file' ? 'piste' : 'aucune')),
    arreter: () => { try { player.pause(); } catch { /* */ } setFile([]); setIndex(0); setSource(null); setVeutJouer(false); },
  }), [courant, file, index, statut, source, aleatoire, boucle, refus, delai, suivant, player]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}
