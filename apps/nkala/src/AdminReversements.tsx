/**
 * Console : reversements (décision de Capp du 15 nov. 2026 ; audit Apprendre §18). Calcul trimestriel côté serveur, validé puis
 * scellé ; un relevé par bénéficiaire (contributeur spécial, créateurs, professeurs, associations) ; export CSV pour l'expert-comptable.
 * Aucun taux dans le code : les paramètres (taux, coefficients des zones, clés) sont saisis ici et versionnés.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import {
  adminBeneficiaires, adminCalculerReversements, adminCalculReversements, adminCalculsReversements, adminEnregistrerBeneficiaire, adminEnregistrerOperation,
  adminEnregistrerParametresReversements, adminEnregistrerRecettesPub, adminExportReversementsCsv, adminMembreAssociation, adminMinutesRegardees,
  adminOperationsExceptionnelles, adminParametresReversements, adminPayerReleve, adminRecettesPub, adminValiderReversements, trimestreDe,
  type BeneficiaireAdmin, type CalculReversements,
} from '@nkala/noyau';
import { Bouton, Carte, Champ, Puce, SectionTitre, T, useToast } from './kit';
import { useTheme } from './Prefs';

const F = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`;
const trimestrePrecedent = () => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - 3); return trimestreDe(d); };
const TYPES: { id: BeneficiaireAdmin['type']; label: string }[] = [
  { id: 'contributeur_special', label: 'Contributeur spécial' }, { id: 'createur', label: 'Créateur de vidéos' }, { id: 'professeur', label: 'Professeur' }, { id: 'association', label: 'Association' },
];
type Vue = 'calculs' | 'beneficiaires' | 'parametres' | 'recettes' | 'operations' | 'minutes';

export function ReversementsAdmin() {
  const [vue, setVue] = useState<Vue>('calculs');
  const [trimestre, setTrimestre] = useState(trimestrePrecedent());
  return (
    <View style={{ gap: 14 }}>
      <T v="petit">Calcul trimestriel des sommes dues aux bénéficiaires des contrats. Un calcul se valide puis se scelle ; une erreur se corrige par un calcul rectificatif. Les taux sont confidentiels : ils ne sont saisis qu'ici.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {([['calculs', 'Calculs et relevés'], ['beneficiaires', 'Bénéficiaires'], ['parametres', 'Paramètres'], ['recettes', 'Recettes pub'], ['operations', 'Opérations exceptionnelles'], ['minutes', 'Minutes regardées']] as [Vue, string][])
          .map(([id, l]) => <Puce key={id} label={l} actif={vue === id} onPress={() => setVue(id)} />)}
      </View>
      {vue !== 'beneficiaires' && vue !== 'parametres' && vue !== 'operations' && <Champ valeur={trimestre} onChange={t => setTrimestre(t.toUpperCase().replace(/[^0-9T-]/g, ''))} label="Trimestre (AAAA-Tn)" placeholder="2026-T4" />}
      {vue === 'calculs' && <Calculs trimestre={trimestre} />}
      {vue === 'beneficiaires' && <Beneficiaires />}
      {vue === 'parametres' && <Parametres />}
      {vue === 'recettes' && <Recettes trimestre={trimestre} />}
      {vue === 'operations' && <Operations />}
      {vue === 'minutes' && <Minutes trimestre={trimestre} />}
    </View>
  );
}

function Calculs({ trimestre }: { trimestre: string }) {
  const { c } = useTheme();
  const toast = useToast();
  const [liste, setListe] = useState<CalculReversements[]>([]);
  const [ouvert, setOuvert] = useState<CalculReversements | null>(null);
  const [frais, setFrais] = useState(''), [tiers, setTiers] = useState('');
  const [refs, setRefs] = useState<Record<string, string>>({});
  const charger = useCallback(() => { adminCalculsReversements().then(setListe).catch(e => toast((e as Error).message, 'erreur')); }, [toast]);
  useEffect(charger, [charger]);
  const ouvrir = (id: string) => adminCalculReversements(id).then(setOuvert).catch(e => toast((e as Error).message, 'erreur'));
  const valide = liste.find(x => x.trimestre === trimestre && x.statut === 'valide');
  const calculer = async () => {
    try { const r = await adminCalculerReversements(trimestre, { fraisInfra: Number(frais) || 0, autresTiers: Number(tiers) || 0, rectifie: valide?.id }); toast(`Calcul fait : ${r.releves} relevé(s).`, 'succes'); charger(); ouvrir(r.id); }
    catch (e) { toast((e as Error).message, 'erreur'); }
  };
  const exporter = async (id: string) => {
    try {
      const csv = await adminExportReversementsCsv(id);
      if (Platform.OS === 'web') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `reversements-${id}.csv`; a.click(); }
      else await Share.share({ message: csv, title: `reversements-${id}.csv` });
    } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Champ valeur={frais} onChange={t => setFrais(t.replace(/\D/g, ''))} clavier="number-pad" label="Frais d'infrastructure IA (F)" placeholder="0" /></View>
        <View style={{ flex: 1 }}><Champ valeur={tiers} onChange={t => setTiers(t.replace(/\D/g, ''))} clavier="number-pad" label="Autres reversements aux tiers (F)" placeholder="0" /></View>
      </View>
      <Bouton label={valide ? `Calcul rectificatif de ${trimestre}` : `Calculer ${trimestre}`} variante="ambre" onPress={calculer} />
      {liste.map(x => (
        <Carte key={x.id} plat onPress={() => ouvrir(x.id)} label={`${x.trimestre} ${x.statut}`}><View style={{ padding: 12, gap: 4 }}>
          <T v="carte">{x.trimestre} · {x.statut === 'valide' ? 'validé et scellé' : x.statut === 'remplace' ? 'remplacé' : 'à valider'}</T>
          <T v="petit">Revenus nets {F(x.totaux.revenus_nets)} · à payer {F(x.totaux.a_payer)} · paramètres v{x.version_params}{x.hash ? ` · empreinte ${x.hash.slice(0, 12)}…` : ''}</T>
        </View></Carte>
      ))}
      {ouvert && <View style={{ gap: 8 }}>
        <SectionTitre titre={`Relevés ${ouvert.trimestre} (${ouvert.statut})`} />
        <T v="petit">Fonds des créateurs {F(ouvert.totaux.fonds_createurs)} · masterclass {F(ouvert.totaux.professeurs)} · enveloppe IA {F(ouvert.totaux.enveloppe_ia)}</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {ouvert.statut === 'calcule' && <Bouton label="Valider et sceller" petit large={false} variante="ambre" onPress={async () => { try { await adminValiderReversements(ouvert.id); toast('Calcul validé et scellé.', 'succes'); charger(); ouvrir(ouvert.id); } catch (e) { toast((e as Error).message, 'erreur'); } }} />}
          <Bouton label="Exporter (CSV)" petit large={false} variante="fantome" onPress={() => exporter(ouvert.id)} />
        </View>
        {(ouvert.releves ?? []).map(r => (
          <Carte key={r.id} plat><View style={{ padding: 12, gap: 4 }}>
            <T v="carte">{r.nom} · {TYPES.find(t => t.id === r.type)?.label ?? r.type}</T>
            {r.detail.map((p, i) => <T key={i} v="petit">{p.libelle} : {F(p.assiette)} × {Math.round(p.taux * 10000) / 100} % = {F(p.montant)}{p.note ? ` (${p.note})` : ''}</T>)}
            <T v="petit" fort>Brut {F(r.brut_fcfa)} · report {F(r.report_entrant)} · retenue {F(r.retenue_fcfa)} · à payer {F(r.a_payer_fcfa)}{r.report_sortant ? ` · reporté ${F(r.report_sortant)}` : ''}</T>
            <T v="petit" couleur={c.discret}>{r.statut === 'paye' ? `Payé (${r.reference_versement})` : r.statut}</T>
            {r.statut === 'valide' && r.a_payer_fcfa > 0 && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Champ valeur={refs[r.id] ?? ''} onChange={t => setRefs({ ...refs, [r.id]: t })} label="Référence du versement" placeholder="Mobile Money ou virement" /></View>
              <Bouton label="Marquer payé" petit large={false} onPress={async () => { try { await adminPayerReleve(r.id, refs[r.id] ?? ''); toast('Relevé marqué payé.', 'succes'); ouvrir(ouvert.id); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
            </View>}
          </View></Carte>
        ))}
      </View>}
    </View>
  );
}

function Beneficiaires() {
  const toast = useToast();
  const [liste, setListe] = useState<BeneficiaireAdmin[]>([]);
  const [f, setF] = useState<Partial<BeneficiaireAdmin>>({ type: 'createur' });
  const [membre, setMembre] = useState<Record<string, string>>({});
  const charger = useCallback(() => { adminBeneficiaires().then(setListe).catch(e => toast((e as Error).message, 'erreur')); }, [toast]);
  useEffect(charger, [charger]);
  const enregistrer = async () => { try { await adminEnregistrerBeneficiaire(f); toast('Bénéficiaire enregistré.', 'succes'); setF({ type: f.type }); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } };
  const champ = (k: keyof BeneficiaireAdmin, label: string, num = false) => <Champ valeur={String(f[k] ?? '')} onChange={t => setF({ ...f, [k]: num ? t.replace(/[^0-9.]/g, '') : t })} label={label} clavier={num ? 'number-pad' : undefined} />;
  return (
    <View style={{ gap: 10 }}>
      <SectionTitre titre={f.id ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{TYPES.map(t => <Puce key={t.id} label={t.label} actif={f.type === t.id} onPress={() => setF({ ...f, type: t.id })} />)}</View>
      {champ('nom', 'Nom')}{champ('user_id', 'Compte Nkala (identifiant ; professeur : l\'hôte des masterclass)')}{champ('contrat', 'Contrat signé (référence)')}
      {champ('date_signature', 'Date de signature (AAAA-MM-JJ)')}
      {f.type === 'contributeur_special' && champ('date_pv', 'Procès-verbal de validation complète (AAAA-MM-JJ)')}
      {champ('seuil_fcfa', 'Seuil de versement (F)', true)}{champ('retenue_pct', 'Retenue à la source (%)', true)}
      <Bouton label="Enregistrer" variante="ambre" onPress={enregistrer} />
      <T v="petit">Créateurs : indiquer leur identifiant dans la colonne « createur_id » de leurs vidéos (Contenus › Vidéothèque).</T>
      {liste.map(b => (
        <Carte key={b.id} plat onPress={() => setF(b)} label={b.nom}><View style={{ padding: 12, gap: 4 }}>
          <T v="carte">{b.nom} · {TYPES.find(t => t.id === b.type)?.label}{b.actif ? '' : ' (inactif)'}</T>
          <T v="petit">{b.id}{b.user_id ? ` · compte ${b.user_id}` : ''}{b.date_pv ? ` · PV ${String(b.date_pv).slice(0, 10)}` : ''} · seuil {F(b.seuil_fcfa)}</T>
          {b.type === 'association' && <>
            <T v="petit">{b.membres.length} membre(s){b.membres.length ? ` : ${b.membres.slice(0, 6).join(', ')}${b.membres.length > 6 ? '…' : ''}` : ''}</T>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Champ valeur={membre[b.id] ?? ''} onChange={t => setMembre({ ...membre, [b.id]: t })} label="Ajouter un membre (identifiant du compte)" /></View>
              <Bouton label="Ajouter" petit large={false} onPress={async () => { try { await adminMembreAssociation(b.id, (membre[b.id] ?? '').trim()); setMembre({ ...membre, [b.id]: '' }); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
            </View>
          </>}
        </View></Carte>
      ))}
    </View>
  );
}

function Parametres() {
  const toast = useToast();
  const [texte, setTexte] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [versions, setVersions] = useState<{ version: number; date_effet: string }[]>([]);
  useEffect(() => { adminParametresReversements().then(r => { setTexte(JSON.stringify(r.actifs?.valeurs ?? r.vides, null, 2)); setVersions(r.versions); }).catch(e => toast((e as Error).message, 'erreur')); }, [toast]);
  const enregistrer = async () => {
    let v: unknown; try { v = JSON.parse(texte); } catch { toast('JSON illisible.', 'erreur'); return; }
    try { const r = await adminEnregistrerParametresReversements(v, date); toast(`Paramètres enregistrés (version ${r.version}).`, 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 10 }}>
      <T v="petit">Taux et coefficients entre 0 et 1 (0,25 = 25 %). Chaque enregistrement crée une nouvelle version, avec sa date d'effet ; un calcul garde la version qu'il a utilisée. « coefficients_zones » : zone de publicité → coefficient d'apport ; « formules_modules » : formule → modules qu'elle ouvre ; « cle_ia_formules » : formule → part IA.</T>
      <Champ valeur={texte} onChange={setTexte} lignes={18} label="Paramètres (JSON)" />
      <Champ valeur={date} onChange={setDate} label="Date d'effet (AAAA-MM-JJ)" />
      <Bouton label="Enregistrer une nouvelle version" variante="ambre" onPress={enregistrer} />
      {versions.map(v => <T key={v.version} v="petit">Version {v.version} · effet au {String(v.date_effet).slice(0, 10)}</T>)}
    </View>
  );
}

function Recettes({ trimestre }: { trimestre: string }) {
  const toast = useToast();
  const [lignes, setLignes] = useState<{ jour: string; zone: string; montant_fcfa: number }[]>([]);
  const [texte, setTexte] = useState('');
  const charger = useCallback(() => { if (/^\d{4}-T[1-4]$/.test(trimestre)) adminRecettesPub(trimestre).then(setLignes).catch(() => setLignes([])); }, [trimestre]);
  useEffect(charger, [charger]);
  const parZone = lignes.reduce<Record<string, number>>((s, l) => ({ ...s, [l.zone]: (s[l.zone] ?? 0) + l.montant_fcfa }), {});
  const enregistrer = async () => {
    const l = texte.split(/\n+/).map(x => x.split(/[;,\t]/).map(y => y.trim())).filter(x => x.length >= 3).map(([jour, zone, m]) => ({ jour, zone, montant_fcfa: Number(m) }));
    try { const r = await adminEnregistrerRecettesPub(l); toast(`${r.lignes} ligne(s) enregistrée(s).`, 'succes'); setTexte(''); charger(); } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 10 }}>
      <T v="petit">Recettes publicitaires nettes par zone et par jour (régie, forfaits, CPM). Une ligne par jour et par zone : AAAA-MM-JJ;zone;montant.</T>
      <Champ valeur={texte} onChange={setTexte} lignes={6} placeholder={'2026-10-01;bandeau_jeux;12000'} label="Coller les lignes" />
      <Bouton label="Enregistrer" variante="ambre" onPress={enregistrer} />
      {Object.entries(parZone).map(([z, m]) => <T key={z} v="petit">{z} : {F(m)}</T>)}
      {!lignes.length && <T v="petit">Aucune recette saisie pour {trimestre}.</T>}
    </View>
  );
}

function Operations() {
  const toast = useToast();
  const [liste, setListe] = useState<Awaited<ReturnType<typeof adminOperationsExceptionnelles>>>([]);
  const [f, setF] = useState({ jour: new Date().toISOString().slice(0, 10), contrepartie: '', objet: '', montant_fcfa: '', couts_directs: '', part_apport: '' });
  const charger = useCallback(() => { adminOperationsExceptionnelles().then(setListe).catch(() => {}); }, []);
  useEffect(charger, [charger]);
  const enregistrer = async () => {
    try { await adminEnregistrerOperation({ ...f, montant_fcfa: Number(f.montant_fcfa) || 0, couts_directs: Number(f.couts_directs) || 0, part_apport: f.part_apport === '' ? null : Number(f.part_apport) }); toast('Opération enregistrée.', 'succes'); charger(); }
    catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 10 }}>
      <T v="petit">Seules les opérations de la définition étroite du contrat du contributeur spécial. Exclus : abonnements, levées de fonds, subventions, cession de l'entreprise, autres langues, prestations.</T>
      <Champ valeur={f.jour} onChange={t => setF({ ...f, jour: t })} label="Date (AAAA-MM-JJ)" />
      <Champ valeur={f.contrepartie} onChange={t => setF({ ...f, contrepartie: t })} label="Contrepartie" />
      <Champ valeur={f.objet} onChange={t => setF({ ...f, objet: t })} label="Objet" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Champ valeur={f.montant_fcfa} onChange={t => setF({ ...f, montant_fcfa: t.replace(/\D/g, '') })} clavier="number-pad" label="Montant (F)" /></View>
        <View style={{ flex: 1 }}><Champ valeur={f.couts_directs} onChange={t => setF({ ...f, couts_directs: t.replace(/\D/g, '') })} clavier="number-pad" label="Coûts directs (F)" /></View>
        <View style={{ flex: 1 }}><Champ valeur={f.part_apport} onChange={t => setF({ ...f, part_apport: t.replace(/[^0-9.]/g, '') })} clavier="decimal-pad" label="Part de l'apport (0 à 1)" /></View>
      </View>
      <Bouton label="Enregistrer l'opération" variante="ambre" onPress={enregistrer} />
      {liste.map(o => <T key={o.id} v="petit">{String(o.jour).slice(0, 10)} · {o.contrepartie} · {o.objet} · {F(o.montant_fcfa)} − {F(o.couts_directs)}{o.part_apport !== null ? ` · part ${o.part_apport}` : ''}</T>)}
    </View>
  );
}

function Minutes({ trimestre }: { trimestre: string }) {
  const [lignes, setLignes] = useState<Awaited<ReturnType<typeof adminMinutesRegardees>>>([]);
  useEffect(() => { if (/^\d{4}-T[1-4]$/.test(trimestre)) adminMinutesRegardees(trimestre).then(setLignes).catch(() => setLignes([])); }, [trimestre]);
  return (
    <View style={{ gap: 6 }}>
      <T v="petit">Minutes regardées par des abonnés (formules qui ouvrent Igolani), par vidéo. Le calcul ne garde que les N passages les plus longs par abonné et par vidéo.</T>
      {lignes.map(l => <T key={l.cours_id} v="petit">{l.titre ?? l.cours_id} · {l.minutes} min · {l.abonnes} abonné(s) · {l.passages} passage(s){l.createur_id ? '' : ' · sans créateur'}</T>)}
      {!lignes.length && <T v="petit">Aucune minute mesurée pour {trimestre}.</T>}
    </View>
  );
}
