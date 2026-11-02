import { api } from './api';
import type { Contribution, QuestionnaireItem, UserProfile } from './types';

export function extensionPourMime(mime?: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'm4a';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('wav')) return 'wav';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

/** Le serveur n'accepte que recordings/{uid}/… (audio, 15 Mo maximum). */
export function cheminEnregistrement(uid: string, itemId: string, mime: string): string {
  const sur = (itemId || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `recordings/${uid}/${sur}_${Date.now()}.${extensionPourMime(mime)}`;
}

export const consentementDonne = (p?: UserProfile | null) => !!p?.termsAccepted && !!p?.dataUsageAccepted;

/** Enregistre le consentement aux conditions et à l'usage des données (exigé par le serveur avant toute contribution). */
export const accepterConsentement = () =>
  api<UserProfile>('PATCH', '/v1/me', { termsAccepted: true, dataUsageAccepted: true, termsAcceptedAt: new Date().toISOString() });

export interface SaisieContribution {
  orthographeCorrecte: boolean;
  orthographeProposee?: string;
  sensFrancaisExact?: boolean;
  /** exact | correction_sens | autre_tournure | sens_secondaire (étape 2 du site web) */
  typeSens?: 'exact' | 'correction_sens' | 'autre_tournure' | 'sens_secondaire';
  sensFrancaisPropose?: string;
  sensSecondaire?: string;
  /** Variante tribale choisie à l'étape 1 (code : orungu, mpongwe, galwa…). */
  varianteDialecte?: string;
  commentaire?: string;
  dureeAudio?: number;
  mimeAudio?: string;
}

/** Contribution prête à l'envoi (mêmes champs que le web). `id` stable : un rejeu ne crée pas de doublon. */
export function construireContribution(profil: UserProfile, fiche: QuestionnaireItem, saisie: SaisieContribution, id?: string): Contribution {
  const now = new Date().toISOString();
  const exact = saisie.sensFrancaisExact !== false;
  return {
    id: id || `contrib-${profil.id.slice(0, 8)}-${Date.now()}`,
    itemId: fiche.id,
    userId: profil.id,
    userDisplayName: profil.fullName || profil.displayName || 'Contributeur Myènè',
    userTribe: profil.tribe,
    userPaternalClan: profil.paternalClan,
    userMaternalClan: profil.maternalClan,
    userPhotoURL: profil.photoURL,
    frenchText: fiche.frenchText,
    originalMyeneText: fiche.myeneText,
    isSpellingCorrect: saisie.orthographeCorrecte,
    proposedSpelling: saisie.orthographeCorrecte ? fiche.myeneText : (saisie.orthographeProposee || fiche.myeneText),
    isFrenchMeaningExact: exact,
    frenchMeaningType: exact ? 'exact' : (saisie.typeSens && saisie.typeSens !== 'exact' ? saisie.typeSens : 'correction_sens'),
    proposedFrenchMeaning: !exact ? (saisie.sensFrancaisPropose?.trim() || undefined) : undefined,
    secondaryMeaning: !exact ? (saisie.sensSecondaire?.trim() || undefined) : undefined,
    dialectVariant: saisie.varianteDialecte || String(fiche.dialect),
    comment: saisie.commentaire,
    audioDuration: saisie.dureeAudio || 0,
    audioMimeType: saisie.mimeAudio,
    status: 'pending',
    offlineQueued: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Envoi vers le stockage par URL présignée. `corps` est un Blob (web/mobile). */
export async function televerserMedia(chemin: string, corps: Blob, contentType: string): Promise<boolean> {
  try {
    const { uploadUrl, headers } = await api<{ uploadUrl: string; headers: Record<string, string> }>('POST', '/v1/media/upload-url', {
      path: chemin, contentType, size: corps.size,
    });
    const res = await fetch(uploadUrl, { method: 'PUT', headers, body: corps });
    return res.ok;
  } catch {
    return false;
  }
}

export const envoyerContribution = (c: Contribution & { audioStoragePath?: string }) =>
  api<Contribution>('POST', '/v1/contributions', c);
