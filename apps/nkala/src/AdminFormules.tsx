/**
 * Console : formules d'abonnement (décision de Capp du 15 nov. 2026 : Oma, Inina, Anyambiè). Chaque option se règle ici :
 * accès à l'IA (aucune, limitée avec N questions par semaine, complète), vidéos d'Igolani, parties sans publicité, avantages
 * (traducteur, synthèse audio, musique hors ligne, replay, photos 360°), « tout » (Premium), prix mensuel, ordre, publication.
 * La description de la boutique se déduit de ces réglages.
 */
import { useCallback, useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { AVANTAGES, adminLignes, adminModifierLigne, api, avantagesFormule, type ModeIa, type ReglagesFormule } from '@nkala/noyau';
import { Bouton, Carte, Champ, Puce, SectionTitre, T, useToast } from './kit';
import { useTheme } from './Prefs';

const MODULES_PUB = ['tout', 'commun', 'onenji', 'azeva', 'ontci', 'nkala'];
type Formule = ReglagesFormule & { publie?: boolean; rang_min?: number };
type ProduitLigne = { id: string; titre: string; type: string; prix_fcfa?: number; periode?: string; plan_id?: string; publie?: boolean };

export function FormulesAdmin() {
  const toast = useToast();
  const [plans, setPlans] = useState<Formule[]>([]);
  const [produits, setProduits] = useState<ProduitLigne[]>([]);
  const charger = useCallback(async () => {
    try {
      setPlans(((await adminLignes('plans')).items as Formule[]).sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99)));
      setProduits((await adminLignes('produits')).items as ProduitLigne[]);
    } catch (e) { toast((e as Error).message, 'erreur'); }
  }, [toast]);
  useEffect(() => { charger(); }, [charger]);
  const initialiser = async () => {
    try { const r = await api<{ crees: string[] }>('POST', '/v1/admin/formules/initialiser'); toast(r.crees.length ? `Créé : ${r.crees.join(', ')}` : 'Les trois formules existent déjà.', 'succes'); charger(); }
    catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 14 }}>
      <T v="petit">Chaque formule se règle ici ; la boutique décrit ce qu'elle donne d'après ces réglages. Les cours, la bibliothèque et les jeux restent gratuits pour tous. Une formule « tout » (Premium) donne toutes les options.</T>
      <Bouton label="Créer Oma, Inina et Anyambiè s'il en manque" variante="fantome" onPress={initialiser} />
      {plans.map(p => <CarteFormule key={p.id} plan={p} produit={produits.find(x => x.type === 'abonnement' && x.plan_id === p.id && x.periode !== 'an') ?? null} onEnregistre={charger} />)}
    </View>
  );
}

function CarteFormule({ plan, produit, onEnregistre }: { plan: Formule; produit: ProduitLigne | null; onEnregistre: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [f, setF] = useState<Formule>(plan);
  const [prix, setPrix] = useState(String(produit?.prix_fcfa ?? ''));
  useEffect(() => { setF(plan); setPrix(String(produit?.prix_fcfa ?? '')); }, [plan, produit]);
  const sansPub = Array.isArray(f.sans_pub) ? f.sans_pub : [];
  const basculePub = (m: string) => setF({ ...f, sans_pub: m === 'tout' ? (sansPub.includes('tout') ? [] : ['tout']) : sansPub.includes(m) ? sansPub.filter(x => x !== m) : [...sansPub.filter(x => x !== 'tout'), m] });
  const av = f.avantages ?? [];
  const enregistrer = async () => {
    try {
      const { id, ...reste } = f;
      await adminModifierLigne('plans', id, { ...reste, sans_pub: sansPub.join('|'), avantages: av.join('|'), ia_questions_semaine: f.ia === 'limitee' ? Number(f.ia_questions_semaine) || 0 : '', publie: f.publie !== false ? 'oui' : 'non', tout: f.tout ? 'oui' : 'non', igolani: f.igolani ? 'oui' : 'non' });
      const pid = produit?.id ?? `abo-${id}-mois`;
      await adminModifierLigne('produits', pid, { titre: f.titre, type: 'abonnement', prix_fcfa: Number(prix) || 0, periode: 'mois', plan_id: id, publie: f.publie !== false ? 'oui' : 'non' });
      toast(`Formule ${f.titre} enregistrée.`, 'succes'); onEnregistre();
    } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <Carte plat><View style={{ padding: 14, gap: 10 }}>
      <SectionTitre titre={`${f.titre} (${f.id})`} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 2 }}><Champ valeur={f.titre} onChange={t => setF({ ...f, titre: t })} label="Nom" /></View>
        <View style={{ flex: 1 }}><Champ valeur={prix} onChange={t => setPrix(t.replace(/\D/g, ''))} clavier="number-pad" label="Prix par mois (F)" /></View>
        <View style={{ flex: 1 }}><Champ valeur={String(f.ordre ?? '')} onChange={t => setF({ ...f, ordre: Number(t.replace(/\D/g, '')) || 0 })} clavier="number-pad" label="Ordre" /></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch value={!!f.tout} onValueChange={v => setF({ ...f, tout: v })} /><T v="corps">Tout (Premium : toutes les options)</T></View>
      <T v="petit" fort>Kak'Igonjo (IA)</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(['aucune', 'limitee', 'complete'] as ModeIa[]).map(m => <Puce key={m} label={m === 'aucune' ? 'Aucune' : m === 'limitee' ? 'Limitée' : 'Complète'} actif={(f.ia ?? 'aucune') === m} onPress={() => setF({ ...f, ia: m })} />)}
      </View>
      {f.ia === 'limitee' && <Champ valeur={String(f.ia_questions_semaine ?? '')} onChange={t => setF({ ...f, ia_questions_semaine: Number(t.replace(/\D/g, '')) || 0 })} clavier="number-pad" label="Questions par semaine" />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch value={!!f.igolani} onValueChange={v => setF({ ...f, igolani: v })} /><T v="corps">Cours vidéo d'Igolani (streaming)</T></View>
      <T v="petit" fort>Sans publicité</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{MODULES_PUB.map(m => <Puce key={m} label={m === 'tout' ? 'Partout' : m} actif={sansPub.includes(m)} onPress={() => basculePub(m)} />)}</View>
      <T v="petit" fort>Avantages</T>
      {AVANTAGES.map(a => (
        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Switch value={!!f.tout || av.includes(a.id)} disabled={!!f.tout} onValueChange={v => setF({ ...f, avantages: v ? [...av, a.id] : av.filter(x => x !== a.id) })} />
          <T v="corps">{a.libelle}</T>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Switch value={f.publie !== false} onValueChange={v => setF({ ...f, publie: v })} /><T v="corps">Publiée (visible dans la boutique)</T></View>
      <T v="petit" couleur={c.discret}>Dans la boutique : {avantagesFormule(f).join(' · ') || '—'}</T>
      <Bouton label="Enregistrer cette formule" variante="ambre" onPress={enregistrer} />
    </View></Carte>
  );
}
