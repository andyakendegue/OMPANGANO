/** Fiche détail d'une annonce (hors logement) et aperçu identique avant l'envoi : galerie, prix, caractéristiques, emplacement, actions. */
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { categorieAnnonce, champsPour, distanceM, formaterDistance, formaterPrix, libelleValeur, type AnnoncePublique } from '@nkala/noyau';
import { Bouton, Carte, Ecran, Entete, Feuille, Ic, Pastille, SectionTitre, T } from '../kit';
import { useTheme } from '../Prefs';
import { ActionsLogement, Galerie, type MediaVu } from '../logement/DetailLogement';

export type FicheVue = Partial<AnnoncePublique> & { medias?: MediaVu[]; couvertureUrl?: string; positionReelle?: { lat: number; lng: number } };
export interface AnnonceGeneriqueVue { id?: string; titre?: string; description?: string; prix?: number; ville?: string; telephone?: string; auteur?: string; categorie_id?: string; distance_m?: number; fiche: FicheVue }

/** « 9 500 000 FCFA », « 150 000 FCFA / mois » (salaire), « Sur devis ». */
export function prixAnnonceGenerique(a: AnnonceGeneriqueVue): string {
  const cat = categorieAnnonce(a.fiche.categorie ?? a.categorie_id);
  const par = (a.fiche.champs?.periode_salaire ?? a.fiche.champs?.tarif_par) as string | undefined;
  if (par === 'devis') return 'Sur devis';
  if (!a.prix) return a.fiche.transaction === 'don' ? 'Gratuit' : cat?.prixLabel ? `${cat.prixLabel} à discuter` : 'Prix sur demande';
  const p = ({ mois: 'mois', jour: 'jour', heure: 'heure', prestation: 'prestation', mission: 'mission' } as Record<string, string>)[par ?? ''];
  return `${formaterPrix(a.prix)}${p ? ` / ${p}` : a.fiche.transaction === 'location' ? ' / jour' : ''}`;
}

export function VueAnnonce({ a, pos }: { a: AnnonceGeneriqueVue; pos?: { lat: number; lng: number } | null }) {
  const { c } = useTheme();
  const [infoCertif, setInfoCertif] = useState(false);
  const F = a.fiche, cat = categorieAnnonce(F.categorie ?? a.categorie_id);
  const medias = useMemo(() => [...(F.medias ?? [])].sort((x, y) => x.ordre - y.ordre), [F.medias]);
  const pt = F.positionPublique ?? F.position;
  const dist = a.distance_m ?? (pos && pt ? distanceM(pos, pt) : undefined);
  const lignes = cat ? champsPour(cat, F.sousCategorie).filter(ch => F.champs?.[ch.id] !== undefined) : [];
  return (
    <>
      <Galerie medias={medias} />
      <T v="titre" couleur={c.accent}>{prixAnnonceGenerique(a)}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {!!cat && <Pastille label={cat.transactions.find(t => t.id === F.transaction)?.label ?? cat.label} fond={c.carte} />}
        {!!cat && <Pastille label={cat.sousCategories.find(s => s.id === F.sousCategorie)?.label ?? ''} fond={c.carte} />}
        {F.negociable && <Pastille label="Négociable" couleur={c.accent} fond={c.carte} />}
        {F.certifiee && <Pressable accessibilityRole="button" accessibilityLabel="Vérifié sur place : explication" onPress={() => setInfoCertif(true)}><Pastille label="✓ Vu sur place" couleur={c.succes} fond={c.carte} /></Pressable>}
        {dist !== undefined && <Pastille label={formaterDistance(dist)} fond={c.carte} />}
      </View>
      {!!a.description && <T v="corps">{a.description}</T>}
      {lignes.length > 0 && <><SectionTitre titre="Caractéristiques" />
        <Carte plat><View style={{ padding: 14 }}>
          {lignes.map(ch => (
            <View key={ch.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5, borderBottomWidth: 1, borderColor: c.bord }}>
              <T v="corps" style={{ flex: 1 }}>{ch.label}</T><T v="corps" fort style={{ flex: 1, textAlign: 'right' }}>{libelleValeur(ch, F.champs![ch.id])}</T>
            </View>
          ))}
        </View></Carte></>}
      <SectionTitre titre="Emplacement" />
      <Carte plat><View style={{ padding: 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="village" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{[F.quartier, a.ville].filter(Boolean).join(', ') || 'Quartier non précisé'}</T></View>
        {!!F.repere && <View style={{ flexDirection: 'row', gap: 10 }}><Ic nom="flag-outline" taille={18} couleur={c.accent} /><T v="corps" style={{ flex: 1 }}>{F.repere}</T></View>}
        {F.masquee && <T v="petit">Emplacement approximatif (à 300 m près).</T>}
      </View></Carte>
      <Feuille visible={infoCertif} onClose={() => setInfoCertif(false)} titre="Vu sur place">
        <T v="corps">Au moins trois photos ou vidéos ont été prises avec l'appareil photo depuis Nkala, à moins de 150 m de l'emplacement indiqué.</T>
        <T v="petit">C'est une indication de l'application, pas une garantie : vérifiez toujours avant de payer.</T>
        <Bouton label="Compris" onPress={() => setInfoCertif(false)} />
      </Feuille>
    </>
  );
}

export function DetailAnnonceGenerique({ a, retour }: { a: AnnonceGeneriqueVue & { id: string }; retour: () => void }) {
  // Les actions (alerte de proximité, appeler, WhatsApp, itinéraire, partager, signaler) sont celles du logement.
  const pourActions = { ...a, logement: { ...a.fiche, periode: undefined } } as never;
  return (
    <Ecran bas={40}>
      <Entete titre={a.titre ?? 'Annonce'} sous={a.auteur ? `Par ${a.auteur}` : undefined} retour={retour} />
      <VueAnnonce a={a} />
      <ActionsLogement a={pourActions} onSignale={retour} />
    </Ecran>
  );
}
