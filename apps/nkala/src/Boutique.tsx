/** Achats intégrés et abonnements : offres de la collection « produits », reçu envoyé au serveur (simulation ou magasins), droits rafraîchis. */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { chargerDroits, chargerModesPaiement, chargerProduits, creerPaiement, declarerPaiement, lirePaiement, normaliserTelephone, simulerPaiement, type DroitsServeur, type Paiement, type Produit } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { oublierDroits } from './Droits';
import { useGlobale } from './Globale';
import { Bouton, Carte, Champ, Chargement, EtatVide, Feuille, Ic, Pastille, Puce, Rangee, T, useToast } from './kit';
import { useTheme } from './Prefs';

const prix = (p: Produit) => (p.prix_fcfa ? `${p.prix_fcfa.toLocaleString('fr-FR')} FCFA${p.periode === 'mois' ? ' / mois' : p.periode === 'an' ? ' / an' : ''}` : 'Prix à venir');

export function BoutiqueFeuille() {
  const { boutique, fermerBoutique } = useGlobale();
  const { profil } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const [offres, setOffres] = useState<{ mode: 'simulation' | 'magasins'; produits: Produit[] } | null>(null);
  const [droits, setDroits] = useState<DroitsServeur | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const charger = () => { setErreur(false); chargerProduits().then(setOffres).catch(() => setErreur(true)); if (profil) chargerDroits().then(setDroits).catch(() => {}); };
  useEffect(() => { if (boutique) charger(); }, [boutique]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paiement Mobile Money : choix de l'opérateur et du numéro, instructions, suivi du statut
  const [flux, setFlux] = useState<Produit | null>(null);
  const [modes, setModes] = useState<{ mode: string; operateurs: { id: string; nom: string }[] } | null>(null);
  const [op, setOp] = useState(''), [tel, setTel] = useState(''), [trans, setTrans] = useState('');
  const [pay, setPay] = useState<Paiement | null>(null);
  const ouvrirPaiement = (p: Produit) => {
    if (!profil) { toast('Connecte-toi pour acheter.', 'info'); return; }
    setFlux(p); setPay(null); setTrans(''); chargerModesPaiement().then(m => { setModes(m); setOp(m.operateurs[0]?.id ?? ''); }).catch(() => toast('Paiement indisponible pour le moment.', 'erreur'));
  };
  useEffect(() => {
    if (!pay || ['confirme', 'echoue', 'refuse', 'expire'].includes(pay.statut)) return;
    const t = setInterval(() => lirePaiement(pay.id).then(r => { setPay(r); if (r.statut === 'confirme') { oublierDroits(); toast('Paiement confirmé, merci !', 'succes'); charger(); } }).catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [pay?.id, pay?.statut]); // eslint-disable-line react-hooks/exhaustive-deps
  const lancer = async () => {
    const n = normaliserTelephone(tel); if (!flux || !n || !op) { toast('Numéro invalide.', 'erreur'); return; }
    setOccupe(flux.id);
    try { setPay(await creerPaiement(flux.id, op, n)); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(null); }
  };
  const acheter = (p: Produit) => { if (offres?.mode === 'simulation' && !p.prix_fcfa) { toast('Prix à venir.', 'info'); return; } ouvrirPaiement(p); };
  return (
    <Feuille visible={boutique} onClose={fermerBoutique} titre="Nkala Plus et achats">
      {droits?.abonne && <Carte plat><View style={{ padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ic nom="couronne" taille={22} couleur={c.accent} /><T v="carte">Abonnement actif{droits.abonneJusque ? ` jusqu'au ${new Date(droits.abonneJusque).toLocaleDateString('fr-FR')}` : ''} · plus de publicité</T></View></Carte>}
      {erreur ? <EtatVide icone="alerte" titre="Offres indisponibles" texte="Réessaie avec du réseau." action="Réessayer" onAction={charger} /> : !offres ? <Chargement lignes={2} /> : offres.produits.length === 0 ? <EtatVide icone="cadeau" titre="Les offres arrivent bientôt" /> :
        offres.produits.map(p => {
          const possede = p.type === 'abonnement' ? !!droits?.abonne : (droits?.achats ?? []).some(a => (p.donne_acces ?? [p.id]).includes(a));
          return (
            <Carte key={p.id}><View style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="carte" style={{ flex: 1 }}>{p.titre}</T>{possede && <Pastille label="Acquis" couleur={c.succes} fond={c.carte} />}</View>
              <T v="sousTitre" couleur={c.accent}>{prix(p)}</T>
              <T v="petit">{p.type === 'abonnement' ? 'Plus de publicité, accès aux contenus abonnés.' : p.type === 'achat' ? 'Achat à l\'unité, à vie.' : 'Consommable.'}</T>
              <Bouton label={possede ? 'Déjà acquis' : 'Acheter'} variante="ambre" desactive={possede} charge={occupe === p.id} onPress={() => acheter(p)} />
            </View></Carte>);
        })}
      {flux && (
        <Carte accent={c.accent}><View style={{ padding: 16, gap: 10 }}>
          <T v="carte">Payer « {flux.titre} » · {prix(flux)}</T>
          {!pay ? <>
            {!modes ? <Chargement lignes={1} /> : modes.operateurs.length === 0 ? <T v="petit">Aucun moyen de paiement n'est encore ouvert.</T> : <>
              <Rangee>{modes.operateurs.map(o => <Puce key={o.id} label={o.nom} actif={op === o.id} onPress={() => setOp(o.id)} />)}</Rangee>
              <Champ valeur={tel} onChange={setTel} placeholder="Numéro Mobile Money (06 12 34 56)" icone="telephone" clavier="phone-pad" />
              <Bouton label="Payer" variante="ambre" charge={occupe === flux.id} desactive={!tel.trim()} onPress={lancer} />
            </>}
            <Bouton label="Annuler" variante="fantome" petit onPress={() => setFlux(null)} />
          </> : <>
            <T v="petit">Référence : {pay.reference}</T>
            {(pay.instructions.etapes ?? []).map((e, i) => <T key={i} v="corps">{i + 1}. {e}</T>)}
            {pay.statut === 'confirme' ? <T v="carte" couleur={c.succes}>Paiement confirmé.</T> : pay.statut === 'declare' ? <T v="corps">Identifiant reçu : un administrateur vérifie le paiement (quelques minutes).</T> : ['echoue', 'refuse', 'expire'].includes(pay.statut) ? <T v="carte" couleur={c.erreur}>Paiement {pay.statut === 'expire' ? 'expiré' : pay.statut === 'refuse' ? 'refusé' : 'échoué'}.</T> : pay.mode === 'manuel' ? <>
              <Champ valeur={trans} onChange={setTrans} placeholder="Identifiant de la transaction (SMS de l'opérateur)" />
              <Bouton label="J'ai payé" variante="ambre" desactive={trans.trim().length < 6} onPress={() => declarerPaiement(pay.id, trans.trim()).then(() => lirePaiement(pay.id).then(setPay)).catch(e => toast((e as Error).message, 'erreur'))} />
            </> : pay.mode === 'simulation' ? <Bouton label="Confirmer (simulation, code 0000)" variante="ambre" onPress={() => simulerPaiement(pay.id, '0000').then(() => lirePaiement(pay.id).then(r => { setPay(r); oublierDroits(); charger(); })).catch(e => toast((e as Error).message, 'erreur'))} /> : <T v="petit">En attente de ta confirmation sur le téléphone…</T>}
            <Bouton label="Fermer" variante="fantome" petit onPress={() => { setFlux(null); setPay(null); }} />
          </>}
        </View></Carte>
      )}
      {offres?.mode === 'simulation' && <T v="petit" style={{ textAlign: 'center' }}>Mode simulation : aucun paiement réel.</T>}
      <T v="petit" style={{ textAlign: 'center' }}>Restaurer mes achats : ils se rechargent automatiquement quand tu te reconnectes.</T>
    </Feuille>
  );
}
