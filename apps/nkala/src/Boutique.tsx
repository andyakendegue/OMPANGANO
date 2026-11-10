/** Achats intégrés et abonnements : offres de la collection « produits », reçu envoyé au serveur (simulation ou magasins), droits rafraîchis. */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { chargerDroits, chargerProduits, envoyerRecu, type DroitsServeur, type Produit } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { oublierDroits } from './Droits';
import { useGlobale } from './Globale';
import { Bouton, Carte, Chargement, EtatVide, Feuille, Ic, Pastille, T, useToast } from './kit';
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

  const acheter = async (p: Produit) => {
    if (!profil) { toast('Connecte-toi pour acheter.', 'info'); return; }
    if (offres?.mode !== 'simulation') { toast('Les achats des magasins demandent la version installée depuis l\'App Store ou Google Play.', 'info'); return; }
    setOccupe(p.id);
    try { await envoyerRecu('simulation', p.id, `simule:${profil.id.slice(-6)}-${p.id}-${Date.now().toString(36)}`); oublierDroits(); toast('Achat enregistré (simulation).', 'succes'); charger(); }
    catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(null); }
  };
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
      {offres?.mode === 'simulation' && <T v="petit" style={{ textAlign: 'center' }}>Mode simulation : aucun paiement réel.</T>}
      <T v="petit" style={{ textAlign: 'center' }}>Restaurer mes achats : ils se rechargent automatiquement quand tu te reconnectes.</T>
    </Feuille>
  );
}
