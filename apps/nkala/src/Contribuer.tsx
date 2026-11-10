/** Ompangano (contribuer) : accueil avec défi, enregistrement (écran historique de collecte), validation, classement, rangs et badges, défis, mes enregistrements. */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { chargerBadges, chargerClassement, chargerDefis, defisEnCours, progressionDefi, RANGS, type LigneClassement } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Collecte } from './Collecte';
import { Moderation } from './Admin';
import { Ezango } from './Ezango';
import { demanderFiche, emettre } from './evenements';
import { Anneau, Avatar, Bouton, Carte, Chargement, Ecran, Entete, EtatVide, Ic, Mascotte, Pastille, SectionTitre, T, Barre } from './kit';
import { usePile } from './Pile';
import { ProfilContributeur } from './Profil';
import { ThemeSombre, useTheme } from './Prefs';
import { useProgres } from './Progres';

type E = { t: 'accueil' } | { t: 'collecte' } | { t: 'valider' } | { t: 'classement' } | { t: 'rangs' } | { t: 'defis' } | { t: 'ezango' } | { t: 'mes' };
type Pile = ReturnType<typeof usePile<E>>;

/** Habille un écran historique (palette sombre) d'un bouton retour. */
const Historique = ({ titre, pile, children }: { titre: string; pile: Pile; children: React.ReactNode }) => (
  <ThemeSombre><View style={{ flex: 1, backgroundColor: '#170D08' }}><View style={{ padding: 16, paddingTop: 48 }}><Entete titre={titre} retour={pile.retour} /></View><View style={{ flex: 1 }}>{children}</View></View></ThemeSombre>
);

export function Contribuer({ retour }: { retour: () => void }) {
  const pile = usePile<E>({ t: 'accueil' });
  const { profil } = useAuth();
  if (!profil) return <Ecran><Entete titre="Contribuer" retour={retour} /><EtatVide mascotte titre="Un compte est nécessaire" texte="Crée un compte pour enregistrer ta voix et valider des phrases." /></Ecran>;
  const e = pile.ecran;
  if (e.t === 'collecte') return <Historique titre="Enregistrer ma voix" pile={pile}><View style={{ flex: 1 }}><Collecte onGuide={() => emettre('guide')} /></View></Historique>;
  if (e.t === 'valider') return <Historique titre="Valider" pile={pile}><Moderation /></Historique>;
  if (e.t === 'ezango') return <Historique titre="Ezango" pile={pile}><Ezango onContribuer={id => { demanderFiche(id); pile.remplacer({ t: 'collecte' }); }} /></Historique>;
  if (e.t === 'mes') return <Historique titre="Mes enregistrements" pile={pile}><ProfilContributeur /></Historique>;
  if (e.t === 'classement') return <Podium pile={pile} />;
  if (e.t === 'rangs') return <Rangs pile={pile} />;
  if (e.t === 'defis') return <Defis pile={pile} />;
  return <Accueil pile={pile} retour={retour} />;
}

function Accueil({ pile, retour }: { pile: Pile; retour: () => void }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const { xp, rang } = useProgres();
  const [defis, setDefis] = useState<Awaited<ReturnType<typeof chargerDefis>> | null>(null);
  useEffect(() => { chargerDefis().then(d => setDefis(defisEnCours(d))).catch(() => setDefis([])); }, []);
  const valide = profil?.role === 'validator' || profil?.role === 'admin';
  return (
    <Ecran bas={100}>
      <Entete titre="Contribuer" sous={`${rang.rang.nom} · ${profil?.contributionsCount ?? 0} contributions`} retour={retour} />
      <Carte accent={c.modules.ompangano}><View style={{ padding: 22, alignItems: 'center', gap: 14 }}>
        <Mascotte taille={90} humeur="parle" />
        <T v="sousTitre" style={{ textAlign: 'center' }}>Prête ta voix à la langue</T>
        <T v="petit" style={{ textAlign: 'center' }}>Lis une phrase, enregistre-la : chaque voix compte et rapporte des XP.</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Enregistrer ma voix" onPress={() => pile.pousser({ t: 'collecte' })} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#B84A28', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)' }}><Ic nom="micro" taille={44} couleur="#FDFAF7" /></Pressable>
      </View></Carte>
      {!defis ? <Chargement lignes={1} /> : defis.slice(0, 2).map(d => { const p = progressionDefi(profil, d); return (
        <Carte key={d.id} plat onPress={() => pile.pousser({ t: 'defis' })} label={d.title}><View style={{ padding: 14, gap: 8 }}><T v="libelle">Défi de la semaine</T><T v="carte">{d.title}</T><Barre valeur={p.cible ? p.fait / p.cible : 0} /><T v="petit">{p.fait} / {p.cible}</T></View></Carte>); })}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Carte onPress={() => pile.pousser({ t: 'classement' })} style={{ flex: 1 }} label="Classement"><View style={{ padding: 14, gap: 6 }}><Ic nom="coupe" taille={24} couleur={c.accent} /><T v="carte">Classement</T></View></Carte>
        <Carte onPress={() => pile.pousser({ t: 'rangs' })} style={{ flex: 1 }} label="Rangs et badges"><View style={{ padding: 14, gap: 6 }}><Ic nom="couronne" taille={24} couleur={c.accent} /><T v="carte">Rangs et badges</T></View></Carte>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Carte onPress={() => pile.pousser({ t: 'ezango' })} style={{ flex: 1 }} label="Ezango"><View style={{ padding: 14, gap: 6 }}><Ic nom="livre" taille={24} couleur={c.accent} /><T v="carte">Ezango</T><T v="petit">Parcourir les fiches</T></View></Carte>
        <Carte onPress={() => pile.pousser({ t: 'mes' })} style={{ flex: 1 }} label="Mes enregistrements"><View style={{ padding: 14, gap: 6 }}><Ic nom="micro" taille={24} couleur={c.accent} /><T v="carte">Mes enregistrements</T></View></Carte>
      </View>
      {valide && <Bouton label="Valider des contributions" icone="bouclier" variante="fantome" onPress={() => pile.pousser({ t: 'valider' })} />}
      <T v="petit">XP total : {xp}</T>
    </Ecran>
  );
}

function Podium({ pile }: { pile: Pile }) {
  const { c } = useTheme();
  const { profil } = useAuth();
  const [l, setL] = useState<LigneClassement[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { chargerClassement().then(x => setL([...x].sort((a, b) => b.xp - a.xp))).catch(() => setErr(true)); }, []);
  const top = l?.slice(0, 3) ?? [], moi = l?.findIndex(x => x.id === profil?.id) ?? -1;
  return (
    <Ecran bas={100}>
      <Entete titre="Classement" retour={pile.retour} />
      {err ? <EtatVide icone="alerte" titre="Classement indisponible" /> : !l ? <Chargement /> : <>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingTop: 10 }}>
          {[top[1], top[0], top[2]].map((x, i) => x && <View key={x.id} style={{ alignItems: 'center', gap: 6, flex: 1 }}><Avatar nom={x.displayName} taille={i === 1 ? 64 : 50} couleur={['#C0C0C0', '#F59E0B', '#B45309'][i]} /><T v="petit" fort numberOfLines={1}>{x.displayName}</T>
            <View style={{ width: '100%', height: [70, 100, 50][i], borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: c.carte, borderWidth: 1, borderColor: c.bordAmbre, alignItems: 'center', paddingTop: 8 }}><T v="titre" couleur={c.accent}>{[2, 1, 3][i]}</T><T v="petit">{x.xp} XP</T></View></View>)}
        </View>
        {moi >= 0 && <Pastille label={`Ta place : ${moi + 1}`} couleur={c.accent} fond={c.carte} />}
        {l.slice(3, 40).map((x, i) => <Carte key={x.id} plat style={x.id === profil?.id ? { borderColor: c.accent } : undefined}><View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}><T v="carte" style={{ width: 32 }}>{i + 4}</T><Avatar nom={x.displayName} taille={34} /><View style={{ flex: 1 }}><T v="carte" numberOfLines={1}>{x.displayName}</T><T v="petit">{x.tribe}</T></View><T v="carte" couleur={c.accent}>{x.xp}</T></View></Carte>)}
      </>}
    </Ecran>
  );
}

function Rangs({ pile }: { pile: Pile }) {
  const { c } = useTheme();
  const { xp, rang } = useProgres();
  const [badges, setBadges] = useState<Awaited<ReturnType<typeof chargerBadges>> | null>(null);
  const { profil } = useAuth();
  useEffect(() => { chargerBadges().then(setBadges).catch(() => setBadges([])); }, []);
  const mes = new Set((profil?.badges ?? []).map((b: unknown) => (typeof b === 'string' ? b : (b as { id: string }).id)));
  return (
    <Ecran bas={100}>
      <Entete titre="Rangs et badges" retour={pile.retour} />
      <Carte><View style={{ padding: 18, alignItems: 'center', gap: 8 }}><Anneau valeur={rang.progression} taille={96} epaisseur={9}><T v="titre">{rang.index + 1}</T></Anneau><T v="sousTitre">{rang.rang.nom}</T><T v="petit">{xp} XP{rang.suivant ? ` · encore ${rang.suivant.minXp - xp} avant ${rang.suivant.nom}` : ''}</T></View></Carte>
      <SectionTitre titre="L'échelle des classes d'âge" />
      {RANGS.map((r, i) => <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: i <= rang.index ? 1 : 0.5 }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: i <= rang.index ? c.accent : c.squelette, alignItems: 'center', justifyContent: 'center' }}><T v="carte" couleur={i <= rang.index ? c.surAccent : c.discret}>{i + 1}</T></View><View style={{ flex: 1 }}><T v="carte">{r.nom}</T><T v="petit">{r.description}</T></View><T v="petit">{r.minXp} XP</T></View>)}
      <SectionTitre titre="Badges" />
      {!badges ? <Chargement lignes={1} /> : badges.length === 0 ? <T v="petit">Aucun badge défini pour le moment.</T> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{badges.map(b => { const a = mes.has(b.id); return <View key={b.id} accessibilityLabel={`${b.title}${a ? '' : ', à débloquer'}`} style={{ width: '31%', alignItems: 'center', gap: 6, opacity: a ? 1 : 0.4 }}><View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: a ? c.accent : c.squelette, alignItems: 'center', justifyContent: 'center' }}><Ic nom={a ? 'coupe' : 'verrou'} taille={26} couleur={a ? c.surAccent : c.discret} /></View><T v="petit" fort style={{ textAlign: 'center' }} numberOfLines={2}>{b.title}</T></View>; })}</View>}
    </Ecran>
  );
}

function Defis({ pile }: { pile: Pile }) {
  const { profil } = useAuth();
  const [d, setD] = useState<Awaited<ReturnType<typeof chargerDefis>> | null>(null);
  useEffect(() => { chargerDefis().then(x => setD(defisEnCours(x))).catch(() => setD([])); }, []);
  return (
    <Ecran bas={100}>
      <Entete titre="Défis" retour={pile.retour} />
      {!d ? <Chargement /> : d.length === 0 ? <EtatVide mascotte titre="Pas de défi cette semaine" texte="Le prochain arrive bientôt." /> : d.map(x => { const p = progressionDefi(profil, x); return (
        <Carte key={x.id}><View style={{ padding: 16, gap: 8 }}><T v="carte">{x.title}</T><T v="petit">{x.description}</T><Barre valeur={p.cible ? p.fait / p.cible : 0} /><T v="petit">{p.fait} / {p.cible} · récompense {x.xpReward} XP</T></View></Carte>); })}
    </Ecran>
  );
}
