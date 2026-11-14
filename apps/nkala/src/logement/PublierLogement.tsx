/**
 * Publier (ou modifier) une annonce de logement : formulaire en 7 étapes, brouillon enregistré sur l'appareil à chaque changement,
 * médias envoyés en arrière-plan dès qu'ils sont ajoutés (reprise au retour du réseau), aperçu identique à la page détail.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  calculerCertification, calculerCompletude, CATALOGUE_LOGEMENT, CHARGES_COMPRISES, modifierLogement, PERIODES, publierLogement, TRANSACTIONS,
  validerFicheLogement, type FicheLogement, type PiecesLogement, type ConditionsLogement, type Transaction,
} from '@nkala/noyau';
import { useAuth } from '../AuthProvider';
import { Barre, Bouton, Carte, Champ, Ecran, Entete, EtatVide, Ic, Puce, Rangee, SectionTitre, T, useConfirmer, useToast } from '../kit';
import { useTheme } from '../Prefs';
import { SaisieEquipements } from './Equipements';
import { EtapeMedias } from './EtapeMedias';
import { VueLogement } from './DetailLogement';
import { positionActuelle, type MediaLocal } from './medias';
import {
  attribuerChemins, copierDurable, effacerBrouillon, ecrireBrouillon, envoyerMedias, lireBrouillon, nouveauBrouillon, progressionDe,
  relancerAuRetourDuReseau, tousEnvoyes, type BrouillonLogement, type Progression,
} from './fileMediasAnnonce';

const ETAPES = ['Le bien', 'Pièces', 'Équipements', 'Conditions', 'Médias', 'Emplacement', 'Contact et aperçu'];
const entier = (t: string) => { const n = Number(t.replace(/[^\d]/g, '')); return t.trim() === '' || !Number.isFinite(n) ? undefined : n; };

function Compteur({ label, valeur, onChange, max = 20 }: { label: string; valeur?: number; onChange: (n: number | undefined) => void; max?: number }) {
  const { c } = useTheme();
  const v = valeur ?? 0;
  const b = (t: string, d: number) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${d > 0 ? 'Plus' : 'Moins'} : ${label}`} onPress={() => { const n = Math.min(max, Math.max(0, v + d)); onChange(n || undefined); }} hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.bord, backgroundColor: c.carte, alignItems: 'center', justifyContent: 'center' }}><T v="carte">{t}</T></Pressable>
  );
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}><T v="corps" style={{ flex: 1 }}>{label}</T>{b('−', -1)}<T v="carte" style={{ minWidth: 26, textAlign: 'center' }}>{v}</T>{b('+', 1)}</View>;
}
const ChampNombre = ({ label, valeur, onChange, unite }: { label: string; valeur?: number; onChange: (n: number | undefined) => void; unite?: string }) => (
  <View style={{ gap: 4 }}><T v="libelle">{label}{unite ? ` (${unite})` : ''}</T><Champ valeur={valeur === undefined ? '' : String(valeur)} onChange={t => onChange(entier(t))} clavier="number-pad" placeholder="—" /></View>
);

/** Fiche à envoyer au serveur, construite depuis le brouillon (sans les fichiers locaux). */
function ficheDe(b: BrouillonLogement): Record<string, unknown> {
  return {
    ...b.fiche, version: 1, brouillonId: b.brouillonId,
    whatsapp: b.base.whatsappIdentique ? b.base.telephone : b.fiche.whatsapp,
    medias: b.medias.map(({ uri: _u, uriVignette: _v, uriHd: _h, mime: _m, octetsVignette: _ov, octetsHd: _oh, envoye: _e, erreur: _r, ...m }) => m),
  };
}

export function PublierLogement({ retour, quota, ceMois, aModifier }: { retour: () => void; quota: number; ceMois: number; aModifier?: BrouillonLogement }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [dialogue, confirmer] = useConfirmer();
  const [b, setB] = useState<BrouillonLogement | null>(null);
  const [prog, setProg] = useState<Progression>({ total: 0, envoyes: 0, enCours: false, erreurs: 0, horsLigne: false });
  const [occupe, setOccupe] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = profil?.id;

  // Brouillon : repris tel quel s'il existe (coupure, fermeture, connexion), sinon nouveau
  useEffect(() => {
    (async () => {
      const ancien = aModifier ?? (await lireBrouillon());
      if (ancien && !aModifier) toast('Brouillon retrouvé : vous reprenez où vous en étiez.', 'succes');
      const n = ancien ?? nouveauBrouillon();
      if (aModifier) await ecrireBrouillon(n);
      setB(n); setProg(p => ({ ...p, ...progressionDe(n) }));
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lancerEnvoi = useCallback(async () => {
    setProg(p => ({ ...p, enCours: true, horsLigne: false }));
    const fini = await envoyerMedias(nb => { setB(x => (x ? { ...x, medias: x.medias.map(m => ({ ...m, envoye: nb.medias.find(y => y.id === m.id)?.envoye ?? m.envoye, erreur: nb.medias.find(y => y.id === m.id)?.erreur })) } : x)); setProg(p => ({ ...p, ...progressionDe(nb) })); });
    const nb = await lireBrouillon();
    setProg(p => ({ ...p, ...progressionDe(nb), enCours: false, horsLigne: !fini && !tousEnvoyes(nb) }));
    return fini;
  }, []);
  useEffect(() => relancerAuRetourDuReseau(() => { lancerEnvoi(); }), [lancerEnvoi]);
  useEffect(() => { if (b && uid && !tousEnvoyes(b)) lancerEnvoi(); }, [!!b, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Modifie l'état et enregistre le brouillon (400 ms après la dernière frappe). */
  const maj = (f: (x: BrouillonLogement) => BrouillonLogement, immediat = false) => setB(x => {
    if (!x) return x;
    const n = f(x);
    if (minuterie.current) clearTimeout(minuterie.current);
    if (immediat) ecrireBrouillon(n); else minuterie.current = setTimeout(() => ecrireBrouillon(n), 400);
    return n;
  });
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);
  const setFiche = (p: Partial<BrouillonLogement['fiche']>) => maj(x => ({ ...x, fiche: { ...x.fiche, ...p } }));
  const setBase = (p: Partial<BrouillonLogement['base']>) => maj(x => ({ ...x, base: { ...x.base, ...p } }));
  const setPieces = (p: Partial<PiecesLogement>) => maj(x => ({ ...x, fiche: { ...x.fiche, pieces: { ...x.fiche.pieces, ...p } } }));
  const setCond = (p: Partial<ConditionsLogement>) => maj(x => ({ ...x, fiche: { ...x.fiche, conditions: { ...x.fiche.conditions, ...p } } }));
  const aller = (e: number) => { maj(x => ({ ...x, etape: Math.max(0, Math.min(ETAPES.length - 1, e)) }), true); setErreurs([]); };

  if (!profil || !uid) return <Ecran><Entete titre="Publier un logement" retour={retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connectez-vous pour publier. Votre brouillon est gardé sur ce téléphone." /></Ecran>;
  if (!b) return <Ecran><Entete titre="Publier un logement" retour={retour} /></Ecran>;

  const f = b.fiche, p = f.pieces ?? {}, co = f.conditions ?? {};
  const prix = entier(b.base.prix) ?? 0;
  const baseCalc = { titre: b.base.titre, description: b.base.description, prix, telephone: b.base.telephone };
  const completude = calculerCompletude({ ...f, medias: b.medias } as Partial<FicheLogement>, baseCalc);
  const quotaAtteint = !b.annonceId && ceMois >= quota;

  const ajouterMedias = async (nouveaux: MediaLocal[]) => {
    const prets: MediaLocal[] = [];
    for (const m of nouveaux) prets.push(attribuerChemins(await copierDurable(m, b.brouillonId), uid, b.brouillonId));
    maj(x => ({ ...x, medias: [...x.medias, ...prets.map((m, i) => ({ ...m, ordre: x.medias.length + i }))] }), true);
    setTimeout(lancerEnvoi, 50);
  };
  const deplacer = (id: string, sens: -1 | 1) => maj(x => {
    const tri = [...x.medias].sort((a, z) => a.ordre - z.ordre);
    const m = tri.find(y => y.id === id); if (!m) return x;
    const memes = tri.filter(y => y.type === m.type); const k = memes.indexOf(m); const autre = memes[k + sens]; if (!autre) return x;
    return { ...x, medias: x.medias.map(y => (y.id === m.id ? { ...y, ordre: autre.ordre } : y.id === autre.id ? { ...y, ordre: m.ordre } : y)) };
  }, true);

  const envoyer = async () => {
    const fiche = ficheDe(b);
    const v = validerFicheLogement(fiche, uid);
    const manque: string[] = [];
    if (!b.base.titre.trim()) manque.push('Titre (étape 1).');
    if (!prix) manque.push('Prix ou loyer (étape 4).');
    if (b.base.telephone.replace(/\D/g, '').length < 6) manque.push('Téléphone (étape 7).');
    if (!v.ok) manque.push(...v.erreurs);
    if (manque.length) { setErreurs(manque); return; }
    setOccupe(true);
    try {
      if (!tousEnvoyes(await lireBrouillon()) && !(await lancerEnvoi())) { toast('Les médias ne sont pas encore tous envoyés. L\'envoi reprendra au retour du réseau ; réessayez ensuite.', 'erreur'); return; }
      const base = { titre: b.base.titre.trim(), description: b.base.description.trim(), prix, ville: b.base.ville.trim(), telephone: b.base.telephone.trim() };
      if (b.annonceId) await modifierLogement(b.annonceId, base, fiche); else await publierLogement(base, fiche);
      await effacerBrouillon(b);
      toast(b.annonceId ? 'Modification envoyée : l\'annonce sera de nouveau visible après relecture.' : 'Annonce envoyée : elle sera visible après relecture.', 'succes');
      retour();
    } catch (e) {
      const corps = (e as { corps?: { erreurs?: string[] } }).corps;
      setErreurs(corps?.erreurs ?? [(e as Error).message]);
    } finally { setOccupe(false); }
  };

  const abandonner = () => confirmer({ titre: 'Abandonner ce brouillon ?', texte: 'Les informations et médias saisis seront effacés de ce téléphone.', action: 'Abandonner', onOk: async () => { await effacerBrouillon(b); retour(); } });

  const e = b.etape;
  return (
    <Ecran bas={40}>
      <Entete titre={b.annonceId ? 'Modifier le logement' : 'Publier un logement'} sous={`Étape ${e + 1} / ${ETAPES.length} · ${ETAPES[e]}`} retour={retour} />
      <Barre valeur={(e + 1) / ETAPES.length} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="petit">Complétude : <T v="petit" fort couleur={completude >= 70 ? c.succes : c.accent}>{completude} / 100</T></T>
        {!b.annonceId && <T v="petit" couleur={quotaAtteint ? c.erreur : c.discret}>Quota : {ceMois} / {quota} ce mois-ci</T>}
      </View>

      {e === 0 && <>
        <T v="libelle">Transaction</T>
        <Rangee>{TRANSACTIONS.map(t => <Puce key={t.id} label={t.label} actif={f.transaction === t.id} onPress={() => setFiche({ transaction: t.id as Transaction, periode: t.periode })} />)}</Rangee>
        <T v="libelle">Type de bien</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATALOGUE_LOGEMENT.typesDeBien.map(t => <Puce key={t.id} label={t.label} icone={t.icon} actif={f.typeBien === t.id} onPress={() => setFiche({ typeBien: t.id })} />)}</View>
        <Champ label="Titre" valeur={b.base.titre} onChange={t => setBase({ titre: t })} placeholder="Ex. Chambre-salon propre à Batterie IV" auto="sentences" maxLength={100} />
        <Champ label="Description" valeur={b.base.description} onChange={t => setBase({ description: t })} placeholder="État, environnement, ce qui est compris…" auto="sentences" lignes={5} maxLength={3000} />
        {quotaAtteint && <T v="petit" couleur={c.erreur}>Vous avez atteint le quota gratuit de {quota} annonces ce mois-ci : vous pourrez envoyer celle-ci le mois prochain.</T>}
      </>}

      {e === 1 && <>
        <Carte plat><View style={{ padding: 14, gap: 4 }}>
          <Compteur label="Chambres" valeur={p.chambres} onChange={n => setPieces({ chambres: n })} />
          <Compteur label="Salons" valeur={p.salons} onChange={n => setPieces({ salons: n })} />
          <Compteur label="Salles de bain" valeur={p.sallesDeBain} onChange={n => setPieces({ sallesDeBain: n })} />
          <Compteur label="WC intérieurs" valeur={p.wcInterieurs} onChange={n => setPieces({ wcInterieurs: n })} />
          <Compteur label="WC extérieurs" valeur={p.wcExterieurs} onChange={n => setPieces({ wcExterieurs: n })} />
        </View></Carte>
        <T v="libelle">Cuisine</T>
        <Rangee>{([['interieure', 'Intérieure'], ['exterieure', 'Extérieure'], ['americaine', 'Américaine'], ['aucune', 'Aucune']] as const).map(([id, l]) => <Puce key={id} label={l} actif={p.cuisine === id} onPress={() => setPieces({ cuisine: p.cuisine === id ? undefined : id })} />)}</Rangee>
        <T v="libelle">Meublé</T>
        <Rangee>{([['non', 'Non'], ['partiel', 'Partiellement'], ['oui', 'Oui']] as const).map(([id, l]) => <Puce key={id} label={l} actif={p.meuble === id} onPress={() => setPieces({ meuble: p.meuble === id ? undefined : id })} />)}</Rangee>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><ChampNombre label="Surface habitable" unite="m²" valeur={p.surfaceHabitable} onChange={n => setPieces({ surfaceHabitable: n })} /></View>
          <View style={{ flex: 1 }}><ChampNombre label="Terrain" unite="m²" valeur={p.surfaceTerrain} onChange={n => setPieces({ surfaceTerrain: n })} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><ChampNombre label="Étage (0 = rez-de-chaussée)" valeur={p.etage} onChange={n => setPieces({ etage: n })} /></View>
          <View style={{ flex: 1 }}><ChampNombre label="Nombre de niveaux" valeur={p.niveaux} onChange={n => setPieces({ niveaux: n })} /></View>
        </View>
      </>}

      {e === 2 && <>
        <T v="petit">Cochez ce qui existe vraiment : les personnes filtrent sur ces critères (groupe électrogène, forage, gardien…).</T>
        <SaisieEquipements valeurs={f.equipements ?? {}} onChange={v => setFiche({ equipements: v })} />
      </>}

      {e === 3 && <>
        <View style={{ gap: 4 }}><T v="libelle">{f.transaction === 'vente' ? 'Prix de vente (FCFA)' : 'Loyer (FCFA)'}</T>
          <Champ valeur={b.base.prix} onChange={t => setBase({ prix: t.replace(/\D/g, '') })} clavier="number-pad" placeholder="Ex. 150000" /></View>
        <Rangee>{PERIODES.map(x => <Puce key={x.id} label={x.label} actif={f.periode === x.id} onPress={() => setFiche({ periode: x.id })} />)}</Rangee>
        <Puce label="Prix négociable" icone="pricetag" actif={!!f.negociable} onPress={() => setFiche({ negociable: !f.negociable })} />
        {f.transaction !== 'vente' && <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><ChampNombre label="Caution" unite="mois" valeur={co.cautionMois} onChange={n => setCond({ cautionMois: n })} /></View>
          <View style={{ flex: 1 }}><ChampNombre label="Avance" unite="mois" valeur={co.avanceMois} onChange={n => setCond({ avanceMois: n })} /></View>
        </View>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><ChampNombre label="Frais d'agence" unite="FCFA" valeur={co.fraisAgence} onChange={n => setCond({ fraisAgence: n })} /></View>
          <View style={{ flex: 1 }}><ChampNombre label="Frais de visite" unite="FCFA" valeur={co.fraisVisite} onChange={n => setCond({ fraisVisite: n })} /></View>
        </View>
        {f.transaction !== 'vente' && <>
          <ChampNombre label="Charges mensuelles" unite="FCFA" valeur={co.charges} onChange={n => setCond({ charges: n })} />
          <T v="libelle">Charges comprises</T>
          <Rangee>{CHARGES_COMPRISES.map(k => <Puce key={k.id} label={k.label} actif={!!co.chargesComprises?.includes(k.id)} onPress={() => setCond({ chargesComprises: co.chargesComprises?.includes(k.id) ? co.chargesComprises.filter(x => x !== k.id) : [...(co.chargesComprises ?? []), k.id] })} />)}</Rangee>
          <ChampNombre label="Durée minimale" unite="mois" valeur={co.dureeMinMois} onChange={n => setCond({ dureeMinMois: n })} />
          <T v="libelle">Animaux acceptés</T>
          <Rangee><Puce label="Oui" actif={co.animaux === true} onPress={() => setCond({ animaux: co.animaux === true ? undefined : true })} /><Puce label="Non" actif={co.animaux === false} onPress={() => setCond({ animaux: co.animaux === false ? undefined : false })} /></Rangee>
        </>}
        <View style={{ gap: 4 }}><T v="libelle">Disponible à partir du (AAAA-MM-JJ)</T><Champ valeur={co.disponibleLe ?? ''} onChange={t => setCond({ disponibleLe: t.replace(/[^\d-]/g, '').slice(0, 10) || undefined })} placeholder="2026-12-01" clavier="numbers-and-punctuation" /></View>
      </>}

      {e === 4 && <EtapeMedias medias={b.medias} ajouter={ajouterMedias} progression={prog} onRelancer={lancerEnvoi}
        modifier={(id, pa) => maj(x => ({ ...x, medias: x.medias.map(m => (m.id === id ? { ...m, ...pa } : m)) }), true)}
        retirer={id => maj(x => ({ ...x, medias: x.medias.filter(m => m.id !== id) }), true)}
        deplacer={deplacer} />}

      {e === 5 && <>
        <Bouton label={f.position ? 'Mettre à jour : je suis sur place' : 'Je suis sur place'} icone="itineraire" variante="ambre" onPress={async () => { const pos = await positionActuelle(); if (pos) { setFiche({ position: pos }); toast('Position enregistrée.', 'succes'); } else toast('Position indisponible : autorisez la localisation ou saisissez-la.', 'erreur'); }} />
        <T v="petit">Faites-le devant le logement : c'est aussi ce qui permet le badge « Visite certifiée ». Sinon, saisissez la latitude et la longitude (Google Maps : appui long sur le lieu).</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}><T v="libelle">Latitude</T><Champ valeur={f.position ? String(f.position.lat) : ''} onChange={t => { const n = Number(t.replace(',', '.')); setFiche({ position: Number.isFinite(n) && t.trim() ? { lat: n, lng: f.position?.lng ?? 0 } : undefined }); }} clavier="numbers-and-punctuation" placeholder="0.4162" /></View>
          <View style={{ flex: 1, gap: 4 }}><T v="libelle">Longitude</T><Champ valeur={f.position ? String(f.position.lng) : ''} onChange={t => { const n = Number(t.replace(',', '.')); setFiche({ position: Number.isFinite(n) && t.trim() ? { lat: f.position?.lat ?? 0, lng: n } : undefined }); }} clavier="numbers-and-punctuation" placeholder="9.4673" /></View>
        </View>
        <Champ label="Ville" valeur={b.base.ville} onChange={t => setBase({ ville: t })} placeholder="Libreville, Port-Gentil…" auto="words" />
        <Champ label="Quartier" valeur={f.quartier ?? ''} onChange={t => setFiche({ quartier: t })} placeholder="Ex. Batterie IV" auto="words" maxLength={120} />
        <Champ label="Repère" valeur={f.repere ?? ''} onChange={t => setFiche({ repere: t })} placeholder="Ex. derrière la pharmacie X, portail bleu" auto="sentences" maxLength={300} />
        <Puce label="Masquer l'emplacement exact" icone="eye-off-outline" actif={!!f.masquee} onPress={() => setFiche({ masquee: !f.masquee })} />
        <T v="petit">{f.masquee ? 'Le public verra une zone approximative (à 300 m près). La position exacte reste visible des modérateurs seulement.' : 'La position exacte sera visible du public.'}</T>
      </>}

      {e === 6 && <>
        <Champ label="Téléphone" valeur={b.base.telephone} onChange={t => setBase({ telephone: t })} placeholder="+241 06 12 34 56" clavier="phone-pad" />
        <Puce label="WhatsApp : même numéro" icone="logo-whatsapp" actif={b.base.whatsappIdentique} onPress={() => setBase({ whatsappIdentique: !b.base.whatsappIdentique })} />
        {!b.base.whatsappIdentique && <Champ label="WhatsApp" valeur={f.whatsapp ?? ''} onChange={t => setFiche({ whatsapp: t })} placeholder="+241 07 …" clavier="phone-pad" />}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: f.consentementOccupants === true }} onPress={() => setFiche({ consentementOccupants: f.consentementOccupants === true ? undefined : true } as never)}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: f.consentementOccupants ? c.succes : c.bord, backgroundColor: c.carte }}>
          <Ic nom={f.consentementOccupants ? 'checkbox' : 'square-outline'} taille={24} couleur={f.consentementOccupants ? c.succes : c.discret} />
          <T v="corps" style={{ flex: 1 }}>Les occupants actuels ont accepté que ces photos et vidéos soient publiées ; on n'y reconnaît personne sans son accord (loi n°025/2023 sur la protection des données personnelles).</T>
        </Pressable>
        <SectionTitre titre="Aperçu" />
        <T v="carte">{b.base.titre || 'Titre de l\'annonce'}</T>
        <VueLogement a={{ titre: b.base.titre, description: b.base.description, prix, ville: b.base.ville, telephone: b.base.telephone,
          logement: { ...(f as Partial<FicheLogement>), medias: b.medias, positionPublique: f.position, completude, certifiee: f.position ? calculerCertification({ position: f.position, medias: b.medias }) : false } }} />
      </>}

      {erreurs.length > 0 && <Carte plat accent={c.erreur}><View style={{ padding: 14, gap: 4 }}><T v="carte" couleur={c.erreur}>À compléter</T>{erreurs.map(x => <T key={x} v="petit">• {x}</T>)}</View></Carte>}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {e > 0 && <Bouton label="Retour" variante="fantome" icone="retour" onPress={() => aller(e - 1)} style={{ flex: 1 }} />}
        {e < ETAPES.length - 1
          ? <Bouton label="Suivant" onPress={() => aller(e + 1)} desactive={e === 0 && (!f.typeBien || !b.base.titre.trim())} style={{ flex: 1 }} />
          : <Bouton label="Envoyer pour relecture" icone="envoyer" charge={occupe} desactive={quotaAtteint || f.consentementOccupants !== true} onPress={envoyer} style={{ flex: 1 }} />}
      </View>
      {e === 0 && (!f.typeBien || !b.base.titre.trim()) && <T v="petit">Choisissez le type de bien et donnez un titre pour continuer.</T>}
      <Rangee>{ETAPES.map((l, i) => <Puce key={l} label={`${i + 1}. ${l}`} actif={i === e} onPress={() => aller(i)} />)}</Rangee>
      <Bouton label="Abandonner le brouillon" variante="fantome" petit onPress={abandonner} />
      {dialogue}
    </Ecran>
  );
}
