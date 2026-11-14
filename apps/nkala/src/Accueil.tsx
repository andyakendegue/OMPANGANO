/** Accueil, série, profil, réglages, espace parents, recherche globale (écrans 11 à 20, 60, 15). */
import { CarteNkorounaProfil } from './Nkorouna';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { chargerDefiDuJour, choixDuJour, envoyerCodeLien, verifierCodeLien, normaliserTelephone, jourLocal, moduleActif, RANGS, rangPourXp, type Ligne } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { catalogue } from './catalogue';
import { emettre } from './evenements';
import { useGlobale } from './Globale';
import { useConfirmer, Anneau, Avatar, Bouton, BoutonIcone, BoutonRecherche, Carte, Champ, Ecran, Entete, EtatVide, Flamme, Ic, Mascotte, Pastille, Puce, Rangee, SectionTitre, T, Barre, useToast, BandeauHorsLigne } from './kit';
import { Son } from './OnenjiLecon';
import { usePrefs, useTheme, type NiveauAnim } from './Prefs';
import { useProgres } from './Progres';
import { EmplacementPub } from './Pub';
import { useContenus } from './useContenu';

const prenom = (n?: string) => (n ?? '').trim().split(/\s+/)[0] || '';

export function AccueilEcran() {
  const { c } = useTheme();
  const { profil, invite } = useAuth();
  const { prefs } = usePrefs();
  const routeur = useRouter();
  const { donnees, xp, rang } = useProgres();
  const { res } = useContenus(['mots_jeux', 'actualites', 'albums', 'messages']);
  const [defi, setDefi] = useState<{ titre: string } | null>(null);
  useEffect(() => { chargerDefiDuJour().then(r => setDefi(r.defi)).catch(() => {}); }, []);
  const aujourdhui = donnees.jours?.includes(jourLocal());
  const mot = useMemo(() => choixDuJour((res.mots_jeux ?? []) as Ligne[]), [res.mots_jeux]);
  const enfant = prefs.mode === 'enfant';
  const nom = prenom(profil?.displayName || profil?.fullName);
  const retour = donnees.serie > 1 && !aujourdhui;
  return (
    <Ecran bas={100}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <T v="titre">{retour ? 'Bon retour' : 'Mbolo'}{nom ? `, ${nom}` : ''} !</T>
          <T v="petit">{rang.rang.nom} · {xp} XP</T>
        </View>
        <BoutonRecherche />
      </View>
      <BandeauHorsLigne />
      {invite && !profil && <Carte accent={c.accent}><View style={{ padding: 16, gap: 8 }}><T v="carte">Tu essaies sans compte</T><T v="petit">Ta progression reste sur ce téléphone. Crée un compte pour la garder, contribuer et apparaître dans les classements.</T><Bouton label="Créer un compte" petit large={false} onPress={() => routeur.push('/connexion' as never)} /></View></Carte>}
      <Carte onPress={() => routeur.push('/serie' as never)} label="Ma série"><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
        <Flamme taille={40} eteinte={!donnees.serie} />
        <View style={{ flex: 1 }}><T v="sousTitre">{donnees.serie ?? 0} jour{(donnees.serie ?? 0) > 1 ? 's' : ''} de suite</T><T v="petit">{aujourdhui ? 'Objectif du jour atteint, bravo !' : 'Une leçon ou une partie suffit pour continuer.'}</T></View>
        <Anneau valeur={aujourdhui ? 1 : 0} taille={52} epaisseur={6}><Ic nom={aujourdhui ? 'ok' : 'etoile'} taille={20} couleur={aujourdhui ? c.succes : c.discret} /></Anneau>
      </View></Carte>
      {moduleActif('onenji') && <Carte accent={c.modules.onenji} onPress={() => routeur.push('/apprendre' as never)} label="Commencer ou reprendre une leçon"><View style={{ padding: 18, gap: 8 }}><T v="libelle">{Object.keys(donnees.leconsTerminees ?? {}).length ? 'Reprendre là où tu en étais' : 'Ta première leçon'}</T><T v="sousTitre">{Object.keys(donnees.leconsTerminees ?? {}).length ? 'Continue ton parcours' : 'Commencer ma première leçon'}</T><Bouton label="C'est parti" variante="ambre" petit large={false} icone="lecture" onPress={() => routeur.push('/apprendre' as never)} /></View></Carte>}
      {moduleActif('azeva') && defi && <Carte accent={c.modules.azeva} onPress={() => routeur.push('/azeva' as never)} label="Défi du jour"><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}><Ic nom="jouer" taille={30} couleur={c.modules.azeva} /><View style={{ flex: 1 }}><T v="libelle">Défi du jour</T><T v="carte">{defi.titre}</T></View><Ic nom="suivant" taille={18} couleur={c.discret} /></View></Carte>}
      {mot && !enfant && <Carte><View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ flex: 1 }}><T v="libelle">Mot du jour</T><T v="titre" style={{ fontStyle: 'italic' }}>{mot.myene}</T><T v="corps">{mot.francais}</T></View><Son audio={mot.audio} /></View></Carte>}
      {!enfant && <EmplacementPub zone="bandeau_accueil" />}
      {!enfant && (res.actualites ?? []).length > 0 && <><SectionTitre titre="Dans le village" action="Tout voir" onAction={() => routeur.push('/village' as never)} />{(res.actualites ?? []).slice(0, 2).map(a => <Carte key={a.id} plat onPress={() => routeur.push('/village' as never)} label={a.titre}><View style={{ padding: 14 }}><T v="carte">{a.titre}</T><T v="petit">{a.resume}</T></View></Carte>)}</>}
      {enfant && <View style={{ flexDirection: 'row', gap: 14 }}>
        {[['apprendre', 'Apprendre', '/apprendre'], ['jouer', 'Jouer', '/azeva']].map(([i, l, r]) => <Pressable key={l} accessibilityRole="button" accessibilityLabel={l} onPress={() => routeur.push(r as never)} style={{ flex: 1, height: 150, borderRadius: 28, backgroundColor: c.carte, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'center', gap: 10 }}><Ic nom={i} taille={56} couleur={c.accent} /><T v="sousTitre">{l}</T></Pressable>)}
      </View>}
    </Ecran>
  );
}

// ------------------------------------------------------------------ ma série (16)
export function SerieEcran() {
  const { c } = useTheme();
  const routeur = useRouter();
  const { donnees } = useProgres();
  const n = new Date(), annee = n.getFullYear(), mois = n.getMonth();
  const jours = new Date(annee, mois + 1, 0).getDate(), decal = (new Date(annee, mois, 1).getDay() + 6) % 7;
  const actifs = new Set(donnees.jours ?? []);
  return (
    <Ecran bas={100}>
      <Entete titre="Ma série" retour={() => routeur.back()} />
      <Carte style={{ padding: 22, alignItems: 'center', gap: 6 }}><Flamme taille={56} eteinte={!donnees.serie} /><T v="titre">{donnees.serie ?? 0} jour{(donnees.serie ?? 0) > 1 ? 's' : ''}</T><T v="petit">Record : {donnees.recordSerie ?? 0} jours</T></Carte>
      <T v="sousTitre">{n.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }}><T v="petit">{j}</T></View>)}
        {Array.from({ length: decal }, (_, i) => <View key={'v' + i} style={{ width: `${100 / 7}%`, height: 44 }} />)}
        {Array.from({ length: jours }, (_, i) => { const d = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, on = actifs.has(d); return (
          <View key={d} accessibilityLabel={`${i + 1}${on ? ', actif' : ''}`} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.accent : 'transparent', borderWidth: d === jourLocal() ? 2 : 0, borderColor: c.accent }}><T v="petit" couleur={on ? c.surAccent : c.fort}>{i + 1}</T></View></View>); })}
      </View>
      <Carte plat><View style={{ padding: 14 }}><T v="petit">Un jour de repos est protégé : manquer un jour isolé ne casse pas ta série.</T></View></Carte>
    </Ecran>
  );
}

// ------------------------------------------------------------------ profil (17)
export function ProfilEcran({ suite }: { suite: React.ReactNode }) {
  const { c } = useTheme();
  const routeur = useRouter();
  const { profil } = useAuth();
  const { donnees, xp, rang } = useProgres();
  const total = Object.keys(donnees.leconsTerminees ?? {}).length;
  const anneaux = [['Onenji', c.modules.onenji, Math.min(1, total / 10), `${total}`], ['Azeva', c.modules.azeva, Math.min(1, (donnees.parties ?? 0) / 20), `${donnees.parties ?? 0}`], ['Ompangano', c.modules.ompangano, Math.min(1, (donnees.contributions ?? 0) / 10), `${donnees.contributions ?? 0}`]] as const;
  return (
    <Ecran bas={100}>
      <Entete titre="Mon profil" retour={() => routeur.back()} droite={<BoutonIcone nom="reglages" label="Réglages" onPress={() => routeur.push('/reglages' as never)} />} />
      <View style={{ alignItems: 'center', gap: 8 }}><Avatar nom={profil?.displayName || profil?.fullName || 'Invité'} taille={84} /><T v="sousTitre">{profil?.displayName || profil?.fullName || 'Invité'}</T><Pastille label={rang.rang.nom} couleur={c.accent} fond={c.carte} /></View>
      <Carte><View style={{ padding: 18, gap: 10 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="carte">{xp} XP</T><T v="petit">{rang.suivant ? `${rang.suivant.minXp - xp} XP avant ${rang.suivant.nom}` : 'Rang le plus haut atteint'}</T></View><Barre valeur={rang.progression} /></View></Carte>
      <View style={{ flexDirection: 'row', gap: 12 }}>{anneaux.map(([l, col, v, n]) => <Carte key={l} style={{ flex: 1, padding: 14, alignItems: 'center', gap: 8 }}><Anneau valeur={v} couleur={col} taille={64}><T v="carte">{n}</T></Anneau><T v="petit">{l}</T></Carte>)}</View>
      <SectionTitre titre="Rangs" />
      {RANGS.map((r, i) => <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: i <= rang.index ? 1 : 0.5 }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: i <= rang.index ? c.accent : c.squelette, alignItems: 'center', justifyContent: 'center' }}><T v="carte" couleur={i <= rang.index ? c.surAccent : c.discret}>{i + 1}</T></View><View style={{ flex: 1 }}><T v="carte">{r.nom}</T><T v="petit">{r.description}</T></View><T v="petit">{r.minXp} XP</T></View>)}
      {profil && <CarteNkorounaProfil />}
      {suite}
    </Ecran>
  );
}

/** Lier son téléphone à un compte Google ou e-mail : même compte quelle que soit la façon de se connecter ; un éventuel compte créé par SMS est fusionné. */
function LierTelephone() {
  const { profil, recharger } = useAuth();
  const toast = useToast();
  const [etape, setEtape] = useState<'fermé' | 'numero' | 'code'>('fermé');
  const [tel, setTel] = useState(''), [code, setCode] = useState(''), [occupe, setOccupe] = useState(false);
  if (!profil || profil.id.startsWith('tel_')) return null;
  const lie = !!(profil as { phone?: string }).phone;
  return (
    <Carte plat><View style={{ padding: 16, gap: 10 }}>
      <T v="carte">Mon téléphone</T>
      {etape === 'fermé' && <><T v="petit">{lie ? `Numéro lié : tu peux aussi te connecter par SMS avec ${(profil as { phone?: string }).phone}.` : 'Lie ton numéro : tu retrouveras le même compte, la même progression, en te connectant par SMS.'}</T>{!lie && <Bouton label="Lier mon numéro" petit variante="fantome" onPress={() => setEtape('numero')} />}</>}
      {etape === 'numero' && <>
        <Champ valeur={tel} onChange={setTel} placeholder="06 12 34 56" icone="telephone" clavier="phone-pad" />
        <Bouton label="Recevoir le code" petit charge={occupe} onPress={async () => { const n = normaliserTelephone(tel); if (!n) { toast('Numéro invalide.', 'erreur'); return; } setOccupe(true); try { await envoyerCodeLien(n); setTel(n); setEtape('code'); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); } }} />
      </>}
      {etape === 'code' && <>
        <Champ valeur={code} onChange={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="Code reçu par SMS" clavier="number-pad" />
        <Bouton label="Valider" petit charge={occupe} desactive={code.length < 4} onPress={async () => { setOccupe(true); try { const r = await verifierCodeLien(tel, code); toast(r.fusion ? `Numéro lié. Ta progression par SMS (${r.xpReverse} XP) a été réunie à ce compte.` : 'Numéro lié.', 'succes'); setEtape('fermé'); setCode(''); await recharger(); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); } }} />
      </>}
    </View></Carte>
  );
}

// ------------------------------------------------------------------ réglages (18)
export function ReglagesEcran() {
  const { c } = useTheme();
  const routeur = useRouter();
  const { prefs, regler } = usePrefs();
  const { deconnexion, profil } = useAuth();
  const [dialogue, confirmer] = useConfirmer();
  const Ligne = ({ titre, children }: { titre: string; children: React.ReactNode }) => <View style={{ gap: 8 }}><T v="libelle">{titre}</T><Rangee>{children}</Rangee></View>;
  return (
    <Ecran bas={100}>
      <Entete titre="Réglages" retour={() => routeur.back()} />
      <Ligne titre="Affichage">{(['auto', 'clair', 'sombre'] as const).map(t => <Puce key={t} label={t === 'auto' ? 'Comme le téléphone' : t === 'clair' ? 'Clair (plein soleil)' : 'Sombre'} actif={prefs.theme === t} onPress={() => regler({ theme: t })} icone={t === 'clair' ? 'soleil' : t === 'sombre' ? 'lune' : undefined} />)}</Ligne>
      <Ligne titre="Mode">{(['adulte', 'enfant', 'facile'] as const).map(m => <Puce key={m} label={m === 'adulte' ? 'Adulte' : m === 'enfant' ? 'Enfant' : 'Lecture facile'} actif={prefs.mode === m} onPress={() => regler({ mode: m })} />)}</Ligne>
      <Ligne titre="Animations">{([['completes', 'Complètes'], ['legeres', 'Légères'], ['aucune', 'Aucune']] as [NiveauAnim, string][]).map(([a, l]) => <Puce key={a} label={l} actif={prefs.animations === a} onPress={() => regler({ animations: a })} />)}</Ligne>
      <Ligne titre="Sons et vibrations"><Puce label={prefs.sons ? 'Sons activés' : 'Sons coupés'} actif={prefs.sons} onPress={() => regler({ sons: !prefs.sons })} icone={prefs.sons ? 'haut_parleur' : 'muet'} /><Puce label={prefs.vibrations ? 'Vibrations activées' : 'Vibrations coupées'} actif={prefs.vibrations} onPress={() => regler({ vibrations: !prefs.vibrations })} /></Ligne>
      <Ligne titre="Rappel doux">{[['18:00', '18 h'], ['19:00', '19 h'], ['20:00', '20 h'], [null, 'Aucun']].map(([v, l]) => <Puce key={String(l)} label={String(l)} actif={prefs.rappel === v} onPress={() => regler({ rappel: v as string | null })} />)}</Ligne>
      <Carte onPress={() => routeur.push('/parents' as never)} label="Espace parents"><View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ic nom="parents" taille={22} couleur={c.accent} /><View style={{ flex: 1 }}><T v="carte">Espace parents</T><T v="petit">Temps de jeu et limites</T></View><Ic nom="suivant" taille={18} couleur={c.discret} /></View></Carte>
      <LierTelephone />
      <Bouton label="Hors ligne et synchronisation" icone="reseau" variante="fantome" onPress={() => emettre('horsligne')} />
      <Bouton label={profil ? 'Me déconnecter' : 'Créer un compte ou me connecter'} variante="fantome" onPress={() => (profil ? confirmer({ titre: 'Te déconnecter ?', texte: 'Tes contenus en attente d\'envoi restent sur ce téléphone. Tu pourras te reconnecter avec ton numéro.', action: 'Me déconnecter', onOk: deconnexion }) : deconnexion())} />{dialogue}
      <T v="petit" style={{ textAlign: 'center' }}>Nkala · Essaka Engineering</T>
    </Ecran>
  );
}

// ------------------------------------------------------------------ espace parents (60)
export function ParentsEcran() {
  const { c } = useTheme();
  const routeur = useRouter();
  const toast = useToast();
  const { prefs, regler } = usePrefs();
  const [ouvert, setOuvert] = useState(!prefs.parentsCode);
  const [code, setCode] = useState('');
  const [minutes, setMinutes] = useState(0);
  useEffect(() => { AsyncStorage.getItem(`nkala_minutes_${new Date().toISOString().slice(0, 10)}`).then(v => setMinutes(Math.round(Number(v) || 0))).catch(() => {}); }, []);
  if (!ouvert) return (
    <Ecran><Entete titre="Espace parents" retour={() => routeur.back()} /><Mascotte taille={90} humeur="content" /><T v="corps">Entre le code à 4 chiffres pour continuer.</T>
      <Champ valeur={code} onChange={t => setCode(t.replace(/\D/g, '').slice(0, 4))} placeholder="Code" clavier="number-pad" secret focus />
      <Bouton label="Ouvrir" onPress={() => (code === prefs.parentsCode ? setOuvert(true) : toast('Code incorrect.', 'erreur'))} /></Ecran>
  );
  return (
    <Ecran bas={100}>
      <Entete titre="Espace parents" retour={() => routeur.back()} />
      {!prefs.parentsCode ? <Carte><View style={{ padding: 16, gap: 10 }}><T v="carte">Choisis un code parent</T><T v="petit">4 chiffres : il protège le mode enfant et les limites.</T>
        <Champ valeur={code} onChange={t => setCode(t.replace(/\D/g, '').slice(0, 4))} placeholder="Nouveau code" clavier="number-pad" secret /><Bouton label="Enregistrer le code" desactive={code.length !== 4} onPress={() => { regler({ parentsCode: code }); setCode(''); toast('Code enregistré.', 'succes'); }} /></View></Carte> :
        <Carte plat><View style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><T v="corps">Code parent défini</T><Bouton label="Retirer" petit large={false} variante="fantome" onPress={() => regler({ parentsCode: null })} /></View></Carte>}
      <Carte><View style={{ padding: 16, gap: 10 }}><T v="carte">Temps de jeu de l'enfant</T><T v="petit">Aujourd'hui : {minutes} min{prefs.limiteMinutes ? ` sur ${prefs.limiteMinutes}` : ''}</T><Barre valeur={prefs.limiteMinutes ? minutes / prefs.limiteMinutes : 0} />
        <Rangee>{[15, 30, 45, 60, null].map(m => <Puce key={String(m)} label={m ? `${m} min` : 'Sans limite'} actif={prefs.limiteMinutes === m} onPress={() => regler({ limiteMinutes: m })} />)}</Rangee></View></Carte>
      <Carte plat><View style={{ padding: 14, gap: 6 }}><T v="carte">En mode enfant</T><T v="petit">• Aucune publicité.{'\n'}• Pas de classement public ni de messages.{'\n'}• Jeux et leçons sans lecture.{'\n'}• La salle des paris n'existe pas.</T></View></Carte>
      <Bouton label={prefs.mode === 'enfant' ? 'Quitter le mode enfant' : 'Passer en mode enfant'} variante={prefs.mode === 'enfant' ? 'fantome' : 'ambre'} onPress={() => { regler({ mode: prefs.mode === 'enfant' ? 'adulte' : 'enfant' }); routeur.replace('/' as never); }} />
      <T v="petit" couleur={c.discret}>Pour quitter le mode enfant, il faudra ce code.</T>
    </Ecran>
  );
}

// ------------------------------------------------------------------ recherche globale (15)
export function RechercheEcran() {
  const { c } = useTheme();
  const routeur = useRouter();
  const { res } = useContenus(['lecons', 'jeux', 'lieux', 'titres', 'actualites']);
  const [q, setQ] = useState('');
  const [mots, setMots] = useState<{ id: string; myeneText: string; frenchText: string }[]>([]);
  const n = q.trim().toLowerCase();
  useEffect(() => { if (n.length < 2) { setMots([]); return; } catalogue.rechercher({ dialecte: null, texte: n, limite: 6, decalage: 0 } as never).then(l => setMots(l as never)).catch(() => setMots([])); }, [n]);
  const f = (liste: Ligne[] | undefined, champ = 'titre') => (n.length >= 2 ? (liste ?? []).filter(x => String(x[champ] ?? x.nom).toLowerCase().includes(n)).slice(0, 5) : []);
  const groupes: [string, Ligne[], string, string][] = [['Leçons', f(res.lecons), '/apprendre', 'apprendre'], ['Jeux', f(res.jeux), '/azeva', 'jouer'], ['Lieux', f(res.lieux, 'nom'), '/village', 'village'], ['Titres', f(res.titres), '/ecoute', 'ecouter'], ['Actualités', f(res.actualites), '/village', 'magazine']];
  const vide = mots.length === 0 && groupes.every(g => g[1].length === 0);
  return (
    <Ecran bas={100}>
      <Entete titre="Recherche" retour={() => routeur.back()} />
      <Champ valeur={q} onChange={setQ} placeholder="Mots, leçons, jeux, lieux…" icone="chercher" focus />
      {n.length >= 2 && vide && <EtatVide icone="chercher" titre="Aucun résultat" texte="Essaie un autre mot." />}
      {mots.length > 0 && <><SectionTitre titre="Mots" />{mots.map(m => <Carte key={m.id} plat><View style={{ padding: 12 }}><T v="carte" style={{ fontStyle: 'italic' }}>{m.myeneText}</T><T v="petit">{m.frenchText}</T></View></Carte>)}</>}
      {groupes.map(([titre, l, route, ic]) => l.length > 0 && <View key={titre} style={{ gap: 8 }}><SectionTitre titre={titre} />{l.map(x => <Pressable key={x.id} accessibilityRole="button" onPress={() => routeur.push(route as never)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 8 }}><Ic nom={ic} taille={20} couleur={c.accent} /><T v="corps" fort>{x.titre ?? x.nom}</T></Pressable>)}</View>)}
    </Ecran>
  );
}
