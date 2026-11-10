/**
 * Niveaux d'accès aux contenus (NKALA_AUDIT_COMPLET.md §10bis.2). Fonction pure partagée : le serveur la rappelle
 * pour décider (API, passerelle publicitaire, licences de lecture) ; l'interface s'en sert seulement pour
 * afficher un cadenas. Le serveur reste seul juge.
 */
export type NiveauAcces = 'libre' | 'gratuit_avec_pub' | 'abonnement' | 'achat' | 'essai' | 'location' | 'reserve';

export interface Contenu {
  id: string;
  acces: NiveauAcces;
  /** Rôles autorisés quand acces = 'reserve'. */
  roles?: string[];
}

export interface DroitsUtilisateur {
  role?: string;
  /** Abonnement en cours (période de grâce comprise) : date de fin en ms, ou null. */
  abonneJusque?: number | null;
  /** Identifiants des contenus achetés définitivement. */
  achats?: readonly string[];
  /** Essais en cours : contenu → date de fin (ms). */
  essais?: Record<string, number>;
  /** Locations en cours : contenu → date de fin (ms). */
  locations?: Record<string, number>;
}

export type MotifRefus = 'abonnement_requis' | 'achat_requis' | 'role_requis' | 'expire';
export type Decision = { ok: true; avecPub: boolean } | { ok: false; motif: MotifRefus };

export const abonne = (d: DroitsUtilisateur | null | undefined, maintenant = Date.now()): boolean =>
  !!d?.abonneJusque && d.abonneJusque > maintenant;

/** L'abonné ne voit plus de publicité (modèle économique) ; seul le niveau « gratuit avec pub » en affiche. */
export function peutAcceder(c: Contenu, d: DroitsUtilisateur | null | undefined, maintenant = Date.now()): Decision {
  switch (c.acces) {
    case 'libre': return { ok: true, avecPub: false };
    case 'gratuit_avec_pub': return { ok: true, avecPub: !abonne(d, maintenant) };
    case 'abonnement': return abonne(d, maintenant) ? { ok: true, avecPub: false } : { ok: false, motif: 'abonnement_requis' };
    case 'achat': return d?.achats?.includes(c.id) ? { ok: true, avecPub: false } : { ok: false, motif: 'achat_requis' };
    case 'essai': {
      const fin = d?.essais?.[c.id];
      if (abonne(d, maintenant) || (fin && fin > maintenant)) return { ok: true, avecPub: false };
      return { ok: false, motif: fin ? 'expire' : 'abonnement_requis' };
    }
    case 'location': {
      const fin = d?.locations?.[c.id];
      if (fin && fin > maintenant) return { ok: true, avecPub: false };
      return { ok: false, motif: fin ? 'expire' : 'achat_requis' };
    }
    case 'reserve': return d?.role && c.roles?.includes(d.role) ? { ok: true, avecPub: false } : { ok: false, motif: 'role_requis' };
  }
}
