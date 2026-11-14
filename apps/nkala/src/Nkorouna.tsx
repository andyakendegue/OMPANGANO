/**
 * Portefeuille Nkorouna (NKR) affiché en tête de la boutique : solde, historique, transparence du registre.
 * Les NKR s'achètent en FCFA (packs de la collection « produits », type « nkorouna ») et se dépensent sur les produits qui ont un prix_nkr.
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { chargerEtatNkr, chargerPortefeuilleNkr, type EtatPublicNkr, type MouvementNkr, type PortefeuilleNkr } from '@nkala/noyau';
import { Bouton, Carte, Chargement, Ic, Pastille, T } from './kit';
import { useGlobale } from './Globale';
import { useTheme } from './Prefs';

export const formatNkr = (n: number) => `${n.toLocaleString('fr-FR')} NKR`;

const LIBELLES: Record<MouvementNkr['nature'], string> = {
  achat: 'Achat de Nkorouna', depense: 'Dépense', transfert: 'Envoi', bonus: 'Cadeau', correction: 'Correction', annulation: 'Annulation',
};
const libelle = (m: MouvementNkr) => {
  const nom = typeof m.meta?.titre === 'string' && m.meta.titre ? m.meta.titre : m.meta?.produit;
  const produit = typeof nom === 'string' && m.nature !== 'achat' ? ` · ${nom}` : '';
  const motif = typeof m.meta?.motif === 'string' ? ` · ${m.meta.motif}` : '';
  return (m.nature === 'transfert' ? (m.montant > 0 ? 'Reçu' : 'Envoi') : LIBELLES[m.nature] ?? m.nature) + produit + motif;
};

export function PortefeuilleNkorouna({ portefeuille, erreur }: { portefeuille: PortefeuilleNkr | null; erreur?: boolean }) {
  const { c } = useTheme();
  const [ouvert, setOuvert] = useState(false);
  const [registre, setRegistre] = useState<EtatPublicNkr | null>(null);
  const [voirRegistre, setVoirRegistre] = useState(false);
  const basculerRegistre = () => { setVoirRegistre(v => !v); if (!registre) chargerEtatNkr().then(setRegistre).catch(() => {}); };

  return (
    <Carte accent={c.accent}><View style={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ic nom="piece" taille={26} couleur={c.accent} />
        <View style={{ flex: 1 }}>
          <T v="petit">Mes Nkorouna</T>
          {erreur ? <T v="corps">Solde indisponible (réseau).</T> : !portefeuille ? <Chargement lignes={1} /> : <T v="titre" couleur={c.accent}>{formatNkr(portefeuille.solde)}</T>}
        </View>
        {portefeuille?.gele && <Pastille label="Compte gelé" couleur={c.erreur} fond={c.carte} />}
      </View>
      <T v="petit">Achète des Nkorouna en FCFA (Mobile Money), puis paie tes livres, leçons et jeux en un toucher.</T>

      {portefeuille && (
        <Pressable onPress={() => setOuvert(o => !o)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ic nom={ouvert ? 'fleche_haut' : 'fleche_bas'} taille={16} couleur={c.accent} />
          <T v="libelle" couleur={c.accent}>{ouvert ? 'Masquer l\'historique' : `Historique (${portefeuille.mouvements.length})`}</T>
        </Pressable>
      )}
      {ouvert && portefeuille && (portefeuille.mouvements.length === 0 ? <T v="petit">Aucun mouvement pour l'instant.</T> :
        portefeuille.mouvements.map(m => (
          <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.bord }}>
            <View style={{ flex: 1 }}>
              <T v="corps" numberOfLines={1}>{libelle(m)}</T>
              <T v="petit">{new Date(m.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} · empreinte {m.hash.slice(0, 10)}…</T>
            </View>
            <T v="carte" couleur={m.montant > 0 ? c.succes : c.texte}>{m.montant > 0 ? '+' : '−'}{formatNkr(Math.abs(m.montant))}</T>
          </View>)))}

      <Pressable onPress={basculerRegistre} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ic nom="bouclier" taille={16} couleur={c.discret} />
        <T v="petit">Registre public et vérifiable</T>
      </Pressable>
      {voirRegistre && (!registre ? <Chargement lignes={1} /> : (
        <View style={{ gap: 4 }}>
          <T v="petit">En circulation : {formatNkr(registre.enCirculation)} · dépensés : {formatNkr(registre.depenses)}</T>
          <T v="petit">{registre.chaine.mouvements.toLocaleString('fr-FR')} mouvements, chacun scellé au précédent (empreinte {registre.chaine.derniereEmpreinte.slice(0, 12)}…).</T>
          <T v="petit">{registre.ancrages[0] ? `Dernier sceau : mouvements ${registre.ancrages[0].de} à ${registre.ancrages[0].jusqua}, ${new Date(registre.ancrages[0].le).toLocaleDateString('fr-FR')}${registre.ancrages[0].transaction ? ` · publié sur ${registre.ancrages[0].reseau}` : ''}.` : 'Aucun sceau publié pour l\'instant.'}</T>
        </View>))}
    </View></Carte>
  );
}

/** Raccourci du profil : solde et accès à la boutique (packs, paiement en NKR, historique). */
export function CarteNkorounaProfil() {
  const { c } = useTheme();
  const { ouvrirBoutique, boutique } = useGlobale();
  const [solde, setSolde] = useState<number | null>(null);
  useEffect(() => { if (!boutique) chargerPortefeuilleNkr().then(p => setSolde(p.solde)).catch(() => {}); }, [boutique]);
  return (
    <Carte><View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ic nom="piece" taille={26} couleur={c.accent} />
      <View style={{ flex: 1 }}><T v="petit">Mes Nkorouna</T><T v="carte" couleur={c.accent}>{solde === null ? '…' : formatNkr(solde)}</T></View>
      <Bouton label="Boutique" petit large={false} variante="ambre" onPress={ouvrirBoutique} />
    </View></Carte>
  );
}
