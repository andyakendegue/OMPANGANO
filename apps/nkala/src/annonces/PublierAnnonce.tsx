/**
 * Publier une annonce d'une autre catégorie que le logement (automobile, équipement, emploi, services, animaux, divers),
 * sur le modèle du logement : étapes, brouillon sur l'appareil, médias envoyés en arrière-plan, emplacement, aperçu,
 * quota (1 gratuite par mois) puis paiement de l'annonce supplémentaire.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  categorieAnnonce, champsPour, chargerQuotaAnnonces, completudeAnnonce, publierAnnonceFiche, validerFicheAnnonce,
  type ChampAnnonce, type FicheAnnonce, type QuotaAnnonces, type ValeurChamp,
} from '@nkala/noyau';
import { useAuth } from '../AuthProvider';
import { Barre, Bouton, Carte, Champ, Ecran, Entete, EtatVide, Puce, Rangee, SectionTitre, T, useConfirmer, useToast } from '../kit';
import { useTheme } from '../Prefs';
import { EtapeMedias } from '../logement/EtapeMedias';
import { positionActuelle, type MediaLocal } from '../logement/medias';
import {
  attribuerChemins, copierDurable, effacerBrouillon, ecrireBrouillon, envoyerMedias, lireBrouillon, nouveauBrouillon, progressionDe,
  relancerAuRetourDuReseau, tousEnvoyes, utiliserBrouillon, type BrouillonLogement, type Progression,
} from '../logement/fileMediasAnnonce';
import { VueAnnonce } from './DetailAnnonce';
import { PaiementAnnonce } from './PaiementAnnonce';

const ETAPES = ['Type', 'Caractéristiques', 'Médias', 'Prix', 'Emplacement', 'Contact et aperçu'];
const entier = (t: string) => { const n = Number(t.replace(/[^\d]/g, '')); return t.trim() === '' || !Number.isFinite(n) ? undefined : n; };
type FicheBrouillon = Partial<FicheAnnonce> & { champs: Record<string, ValeurChamp> };

/** Saisie d'un champ du catalogue selon son type. */
function SaisieChamp({ ch, v, set }: { ch: ChampAnnonce; v: ValeurChamp | undefined; set: (x: ValeurChamp | undefined) => void }) {
  const titre = <T v="libelle">{ch.label}{ch.unite ? ` (${ch.unite})` : ''}{ch.obligatoire ? ' *' : ''}</T>;
  if (ch.type === 'choix') return <View style={{ gap: 6 }}>{titre}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ch.options!.map(o => <Puce key={o.id} label={o.label} actif={v === o.id} onPress={() => set(v === o.id ? undefined : o.id)} />)}</View></View>;
  if (ch.type === 'multi') { const l = Array.isArray(v) ? v : []; return <View style={{ gap: 6 }}>{titre}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ch.options!.map(o => <Puce key={o.id} label={o.label} actif={l.includes(o.id)} onPress={() => { const n = l.includes(o.id) ? l.filter(x => x !== o.id) : [...l, o.id]; set(n.length ? n : undefined); }} />)}</View></View>; }
  if (ch.type === 'bool') return <View style={{ gap: 6 }}>{titre}<Rangee><Puce label="Oui" actif={v === true} onPress={() => set(v === true ? undefined : true)} /><Puce label="Non" actif={v === false} onPress={() => set(v === false ? undefined : false)} /></Rangee></View>;
  if (ch.type === 'nombre' || ch.type === 'annee') return <View style={{ gap: 4 }}>{titre}<Champ valeur={v === undefined ? '' : String(v)} onChange={t => set(entier(t))} clavier="number-pad" placeholder={ch.type === 'annee' ? '2018' : '—'} /></View>;
  return <View style={{ gap: 4 }}>{titre}<Champ valeur={typeof v === 'string' ? v : ''} onChange={t => set(t || undefined)} auto="sentences" maxLength={200} /></View>;
}

export function PublierAnnonce({ categorie, retour }: { categorie: string; retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const toast = useToast();
  const [dialogue, confirmer] = useConfirmer();
  const cat = categorieAnnonce(categorie);
  const [b, setB] = useState<BrouillonLogement | null>(null);
  const [prog, setProg] = useState<Progression>({ total: 0, envoyes: 0, enCours: false, erreurs: 0, horsLigne: false });
  const [occupe, setOccupe] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [quota, setQuota] = useState<QuotaAnnonces | null>(null);
  const [payer, setPayer] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = profil?.id;

  useEffect(() => {
    (async () => {
      utiliserBrouillon('nkala_brouillon_annonce');
      const ancien = await lireBrouillon();
      // Un brouillon d'une autre catégorie n'est pas repris ici (il reste enregistré tant qu'on ne commence pas autre chose).
      const garde = ancien && (ancien.fiche as FicheBrouillon).categorie === categorie ? ancien : null;
      if (garde) toast('Brouillon retrouvé : vous reprenez où vous en étiez.', 'succes');
      const n = garde ?? { ...nouveauBrouillon(), fiche: { version: 1, categorie, champs: {} } as never };
      if (!garde) await ecrireBrouillon(n);
      setB(n); setProg(p => ({ ...p, ...progressionDe(n) }));
    })();
    if (uid) chargerQuotaAnnonces().then(setQuota).catch(() => {});
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

  const maj = (f: (x: BrouillonLogement) => BrouillonLogement, immediat = false) => setB(x => {
    if (!x) return x;
    const n = f(x);
    if (minuterie.current) clearTimeout(minuterie.current);
    if (immediat) ecrireBrouillon(n); else minuterie.current = setTimeout(() => ecrireBrouillon(n), 400);
    return n;
  });
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  if (!cat) return <Ecran><Entete titre="Publier" retour={retour} /><EtatVide icone="alerte" titre="Catégorie inconnue" /></Ecran>;
  if (!profil || !uid) return <Ecran><Entete titre={`Publier : ${cat.label}`} retour={retour} /><EtatVide icone="verrou" titre="Un compte est nécessaire" texte="Connectez-vous pour publier. Votre brouillon est gardé sur ce téléphone." /></Ecran>;
  if (!b) return <Ecran><Entete titre={`Publier : ${cat.label}`} retour={retour} /></Ecran>;

  const f = b.fiche as unknown as FicheBrouillon;
  const setFiche = (p: Partial<FicheBrouillon>) => maj(x => ({ ...x, fiche: { ...x.fiche, ...p } as never }));
  const setChamp = (id: string, v: ValeurChamp | undefined) => maj(x => { const ch = { ...((x.fiche as unknown as FicheBrouillon).champs ?? {}) }; if (v === undefined) delete ch[id]; else ch[id] = v; return { ...x, fiche: { ...x.fiche, champs: ch } as never }; });
  const setBase = (p: Partial<BrouillonLogement['base']>) => maj(x => ({ ...x, base: { ...x.base, ...p } }));
  const aller = (e: number) => { maj(x => ({ ...x, etape: Math.max(0, Math.min(ETAPES.length - 1, e)) }), true); setErreurs([]); };
  const prix = entier(b.base.prix) ?? 0;
  const champs = champsPour(cat, f.sousCategorie);
  const completude = completudeAnnonce({ ...f, medias: b.medias }, { titre: b.base.titre, description: b.base.description, prix, telephone: b.base.telephone });
  const gratuitRestant = quota ? Math.max(0, quota.gratuites_mois - quota.utilisees) + quota.credits : null;

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

  const ficheEnvoi = () => ({
    ...f, version: 1, categorie, brouillonId: b.brouillonId,
    whatsapp: b.base.whatsappIdentique ? b.base.telephone : f.whatsapp,
    medias: b.medias.map(({ uri: _u, uriVignette: _v, uriHd: _h, mime: _m, octetsVignette: _ov, octetsHd: _oh, envoye: _e, erreur: _r, ...m }) => m),
  });
  const envoyer = async () => {
    const fiche = ficheEnvoi();
    const v = validerFicheAnnonce(fiche, uid);
    const manque: string[] = [];
    if (b.base.titre.trim().length < 3) manque.push('Titre (étape 1).');
    if (b.base.telephone.replace(/\D/g, '').length < 6) manque.push('Téléphone (étape 6).');
    if (!v.ok) manque.push(...v.erreurs);
    if (manque.length) { setErreurs(manque); return; }
    setOccupe(true);
    try {
      if (!tousEnvoyes(await lireBrouillon()) && !(await lancerEnvoi())) { toast('Les médias ne sont pas encore tous envoyés. L\'envoi reprendra au retour du réseau ; réessayez ensuite.', 'erreur'); return; }
      await publierAnnonceFiche({ titre: b.base.titre.trim(), description: b.base.description.trim(), prix, ville: b.base.ville.trim(), telephone: b.base.telephone.trim(), categorie_id: categorie }, fiche);
      await effacerBrouillon(b);
      toast('Annonce envoyée : elle sera visible après relecture.', 'succes');
      retour();
    } catch (e) {
      const corps = (e as { corps?: { code?: string; erreurs?: string[]; quota?: QuotaAnnonces } }).corps;
      if (corps?.code === 'quota') { setQuota(corps.quota ?? quota); setPayer(true); }
      else setErreurs(corps?.erreurs ?? [(e as Error).message]);
    } finally { setOccupe(false); }
  };
  const abandonner = () => confirmer({ titre: 'Abandonner ce brouillon ?', texte: 'Les informations et médias saisis seront effacés de ce téléphone.', action: 'Abandonner', onOk: async () => { await effacerBrouillon(b); retour(); } });

  const e = b.etape;
  return (
    <Ecran bas={40}>
      <Entete titre={`Publier : ${cat.label}`} sous={`Étape ${e + 1} / ${ETAPES.length} · ${ETAPES[e]}`} retour={retour} />
      <Barre valeur={(e + 1) / ETAPES.length} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="petit">Complétude : <T v="petit" fort couleur={completude >= 70 ? c.succes : c.accent}>{completude} / 100</T></T>
        {quota && <T v="petit" couleur={gratuitRestant ? c.discret : c.accent}>{gratuitRestant ? `${gratuitRestant} annonce${gratuitRestant > 1 ? 's' : ''} disponible${gratuitRestant > 1 ? 's' : ''}` : `Annonce payante : ${quota.prix_fcfa ?? 500} F`}</T>}
      </View>

      {e === 0 && <>
        <T v="libelle">Type d'annonce</T>
        <Rangee>{cat.transactions.map(t => <Puce key={t.id} label={t.label} actif={f.transaction === t.id} onPress={() => setFiche({ transaction: t.id })} />)}</Rangee>
        <T v="libelle">Catégorie</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{cat.sousCategories.map(s => <Puce key={s.id} label={s.label} actif={f.sousCategorie === s.id} onPress={() => setFiche({ sousCategorie: s.id })} />)}</View>
        <Champ label="Titre" valeur={b.base.titre} onChange={t => setBase({ titre: t })} placeholder={categorie === 'auto' ? 'Ex. Toyota RAV4 2015 diesel' : categorie === 'emploi' ? 'Ex. Vendeuse en boutique, Akanda' : 'Titre de l\'annonce'} auto="sentences" maxLength={100} />
        <Champ label="Description" valeur={b.base.description} onChange={t => setBase({ description: t })} placeholder="Détails, état, conditions…" auto="sentences" lignes={5} maxLength={3000} />
      </>}

      {e === 1 && (!f.sousCategorie ? <T v="corps">Choisissez d'abord la catégorie à l'étape 1.</T> : <Carte plat><View style={{ padding: 14, gap: 14 }}>
        {champs.map(ch => <SaisieChamp key={ch.id} ch={ch} v={f.champs[ch.id]} set={v => setChamp(ch.id, v)} />)}
        {champs.length === 0 && <T v="petit">Pas de caractéristique particulière pour cette catégorie.</T>}
      </View></Carte>)}

      {e === 2 && <EtapeMedias medias={b.medias} ajouter={ajouterMedias} progression={prog} onRelancer={lancerEnvoi} limites={cat.medias} pieces={false}
        modifier={(id, pa) => maj(x => ({ ...x, medias: x.medias.map(m => (m.id === id ? { ...m, ...pa } : m)) }), true)}
        retirer={id => maj(x => ({ ...x, medias: x.medias.filter(m => m.id !== id) }), true)} deplacer={deplacer} />}

      {e === 3 && <>
        <View style={{ gap: 4 }}><T v="libelle">{cat.prixLabel ?? 'Prix'} (FCFA)</T><Champ valeur={b.base.prix} onChange={t => setBase({ prix: t.replace(/\D/g, '') })} clavier="number-pad" placeholder="Laisser vide si à discuter" /></View>
        <Puce label="Prix négociable" icone="pricetag" actif={!!f.negociable} onPress={() => setFiche({ negociable: !f.negociable })} />
        <T v="petit">Le prix est affiché en FCFA. Ne versez jamais d'argent avant d'avoir vu le bien ou rencontré la personne.</T>
      </>}

      {e === 4 && <>
        <Bouton label={f.position ? 'Mettre à jour : je suis sur place' : 'Je suis sur place'} icone="itineraire" variante="ambre" onPress={async () => { const pos = await positionActuelle(); if (pos) { setFiche({ position: pos }); toast('Position enregistrée.', 'succes'); } else toast('Position indisponible : autorisez la localisation ou saisissez-la.', 'erreur'); }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}><T v="libelle">Latitude</T><Champ valeur={f.position ? String(f.position.lat) : ''} onChange={t => { const n = Number(t.replace(',', '.')); setFiche({ position: Number.isFinite(n) && t.trim() ? { lat: n, lng: f.position?.lng ?? 0 } : undefined }); }} clavier="numbers-and-punctuation" placeholder="0.4162" /></View>
          <View style={{ flex: 1, gap: 4 }}><T v="libelle">Longitude</T><Champ valeur={f.position ? String(f.position.lng) : ''} onChange={t => { const n = Number(t.replace(',', '.')); setFiche({ position: Number.isFinite(n) && t.trim() ? { lat: f.position?.lat ?? 0, lng: n } : undefined }); }} clavier="numbers-and-punctuation" placeholder="9.4673" /></View>
        </View>
        <Champ label="Ville" valeur={b.base.ville} onChange={t => setBase({ ville: t })} placeholder="Libreville, Port-Gentil…" auto="words" />
        <Champ label="Quartier" valeur={f.quartier ?? ''} onChange={t => setFiche({ quartier: t })} auto="words" maxLength={120} />
        <Champ label="Repère" valeur={f.repere ?? ''} onChange={t => setFiche({ repere: t })} placeholder="Ex. en face de la station" auto="sentences" maxLength={300} />
        <Puce label="Masquer l'emplacement exact" icone="eye-off-outline" actif={!!f.masquee} onPress={() => setFiche({ masquee: !f.masquee })} />
      </>}

      {e === 5 && <>
        <Champ label="Téléphone" valeur={b.base.telephone} onChange={t => setBase({ telephone: t })} placeholder="+241 06 12 34 56" clavier="phone-pad" />
        <Puce label="WhatsApp : même numéro" icone="logo-whatsapp" actif={b.base.whatsappIdentique} onPress={() => setBase({ whatsappIdentique: !b.base.whatsappIdentique })} />
        {!b.base.whatsappIdentique && <Champ label="WhatsApp" valeur={f.whatsapp ?? ''} onChange={t => setFiche({ whatsapp: t })} clavier="phone-pad" />}
        <SectionTitre titre="Aperçu" />
        <T v="carte">{b.base.titre || 'Titre de l\'annonce'}</T>
        <VueAnnonce a={{ titre: b.base.titre, description: b.base.description, prix, ville: b.base.ville, categorie_id: categorie, fiche: { ...f, medias: b.medias, positionPublique: f.position } as never }} />
      </>}

      {erreurs.length > 0 && <Carte plat accent={c.erreur}><View style={{ padding: 14, gap: 4 }}><T v="carte" couleur={c.erreur}>À compléter</T>{erreurs.map(x => <T key={x} v="petit">• {x}</T>)}</View></Carte>}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        {e > 0 && <Bouton label="Retour" variante="fantome" icone="retour" onPress={() => aller(e - 1)} style={{ flex: 1 }} />}
        {e < ETAPES.length - 1
          ? <Bouton label="Suivant" onPress={() => aller(e + 1)} desactive={e === 0 && (!f.sousCategorie || !f.transaction || !b.base.titre.trim())} style={{ flex: 1 }} />
          : <Bouton label="Envoyer pour relecture" icone="envoyer" charge={occupe} onPress={envoyer} style={{ flex: 1 }} />}
      </View>
      {e === 0 && (!f.sousCategorie || !f.transaction || !b.base.titre.trim()) && <T v="petit">Choisissez le type, la catégorie et donnez un titre pour continuer.</T>}
      <Rangee>{ETAPES.map((l, i) => <Puce key={l} label={`${i + 1}. ${l}`} actif={i === e} onPress={() => aller(i)} />)}</Rangee>
      <Bouton label="Abandonner le brouillon" variante="fantome" petit onPress={abandonner} />
      <PaiementAnnonce quota={quota} visible={payer} onClose={() => setPayer(false)} onPaye={() => { setPayer(false); chargerQuotaAnnonces().then(setQuota).catch(() => {}); envoyer(); }} />
      {dialogue}
    </Ecran>
  );
}
