import { api } from './api';
import { enregistrerElement, nouvelId } from './contenu';
import type { ClanRegistry, TribeName, UserProfile, VillageRegistry } from './types';

/** Réponse valide quand on ignore un clan, une tribu de parent ou un village (ex. un seul parent myènè). Identique au site web. */
export const JE_NE_SAIS_PAS = 'Je ne sais pas';

/** Mêmes noms de tribus que le web (clans.tribe et profil.tribe). */
export const TRIBUS: TribeName[] = ['Ôrungu', 'Mpongwè', 'Galoa', 'Nkomi', 'Enenga', 'Adyumba'];

/** Version des conditions acceptées (identique à TermsConsentModal.tsx). */
export const VERSION_CONDITIONS = '2.1-contributeur-badges-xp-2026';

export interface FormInscription {
  nomComplet: string;
  contact: string;
  dateNaissance: string; // AAAA-MM-JJ
  lieuNaissance: string;
  tribu: TribeName;
  clanPaternel: string;
  clanMaternel: string;
  village: string;
  conditions: boolean;
  donnees: boolean;
  voix: boolean;
  image: boolean;
  tuteur?: string;
}

/** Premier message d'erreur (null = valide). Mêmes règles que OnboardingModal.tsx. */
export function validerInscription(f: FormInscription): string | null {
  if (!f.nomComplet.trim()) return 'Le nom complet est obligatoire pour accéder à Nkala.';
  if (!f.contact.trim()) return 'Un contact (téléphone, WhatsApp ou email) est obligatoire.';
  if (f.dateNaissance && (!/^\d{4}-\d{2}-\d{2}$/.test(f.dateNaissance) || Number.isNaN(Date.parse(f.dateNaissance)))) return 'Date de naissance au format AAAA-MM-JJ.';
  if (!f.lieuNaissance.trim()) return 'Le lieu de naissance est obligatoire.';
  if (!f.clanPaternel.trim()) return 'Veuillez sélectionner ou ajouter votre clan paternel.';
  if (!f.clanMaternel.trim()) return 'Veuillez sélectionner ou ajouter votre clan maternel.';
  if (!f.village.trim()) return 'Veuillez sélectionner ou saisir votre village d’origine.';
  if (!f.conditions || !f.donnees) return "Vous devez accepter les Conditions Générales de la plateforme et valider l'autorisation d'utilisation de vos données pour poursuivre.";
  return null;
}

/** Corps du PATCH /v1/me. Les champs protégés (rôle, XP, badges…) sont ignorés par le serveur et donc absents. */
export function profilDepuisInscription(f: FormInscription, maintenant = new Date()): Partial<UserProfile> {
  const nom = f.nomComplet.trim();
  return {
    fullName: nom,
    displayName: nom,
    contact: f.contact.trim(),
    birthDate: f.dateNaissance,
    birthPlace: f.lieuNaissance.trim(),
    tribe: f.tribu,
    paternalClan: f.clanPaternel.trim(),
    maternalClan: f.clanMaternel.trim(),
    villageOfOrigin: f.village.trim(),
    registrationCompleted: true,
    termsAccepted: true,
    dataUsageAccepted: true,
    consentVoiceUsage: f.voix,
    consentImageUsage: f.image,
    partnerAssociation: 'Contributeur Individuel',
    electronicSignature: `Lu et approuvé - ${nom}`,
    legalGuardianName: f.tuteur?.trim() || undefined,
    termsAcceptedAt: maintenant.toISOString(),
    termsVersion: VERSION_CONDITIONS,
  };
}

export const enregistrerInscription = (f: FormInscription) => api<UserProfile>('PATCH', '/v1/me', profilDepuisInscription(f));

/** Un contributeur peut AJOUTER son clan ou son village (jamais modifier : règle du serveur). */
export async function ajouterClan(nom: string, tribu: TribeName): Promise<ClanRegistry> {
  const clan: ClanRegistry = { id: nouvelId('clan'), name: nom.trim(), tribe: tribu, createdAt: new Date().toISOString() };
  await enregistrerElement('clans', clan.id, clan);
  return clan;
}

export async function ajouterVillage(nom: string, clan: string, tribu: string): Promise<VillageRegistry> {
  const village: VillageRegistry = { id: nouvelId('village'), name: nom.trim(), clan, tribe: tribu, createdAt: new Date().toISOString() };
  await enregistrerElement('villages', village.id, village);
  return village;
}
