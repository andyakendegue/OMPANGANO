import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';
import { clair, sombre, type Palette } from './theme';

export type ThemePref = 'auto' | 'clair' | 'sombre';
export type ModeUsage = 'adulte' | 'enfant' | 'facile';
export type NiveauAnim = 'completes' | 'legeres' | 'aucune';

export interface Prefs {
  theme: ThemePref; sons: boolean; vibrations: boolean; animations: NiveauAnim; mode: ModeUsage;
  /** Heure du rappel doux (HH:MM) ou null. */
  rappel: string | null; entreeVue: boolean; invite: boolean; autorisationsVues: boolean;
  /** Espace parents : code à 4 chiffres et limite de jeu quotidienne en minutes. */
  parentsCode: string | null; limiteMinutes: number | null;
}

const DEFAUT: Prefs = { theme: 'auto', sons: true, vibrations: true, animations: 'completes', mode: 'adulte', rappel: null, entreeVue: false, invite: false, autorisationsVues: false, parentsCode: null, limiteMinutes: null };
const CLE = 'nkala_prefs_v1';

interface Etat {
  prefs: Prefs; pret: boolean; palette: Palette; clair: boolean; reduireAnim: boolean;
  regler: (p: Partial<Prefs>) => void;
  /** Retour tactile discret (désactivable). */
  vibrer: (type?: 'leger' | 'succes' | 'erreur') => void;
}
const Ctx = createContext<Etat | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAUT);
  const [pret, setPret] = useState(false);
  const [systemeReduit, setSystemeReduit] = useState(false);
  const schema = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(CLE).then(v => { if (v) setPrefs(p => ({ ...p, ...JSON.parse(v) })); }).catch(() => {}).finally(() => setPret(true));
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemeReduit).catch(() => {});
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemeReduit);
    return () => s.remove();
  }, []);

  const regler = useCallback((p: Partial<Prefs>) => setPrefs(a => { const n = { ...a, ...p }; AsyncStorage.setItem(CLE, JSON.stringify(n)).catch(() => {}); return n; }), []);
  const vibrer = useCallback((type: 'leger' | 'succes' | 'erreur' = 'leger') => {
    if (!prefs.vibrations || Platform.OS === 'web') return;
    (type === 'leger' ? Haptics.selectionAsync() : Haptics.notificationAsync(type === 'succes' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error)).catch(() => {});
  }, [prefs.vibrations]);

  const valeur = useMemo<Etat>(() => {
    const estClair = prefs.theme === 'clair' || (prefs.theme === 'auto' && schema === 'light');
    return { prefs, pret, palette: estClair ? clair : sombre, clair: estClair, reduireAnim: systemeReduit || prefs.animations === 'aucune', regler, vibrer };
  }, [prefs, pret, schema, systemeReduit, regler, vibrer]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export const usePrefs = () => { const c = useContext(Ctx); if (!c) throw new Error('usePrefs hors de PrefsProvider'); return c; };
/** Palette courante (clair ou sombre selon le réglage et le téléphone). */
export const useTheme = () => { const { palette, clair: c } = usePrefs(); return { c: palette, clair: c }; };

/** Force le thème sombre pour un sous-arbre (console d'administration, écrans historiques à palette sombre). */
export function ThemeSombre({ children }: { children: React.ReactNode }) {
  const base = usePrefs();
  const v = useMemo(() => ({ ...base, palette: sombre, clair: false }), [base]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
