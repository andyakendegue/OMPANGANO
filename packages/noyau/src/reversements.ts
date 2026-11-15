/**
 * Moteur de calcul trimestriel des reversements (décision de Capp du 15 nov. 2026 ; audit Apprendre §18). Fonctions pures :
 * le serveur rassemble les données du trimestre, appelle `calculerReversements`, enregistre et scelle les relevés.
 * AUCUN TAUX DANS CE FICHIER : taux, coefficients et pondérations arrivent dans `ParametresReversements` (table versionnée,
 * réglée dans la console). Les conditions financières des contrats sont confidentielles et restent hors du dépôt.
 *
 * Ordre du calcul : 1 revenus nets par paiement ; 2 masterclass ; 3 part vidéo des abonnements ; 4 fonds des créateurs ;
 * 5-7 contributeur spécial (publicité pondérée par zone, abonnements, toute l'application après le procès-verbal) ;
 * 8 associations (enveloppe sur les revenus nets de l'IA, au poids d'utilisation des unités de contribution) ;
 * 9 opérations exceptionnelles ; 10 arrondis, seuils, reports, retenue.
 */

export interface ParametresReversements {
  contributeur: {
    taux_pub: number; taux_abonnements: number; taux_application: number; taux_exceptionnel: number;
    /** Part de l'apport par défaut d'une opération exceptionnelle qui mêle l'apport à d'autres sources (0 à 1). */
    part_apport_defaut: number;
    /** Modules dont l'ouverture rend une formule « concernée » (ex. onenji, kakigonjo). */
    modules: string[];
  };
  /** Zone de publicité → coefficient d'apport du contributeur spécial (0 à 1) ; une zone absente vaut 0. */
  coefficients_zones: Record<string, number>;
  /** Formule (plan) → modules qu'elle ouvre (ex. ['onenji', 'igolani', 'kakigonjo']). */
  formules_modules: Record<string, string[]>;
  /** Modules vidéo (part vidéo des abonnements). */
  modules_video: string[];
  createurs: { taux_fonds: number; max_passages_par_chapitre: number };
  professeurs: { taux: number };
  associations: {
    taux_enveloppe: number; plafond_frais: number; part_membres: number; part_association: number;
    /** Formule → part des revenus attribuée à l'IA (clé de l'annexe 3) ; les produits « jetons IA » comptent en entier. */
    cle_ia_formules: Record<string, number>;
    /** Pondération des unités de contribution par type (minute de voix, phrase, image, validation…). */
    ponderations_uc: Record<string, number>;
  };
}

export type CategoriePaiement = 'abonnement' | 'masterclass' | 'ia' | 'nkorouna' | 'annonce' | 'autre';
export interface PaiementTrimestre {
  id: string; categorie: CategoriePaiement; plan_id?: string | null; hote_id?: string | null; annule?: boolean;
  encaisse: number; frais?: number; commission?: number; taxe?: number; rembourse?: number;
}
export interface BeneficiaireCalcul {
  id: string; type: 'contributeur_special' | 'createur' | 'professeur' | 'association'; user_id?: string | null;
  date_pv?: string | null; seuil_fcfa?: number; retenue_pct?: number; report_entrant?: number;
}
export interface EntreesTrimestre {
  trimestre: string;                                   // 2026-T4
  paiements: PaiementTrimestre[];
  /** Temps des abonnés de chaque formule, par module (secondes). */
  temps: { plan_id: string; module: string; secondes: number }[];
  /** Minutes regardées par des abonnés, déjà plafonnées à N passages par abonné et par vidéo, rattachées au créateur. */
  minutes: { createur_id: string; secondes: number }[];
  /** Recettes publicitaires nettes du trimestre par zone. */
  pub: { zone: string; montant: number }[];
  /** Sommes reversées à d'autres tiers (commerçants, chauffeurs…) au titre de l'application. */
  autres_tiers?: number;
  ia: { frais_infra: number; usage: { modele: string; quantite: number }[]; uc: { modele: string; user_id: string; uc: number }[] };
  membres: { association_id: string; user_id: string }[];
  operations: { id: string; montant: number; couts: number; part_apport?: number | null }[];
  beneficiaires: BeneficiaireCalcul[];
}
export interface PartReleve { code: string; libelle: string; assiette: number; taux: number; montant: number; note?: string }
export interface ReleveCalcul {
  beneficiaire_id: string; parts: PartReleve[]; brut: number; report_entrant: number; retenue: number; a_payer: number; report_sortant: number;
}
export interface ResultatReversements { releves: ReleveCalcul[]; totaux: Record<string, number> }

const ent = (n: number) => Math.round(Number.isFinite(n) ? n : 0);
/** 1. Revenus nets d'un paiement : encaissé − frais − commission − taxe − remboursé (jamais négatif). */
export function revenusNets(p: Pick<PaiementTrimestre, 'encaisse' | 'frais' | 'commission' | 'taxe' | 'rembourse'>): number {
  return Math.max(0, (Number(p.encaisse) || 0) - (Number(p.frais) || 0) - (Number(p.commission) || 0) - (Number(p.taxe) || 0) - (Number(p.rembourse) || 0));
}

/** Premier jour du trimestre « AAAA-Tn » (UTC). */
export function debutTrimestre(t: string): Date {
  const m = /^(\d{4})-T([1-4])$/.exec(t); if (!m) throw new Error(`Trimestre invalide : ${t}`);
  return new Date(Date.UTC(Number(m[1]), (Number(m[2]) - 1) * 3, 1));
}
export function finTrimestre(t: string): Date { const d = debutTrimestre(t); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1)); }
export function trimestreDe(d: Date): string { return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`; }
/** 7. La part « toute l'application » commence au trimestre qui suit celui du procès-verbal de validation complète. */
export function partApplicationOuverte(trimestre: string, datePv?: string | null): boolean {
  if (!datePv) return false;
  const pv = new Date(`${datePv.slice(0, 10)}T00:00:00Z`);
  return debutTrimestre(trimestre).getTime() >= finTrimestre(trimestreDe(pv)).getTime();
}

/** 3. Part vidéo de chaque formule : revenus nets × (temps sur les modules vidéo ÷ temps total des abonnés de la formule). */
export function partsVideo(e: Pick<EntreesTrimestre, 'paiements' | 'temps'>, p: Pick<ParametresReversements, 'modules_video'>): Record<string, number> {
  const net: Record<string, number> = {};
  for (const x of e.paiements) if (x.categorie === 'abonnement' && x.plan_id) net[x.plan_id] = (net[x.plan_id] ?? 0) + revenusNets(x);
  const r: Record<string, number> = {};
  for (const plan of Object.keys(net)) {
    const t = e.temps.filter(x => x.plan_id === plan);
    const total = t.reduce((s, x) => s + x.secondes, 0);
    const video = t.filter(x => p.modules_video.includes(x.module)).reduce((s, x) => s + x.secondes, 0);
    r[plan] = total > 0 ? net[plan] * (video / total) : 0;
  }
  return r;
}

/** 8. Poids de chaque contributeur dans l'utilisation des modèles : Σ (utilisation du modèle × part de ses UC dans le modèle) ÷ utilisation totale. */
export function poidsContributeurs(ia: EntreesTrimestre['ia']): Record<string, number> {
  const totalUsage = ia.usage.reduce((s, x) => s + x.quantite, 0);
  if (!(totalUsage > 0)) return {};
  const ucParModele: Record<string, number> = {};
  for (const x of ia.uc) ucParModele[x.modele] = (ucParModele[x.modele] ?? 0) + x.uc;
  const poids: Record<string, number> = {};
  for (const u of ia.usage) {
    const tot = ucParModele[u.modele] ?? 0; if (!(tot > 0)) continue;
    for (const x of ia.uc.filter(y => y.modele === u.modele)) poids[x.user_id] = (poids[x.user_id] ?? 0) + u.quantite * (x.uc / tot);
  }
  for (const k of Object.keys(poids)) poids[k] /= totalUsage;
  return poids;
}

/** 10. Seuil, report et retenue : sous le seuil, tout est reporté, sauf au quatrième trimestre (solde versé au moins une fois par an). */
export function appliquerSeuil(brut: number, b: Pick<BeneficiaireCalcul, 'seuil_fcfa' | 'retenue_pct' | 'report_entrant'>, trimestre: string) {
  const report_entrant = ent(Number(b.report_entrant) || 0);
  const total = ent(brut) + report_entrant;
  const finAnnee = /-T4$/.test(trimestre);
  if (total <= 0 || (total < (Number(b.seuil_fcfa) || 0) && !finAnnee)) return { report_entrant, retenue: 0, a_payer: 0, report_sortant: Math.max(0, total) };
  const retenue = ent(total * (Number(b.retenue_pct) || 0) / 100);
  return { report_entrant, retenue, a_payer: total - retenue, report_sortant: 0 };
}

export function calculerReversements(e: EntreesTrimestre, p: ParametresReversements): ResultatReversements {
  const parts = new Map<string, PartReleve[]>();
  const ajoute = (ben: string, part: PartReleve) => { if (!parts.has(ben)) parts.set(ben, []); parts.get(ben)!.push({ ...part, montant: ent(part.montant) }); };
  const benParUser = (type: BeneficiaireCalcul['type'], uid?: string | null) => e.beneficiaires.find(b => b.type === type && b.user_id && b.user_id === uid);

  // 1. revenus nets
  const nets = e.paiements.map(x => ({ ...x, net: revenusNets(x) }));
  const netTotal = nets.reduce((s, x) => s + x.net, 0);

  // 2. masterclass : part du professeur sur chaque masterclass donnée (une masterclass annulée est remboursée : rien à reverser)
  let totalProfesseurs = 0;
  for (const x of nets.filter(y => y.categorie === 'masterclass' && !y.annule && y.net > 0)) {
    const b = benParUser('professeur', x.hote_id); if (!b) continue;
    const m = ent(p.professeurs.taux * x.net); totalProfesseurs += m;
    ajoute(b.id, { code: 'masterclass', libelle: `Masterclass (paiement ${x.id})`, assiette: x.net, taux: p.professeurs.taux, montant: m });
  }

  // 3-4. part vidéo des abonnements et fonds des créateurs, au prorata des minutes regardées
  const pv = partsVideo(e, p);
  const sommePartsVideo = Object.values(pv).reduce((s, x) => s + x, 0);
  const fonds = p.createurs.taux_fonds * sommePartsVideo;
  const totalMinutes = e.minutes.reduce((s, x) => s + x.secondes, 0);
  let totalCreateurs = 0;
  if (totalMinutes > 0) for (const m of e.minutes) {
    if (!e.beneficiaires.some(b => b.id === m.createur_id && b.type === 'createur')) continue;
    const montant = ent(fonds * (m.secondes / totalMinutes)); totalCreateurs += montant;
    ajoute(m.createur_id, { code: 'fonds_createurs', libelle: 'Fonds des créateurs (minutes regardées)', assiette: ent(fonds), taux: m.secondes / totalMinutes, montant, note: `${Math.round(m.secondes / 60)} min sur ${Math.round(totalMinutes / 60)}` });
  }

  // 5-7, 9. contributeur spécial
  const formulesConcernees = Object.entries(p.formules_modules).filter(([, mods]) => mods.some(m => p.contributeur.modules.includes(m))).map(([k]) => k);
  for (const b of e.beneficiaires.filter(x => x.type === 'contributeur_special')) {
    // 5. publicité : Σ zones (recettes × coefficient d'apport de la zone)
    const assiettePub = e.pub.reduce((s, z) => s + z.montant * (p.coefficients_zones[z.zone] ?? 0), 0);
    ajoute(b.id, { code: 'publicite', libelle: 'Publicité (recettes pondérées par zone)', assiette: ent(assiettePub), taux: p.contributeur.taux_pub, montant: p.contributeur.taux_pub * assiettePub });
    // 6. abonnements des formules concernées, après les sommes reversées aux créateurs au titre de ces formules
    const netConcerne = nets.filter(x => x.categorie === 'abonnement' && x.plan_id && formulesConcernees.includes(x.plan_id)).reduce((s, x) => s + x.net, 0);
    const createursConcernes = formulesConcernees.reduce((s, k) => s + p.createurs.taux_fonds * (pv[k] ?? 0), 0);
    const assietteAbo = Math.max(0, netConcerne - createursConcernes);
    ajoute(b.id, { code: 'abonnements', libelle: 'Abonnements des formules concernées', assiette: ent(assietteAbo), taux: p.contributeur.taux_abonnements, montant: p.contributeur.taux_abonnements * assietteAbo });
    // 7. toute l'application, après les reversements aux tiers ; zéro avant le trimestre qui suit le procès-verbal
    const assietteApp = Math.max(0, netTotal - totalCreateurs - totalProfesseurs - (Number(e.autres_tiers) || 0));
    const ouverte = partApplicationOuverte(e.trimestre, b.date_pv);
    ajoute(b.id, { code: 'application', libelle: 'Toute l\'application', assiette: ent(assietteApp), taux: ouverte ? p.contributeur.taux_application : 0, montant: ouverte ? p.contributeur.taux_application * assietteApp : 0, ...(ouverte ? {} : { note: 'Procès-verbal de validation complète non encore applicable à ce trimestre.' }) });
    // 9. opérations exceptionnelles
    for (const o of e.operations) {
      const part = o.part_apport ?? p.contributeur.part_apport_defaut;
      const assiette = Math.max(0, o.montant - o.couts);
      ajoute(b.id, { code: 'exceptionnel', libelle: `Opération exceptionnelle ${o.id}`, assiette, taux: p.contributeur.taux_exceptionnel * part, montant: p.contributeur.taux_exceptionnel * assiette * part, note: `part de l'apport ${Math.round(part * 100)} %` });
    }
  }

  // 8. associations : enveloppe sur les revenus nets de l'IA, au poids d'utilisation des UC de leurs membres
  const revenusIa = nets.reduce((s, x) => s + (x.categorie === 'ia' ? x.net : x.categorie === 'abonnement' && x.plan_id ? x.net * (p.associations.cle_ia_formules[x.plan_id] ?? 0) : 0), 0);
  const fraisRetenus = Math.min(Math.max(0, e.ia.frais_infra), p.associations.plafond_frais * revenusIa);
  const netIa = Math.max(0, revenusIa - fraisRetenus);
  const enveloppe = p.associations.taux_enveloppe * netIa;
  const poids = poidsContributeurs(e.ia);
  for (const b of e.beneficiaires.filter(x => x.type === 'association')) {
    const membres = e.membres.filter(m => m.association_id === b.id).map(m => m.user_id);
    const w = membres.reduce((s, u) => s + (poids[u] ?? 0), 0);
    const montant = enveloppe * w;
    ajoute(b.id, { code: 'enveloppe_ia', libelle: 'Enveloppe IA (poids d\'utilisation des contributions des membres)', assiette: ent(enveloppe), taux: w, montant,
      note: `dont ${ent(montant * p.associations.part_membres)} F aux membres et ${ent(montant * p.associations.part_association)} F à l'association` });
  }

  // 10. relevés : arrondis, seuils, reports, retenue
  const releves: ReleveCalcul[] = [];
  for (const b of e.beneficiaires) {
    const ps = parts.get(b.id) ?? [];
    const brut = ps.reduce((s, x) => s + x.montant, 0);
    if (!ps.length && !(Number(b.report_entrant) > 0)) continue;
    releves.push({ beneficiaire_id: b.id, parts: ps, brut, ...appliquerSeuil(brut, b, e.trimestre) });
  }
  return {
    releves,
    totaux: {
      revenus_nets: ent(netTotal), professeurs: totalProfesseurs, parts_video: ent(sommePartsVideo), fonds_createurs: ent(fonds), createurs: totalCreateurs,
      revenus_ia: ent(revenusIa), enveloppe_ia: ent(enveloppe), a_payer: releves.reduce((s, r) => s + r.a_payer, 0),
    },
  };
}

/** Paramètres vides (tous les taux à zéro) : point de départ de la console ; rien n'est versé tant qu'un administrateur ne les règle pas. */
export const PARAMETRES_REVERSEMENTS_VIDES: ParametresReversements = {
  contributeur: { taux_pub: 0, taux_abonnements: 0, taux_application: 0, taux_exceptionnel: 0, part_apport_defaut: 0, modules: ['onenji', 'kakigonjo'] },
  coefficients_zones: {}, formules_modules: {}, modules_video: ['igolani'],
  createurs: { taux_fonds: 0, max_passages_par_chapitre: 3 },
  professeurs: { taux: 0 },
  associations: { taux_enveloppe: 0, plafond_frais: 0, part_membres: 0, part_association: 0, cle_ia_formules: {}, ponderations_uc: {} },
};

/** Nettoie des paramètres envoyés par la console (nombres entre 0 et 1 pour les taux et coefficients) ; null si invalide. */
export function validerParametresReversements(v: unknown): ParametresReversements | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as any, taux = (x: unknown) => { const n = Number(x); return Number.isFinite(n) && n >= 0 && n <= 1 ? n : NaN; };
  const dico = (x: unknown, f: (y: unknown) => number) => Object.fromEntries(Object.entries((x && typeof x === 'object') ? x as object : {}).map(([k, y]) => [k, f(y)]).filter(([, y]) => !Number.isNaN(y as number)));
  const liste = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string' && /^[a-z0-9_-]{1,40}$/i.test(y)) : []);
  const c = o.contributeur ?? {}, cr = o.createurs ?? {}, pr = o.professeurs ?? {}, as = o.associations ?? {};
  const r: ParametresReversements = {
    contributeur: { taux_pub: taux(c.taux_pub), taux_abonnements: taux(c.taux_abonnements), taux_application: taux(c.taux_application), taux_exceptionnel: taux(c.taux_exceptionnel), part_apport_defaut: taux(c.part_apport_defaut), modules: liste(c.modules) },
    coefficients_zones: dico(o.coefficients_zones, taux),
    formules_modules: Object.fromEntries(Object.entries(o.formules_modules && typeof o.formules_modules === 'object' ? o.formules_modules : {}).map(([k, y]) => [k, liste(y)])),
    modules_video: liste(o.modules_video).length ? liste(o.modules_video) : ['igolani'],
    createurs: { taux_fonds: taux(cr.taux_fonds), max_passages_par_chapitre: Math.max(1, Math.min(20, Math.floor(Number(cr.max_passages_par_chapitre) || 3))) },
    professeurs: { taux: taux(pr.taux) },
    associations: { taux_enveloppe: taux(as.taux_enveloppe), plafond_frais: taux(as.plafond_frais), part_membres: taux(as.part_membres), part_association: taux(as.part_association), cle_ia_formules: dico(as.cle_ia_formules, taux), ponderations_uc: dico(as.ponderations_uc, x => { const n = Number(x); return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : NaN; }) },
  };
  const nombres = [r.contributeur.taux_pub, r.contributeur.taux_abonnements, r.contributeur.taux_application, r.contributeur.taux_exceptionnel, r.contributeur.part_apport_defaut, r.createurs.taux_fonds, r.professeurs.taux, r.associations.taux_enveloppe, r.associations.plafond_frais, r.associations.part_membres, r.associations.part_association];
  return nombres.some(n => Number.isNaN(n)) ? null : r;
}
