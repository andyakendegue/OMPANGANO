import { api } from './api';
import { avecCache } from './cache';
import { tribuDuDialecte } from './tribus';
import type { QuestionnaireItem, TribeName } from './types';

/** Annotation validée d'une fiche (route /v1/items/annotations) : variante tribale, orthographe, nuances de sens français. */
export interface Annotation { itemId: string; variant: string | null; spelling: string | null; frenchMeaning: string | null; secondaryMeaning: string | null }

export const chargerAnnotations = () => avecCache('annotations', () => api<Annotation[]>('GET', '/v1/items/annotations'));

const cle = (t: string) => t.normalize('NFC').toLowerCase().trim();

export interface IndexAnnotations {
  parFiche: Map<string, Annotation[]>;
  /** Fiches ajoutées à une tribu par une contribution validée, hors tribu de leur dialecte (clé = tribu normalisée). */
  fichesSupplementaires: Map<string, Set<string>>;
}

export function indexerAnnotations(l: Annotation[], dialecteDe: (itemId: string) => string | undefined): IndexAnnotations {
  const parFiche = new Map<string, Annotation[]>();
  for (const a of l) parFiche.set(a.itemId, [...(parFiche.get(a.itemId) || []), a]);
  const fichesSupplementaires = new Map<string, Set<string>>();
  for (const [id, liste] of parFiche) {
    const principale = tribuDuDialecte(dialecteDe(id));
    for (const a of liste) {
      if (!a.variant) continue;
      const t = tribuDuDialecte(a.variant);
      if (cle(t) === cle(principale)) continue;
      fichesSupplementaires.set(cle(t), (fichesSupplementaires.get(cle(t)) || new Set()).add(id));
    }
  }
  return { parFiche, fichesSupplementaires };
}

/** Tribus d'une fiche (celle de son dialecte + celles des variantes validées) et orthographes par tribu (comme tribesOfItem du site web). */
export function tribusDeLaFiche(f: QuestionnaireItem, annotations: Annotation[] = []): { tribus: TribeName[]; variantes: Map<string, string> } {
  const tribus = new Map<string, TribeName>();
  const variantes = new Map<string, string>();
  const ajouter = (brut?: string | null) => { if (!brut) return; const t = tribuDuDialecte(brut); tribus.set(cle(t), t); };
  ajouter(String(f.dialect || 'orungu'));
  for (const a of annotations) {
    if (!a.variant) continue;
    const t = tribuDuDialecte(a.variant);
    ajouter(t);
    if (a.spelling?.trim()) variantes.set(cle(t), a.spelling.trim());
  }
  return { tribus: [...tribus.values()], variantes };
}
