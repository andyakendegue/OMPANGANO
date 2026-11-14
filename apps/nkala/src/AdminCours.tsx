/**
 * Console : cours à distance (décisions de Capp, 14 nov. 2026). Les administrateurs nomment les professeurs (seuls eux et les
 * administrateurs créent des cours) et fixent le tarif générique : prix de l'heure, minimum par séance, formules qui incluent les cours.
 * Les professeurs ne choisissent jamais le prix.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { adminEcrireParametre, adminNommerProfesseur, adminParametres, adminProfesseurs, adminRetirerProfesseur, chargerUtilisateursPage, prixSeance, TARIF_COURS_DEFAUT, type TarifCoursDistance, type UserProfile } from '@nkala/noyau';
import { Bouton, Carte, Champ, Ic, Puce, SectionTitre, T, useToast } from './kit';
import { useTheme } from './Prefs';

export function CoursDistanceAdmin() {
  const { c } = useTheme();
  const toast = useToast();
  const [profs, setProfs] = useState<{ uid: string; nom: string; email: string | null }[]>([]);
  const [q, setQ] = useState('');
  const [trouves, setTrouves] = useState<UserProfile[]>([]);
  const [tarif, setTarif] = useState<TarifCoursDistance>(TARIF_COURS_DEFAUT);
  const [heure, setHeure] = useState('0'), [mini, setMini] = useState('0'), [plans, setPlans] = useState('');
  const charger = () => {
    adminProfesseurs().then(setProfs).catch(e => toast((e as Error).message, 'erreur'));
    adminParametres().then(r => { const t = { ...TARIF_COURS_DEFAUT, ...(r.parametres.cours_distance ?? {}) }; setTarif(t); setHeure(String(t.prix_heure_fcfa)); setMini(String(t.minimum_fcfa)); setPlans(t.plans_inclus.join(', ')); }).catch(() => {});
  };
  useEffect(charger, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q.trim().length < 2) { setTrouves([]); return; }
    const h = setTimeout(() => chargerUtilisateursPage({ q: q.trim(), limit: 8 }).then(r => setTrouves(r.items)).catch(() => setTrouves([])), 300);
    return () => clearTimeout(h);
  }, [q]);
  const enregistrer = async () => {
    const t = { prix_heure_fcfa: Number(heure) || 0, minimum_fcfa: Number(mini) || 0, plans_inclus: plans.split(/[,|\s]+/).map(x => x.trim()).filter(Boolean) };
    try { await adminEcrireParametre('cours_distance', t); setTarif(t); toast('Tarif enregistré. Il s\'applique aux cours créés désormais.', 'succes'); } catch (e) { toast((e as Error).message, 'erreur'); }
  };
  return (
    <View style={{ gap: 14 }}>
      <SectionTitre titre="Tarif générique" />
      <T v="petit">Le prix d'une séance vient de ce tarif, selon sa durée (arrondi aux 50 FCFA, jamais sous le minimum). Il est fixé à la création du cours ; les professeurs ne le choisissent pas. 0 = cours gratuits.</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Champ valeur={heure} onChange={setHeure} placeholder="Prix de l'heure (FCFA)" clavier="number-pad" label="Prix de l'heure (FCFA)" /></View>
        <View style={{ flex: 1 }}><Champ valeur={mini} onChange={setMini} placeholder="Minimum (FCFA)" clavier="number-pad" label="Minimum par séance" /></View>
      </View>
      <Champ valeur={plans} onChange={setPlans} placeholder="Formules incluses (identifiants, séparés par des virgules)" label="Formules qui incluent les cours" />
      <T v="petit">Exemples : 30 min = {prixSeance({ prix_heure_fcfa: Number(heure) || 0, minimum_fcfa: Number(mini) || 0 }, 30)} FCFA · 1 h = {prixSeance({ prix_heure_fcfa: Number(heure) || 0, minimum_fcfa: Number(mini) || 0 }, 60)} FCFA · 1 h 30 = {prixSeance({ prix_heure_fcfa: Number(heure) || 0, minimum_fcfa: Number(mini) || 0 }, 90)} FCFA. Enregistré : {tarif.prix_heure_fcfa} FCFA/h.</T>
      <Bouton label="Enregistrer le tarif" variante="ambre" onPress={enregistrer} />

      <SectionTitre titre={`Professeurs (${profs.length})`} />
      <T v="petit">Seuls les professeurs et les administrateurs créent des cours à distance. Un administrateur peut aussi planifier un cours en désignant le professeur.</T>
      {profs.map(p => (
        <Carte key={p.uid} plat><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }}>
          <Ic nom="apprendre" taille={20} couleur={c.accent} />
          <View style={{ flex: 1 }}><T v="carte">{p.nom}</T>{!!p.email && <T v="petit">{p.email}</T>}</View>
          <Puce label="Retirer" onPress={async () => { await adminRetirerProfesseur(p.uid).catch(e => toast((e as Error).message, 'erreur')); charger(); }} />
        </View></Carte>
      ))}
      <Champ valeur={q} onChange={setQ} placeholder="Chercher un utilisateur à nommer (nom, e-mail)" icone="chercher" auto="none" />
      {trouves.filter(u => !profs.some(p => p.uid === u.id)).map(u => (
        <Carte key={u.id} plat><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }}>
          <View style={{ flex: 1 }}><T v="carte">{u.fullName || u.displayName || u.id}</T><T v="petit">{u.email || u.id}</T></View>
          <Puce label="Nommer professeur" icone="ajouter" actif onPress={async () => { try { await adminNommerProfesseur(u.id); toast('Professeur nommé.', 'succes'); setQ(''); charger(); } catch (e) { toast((e as Error).message, 'erreur'); } }} />
        </View></Carte>
      ))}
    </View>
  );
}
