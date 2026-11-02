import { api } from './api';
import { nfc } from './encodage';
import type { Contribution, ContributionStatus, UserProfile } from './types';
import { chargerFileModeration } from './admin';

// Mêmes colonnes et mêmes valeurs que les exports du web (AdminDashboard.tsx), texte en NFC (règles d'encodage DONDO).
const cellule = (v: unknown) => `"${nfc(v === null || v === undefined ? '' : String(v)).replace(/"/g, '""')}"`;
const assembler = (entetes: string[], lignes: unknown[][]) =>
  '﻿' + [entetes.join(','), ...lignes.map(l => l.map(cellule).join(','))].join('\r\n');

export const ENTETES_REPONSES = [
  'ID_Contribution', 'Expression_Francaise', 'Texte_Original_Myene', 'Orthographe_Confirmee_Correcte', 'Variante_Orthographique_Proposee',
  'Sens_Francais_Exact', 'Type_Precision_Francaise', 'Signification_Ou_Tournure_Proposee', 'Sens_Secondaire_Ou_Litteral', 'Variante_Dialecte',
  'Statut_Validation', 'Nom_Contributeur', 'ID_Contributeur', 'Tribu_Contributeur', 'URL_Enregistrement_Audio', 'Duree_Audio_Secondes',
  'Date_Soumission', 'Nom_Validateur', 'Notes_Validation', 'Commentaire_Culturel',
];

export function csvReponses(l: Contribution[]): string {
  return assembler(ENTETES_REPONSES, l.map(c => [
    c.id, c.frenchText, c.originalMyeneText, c.isSpellingCorrect ? 'OUI' : 'NON', c.proposedSpelling || '',
    c.isFrenchMeaningExact !== false ? 'OUI' : 'NON', c.frenchMeaningType || 'exact', c.proposedFrenchMeaning || '', c.secondaryMeaning || '',
    c.dialectVariant || 'enenga', c.status, c.userDisplayName, c.userId, c.userTribe || '', c.audioUrl || '', c.audioDuration || 0,
    c.createdAt, c.validatorDisplayName || '', c.validatorNotes || '', c.comment || '',
  ]));
}

export const ENTETES_UTILISATEURS = [
  'ID_Utilisateur', 'Nom_Affichage', 'Nom_Complet', 'Email', 'Telephone', 'Role', 'Statut_Compte', 'Conditions_Et_Annexe1_Acceptees',
  'Autorisation_Donnees_IA', 'Autorisation_Voix', 'Autorisation_Image', 'Association_Partenaire', 'Date_Signature_Consentement', 'Tribu',
  'Clan_Paternel', 'Clan_Maternel', 'Village_Origine', 'XP', 'Niveau_Sagesse', 'Nombre_Contributions', 'Nombre_Enregistrements_Audio',
  'Nombre_Validations', 'Score_Suspicion', 'Date_Inscription',
];

export function csvUtilisateurs(l: UserProfile[]): string {
  return assembler(ENTETES_UTILISATEURS, l.map(u => [
    u.id, u.displayName, u.fullName, u.email || '', u.phoneNumber || u.contact || '', u.role, u.status,
    u.termsAccepted && u.dataUsageAccepted ? 'OUI' : 'EN_ATTENTE', u.dataUsageAccepted ? 'OUI' : 'NON',
    u.consentVoiceUsage !== false ? 'OUI' : 'NON', u.consentImageUsage ? 'OUI' : 'NON', u.partnerAssociation || '',
    u.termsAcceptedAt || '', u.tribe, u.paternalClan, u.maternalClan, u.villageOfOrigin, u.xp, u.level,
    u.contributionsCount || 0, u.recordingsCount || 0, u.validationsCount || 0, u.suspicionScore || 0, u.createdAt,
  ]));
}

/** Toutes les contributions d'un statut, page par page (plafond de sécurité : 50 000). */
export async function toutesLesContributions(statut: ContributionStatus | 'all', surProgression?: (n: number) => void): Promise<Contribution[]> {
  const out: Contribution[] = [];
  for (let decalage = 0; decalage < 50_000; decalage += 100) {
    const { records } = await chargerFileModeration(statut, 100, decalage);
    out.push(...records);
    surProgression?.(out.length);
    if (records.length < 100) break;
  }
  return out;
}

export const nomFichierExport = (base: string, ext: 'csv' | 'json', date = new Date()) => `nkala_${base}_${date.toISOString().slice(0, 10)}.${ext}`;

// ------------------------------------------------------------------ outils de base de données (lecture seule sauf mention)

export async function etatServeur(): Promise<{ ok: boolean; ms: number }> {
  const t = Date.now();
  try { await api('GET', '/health'); return { ok: true, ms: Date.now() - t }; }
  catch { return { ok: false, ms: Date.now() - t }; }
}

export interface GroupeDoublons { cle: string; ids: string[]; noms: string[] }

/**
 * Doublons de clans (même tribu + même nom) ou de villages (même tribu + même nom), comme le nettoyage du web.
 * Aucun effet : `aSupprimer` liste les identifiants qui seraient retirés (le plus ancien est conservé).
 */
export function doublonsParNom<T extends { id: string; name: string; tribe?: string; createdAt?: string }>(l: T[]): { groupes: GroupeDoublons[]; aSupprimer: string[] } {
  const par = new Map<string, T[]>();
  for (const x of l) {
    const cle = `${(x.tribe || '').trim().toLowerCase()}::${nfc(x.name || '').trim().toLowerCase()}`;
    par.set(cle, [...(par.get(cle) || []), x]);
  }
  const groupes: GroupeDoublons[] = [];
  const aSupprimer: string[] = [];
  for (const [cle, membres] of par) {
    if (membres.length < 2) continue;
    const tries = [...membres].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));
    groupes.push({ cle, ids: tries.map(m => m.id), noms: tries.map(m => m.name) });
    aSupprimer.push(...tries.slice(1).map(m => m.id));
  }
  return { groupes, aSupprimer };
}
