/**
 * Achat d'une annonce au-delà de la gratuite du mois (500 FCFA par défaut, produit « annonce-supplementaire ») :
 * en Nkoruna si un prix en jetons est réglé, ou par Mobile Money (parcours existant de la boutique).
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  chargerModesPaiement, cleNkr, creerPaiement, declarerPaiement, depenserNkr, formaterPrix, lirePaiement, normaliserTelephone, simulerPaiement,
  type Paiement, type QuotaAnnonces,
} from '@nkala/noyau';
import { Bouton, Champ, Chargement, Feuille, Puce, Rangee, T, useToast } from '../kit';
import { useTheme } from '../Prefs';

export function PaiementAnnonce({ quota, visible, onClose, onPaye }: { quota: QuotaAnnonces | null; visible: boolean; onClose: () => void; onPaye: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const [modes, setModes] = useState<{ mode: string; operateurs: { id: string; nom: string }[] } | null>(null);
  const [op, setOp] = useState('');
  const [tel, setTel] = useState('');
  const [pay, setPay] = useState<Paiement | null>(null);
  const [trans, setTrans] = useState('');
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { if (visible) { setPay(null); chargerModesPaiement().then(m => { setModes(m); setOp(m.operateurs[0]?.id ?? ''); }).catch(() => setModes({ mode: 'aucun', operateurs: [] })); } }, [visible]);
  useEffect(() => {
    if (!pay || ['confirme', 'echoue', 'refuse', 'expire'].includes(pay.statut)) return;
    const t = setInterval(() => lirePaiement(pay.id).then(r => { setPay(r); if (r.statut === 'confirme') { toast('Paiement confirmé : votre annonce part maintenant.', 'succes'); onPaye(); } }).catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [pay?.id, pay?.statut]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!quota) return null;
  const prix = quota.prix_fcfa ?? 500;
  const enNkr = async () => {
    setOccupe(true);
    try { await depenserNkr(quota.produit, cleNkr()); toast('Payé en Nkoruna : votre annonce part maintenant.', 'succes'); onPaye(); }
    catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  const mobile = async () => {
    const n = normaliserTelephone(tel);
    if (!n) { toast('Numéro de téléphone invalide.', 'erreur'); return; }
    setOccupe(true);
    try { setPay(await creerPaiement(quota.produit, op, n)); } catch (e) { toast((e as Error).message, 'erreur'); } finally { setOccupe(false); }
  };
  return (
    <Feuille visible={visible} onClose={onClose} titre="Annonce supplémentaire">
      <T v="corps">Votre annonce gratuite du mois ({quota.utilisees} / {quota.gratuites_mois}) est utilisée. Une annonce supplémentaire coûte <T v="corps" fort>{formaterPrix(prix)}</T>.</T>
      {!!quota.prix_nkr && <Bouton label={`Payer ${quota.prix_nkr} Nkoruna`} icone="jeton" charge={occupe} onPress={enNkr} />}
      {!pay ? (!modes ? <Chargement lignes={1} /> : modes.operateurs.length === 0 ? <T v="petit">Le paiement Mobile Money n'est pas encore ouvert.</T> : <>
        <T v="libelle">Mobile Money</T>
        <Rangee>{modes.operateurs.map(o => <Puce key={o.id} label={o.nom} actif={op === o.id} onPress={() => setOp(o.id)} />)}</Rangee>
        <Champ valeur={tel} onChange={setTel} placeholder="Votre numéro (+241 …)" clavier="phone-pad" />
        <Bouton label={`Payer ${formaterPrix(prix)}`} variante="ambre" charge={occupe} desactive={!op || tel.replace(/\D/g, '').length < 7} onPress={mobile} />
      </>) : (
        <View style={{ gap: 10 }}>
          {pay.statut === 'confirme' ? <T v="carte" couleur={c.succes}>Paiement confirmé.</T>
            : pay.statut === 'declare' ? <T v="corps">Identifiant reçu : vérification en cours (quelques minutes). L'annonce partira dès la confirmation.</T>
            : ['echoue', 'refuse', 'expire'].includes(pay.statut) ? <T v="carte" couleur={c.erreur}>Paiement non abouti.</T>
            : pay.mode === 'manuel' ? <>
              {(pay.instructions.etapes ?? []).map((e, i) => <T key={i} v="corps">{i + 1}. {e}</T>)}
              <Champ valeur={trans} onChange={setTrans} placeholder="Identifiant de la transaction" />
              <Bouton label="J'ai payé" variante="ambre" desactive={trans.trim().length < 6} onPress={() => declarerPaiement(pay.id, trans.trim()).then(() => lirePaiement(pay.id).then(setPay)).catch(e => toast((e as Error).message, 'erreur'))} />
            </> : pay.mode === 'simulation' ? <Bouton label="Confirmer (simulation, code 0000)" variante="ambre" onPress={() => simulerPaiement(pay.id, '0000').then(() => lirePaiement(pay.id).then(r => { setPay(r); if (r.statut === 'confirme') onPaye(); })).catch(e => toast((e as Error).message, 'erreur'))} />
            : <T v="petit">Validez le paiement sur votre téléphone…</T>}
        </View>
      )}
      <Bouton label="Plus tard" variante="fantome" petit onPress={onClose} />
      <T v="petit">Votre brouillon reste enregistré sur ce téléphone.</T>
    </Feuille>
  );
}
