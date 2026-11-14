/**
 * Fiches de grammaire d'Onenji (audit Apprendre §8.2) : collection « grammaire » importée dans la console ; chaque exemple porte sa source.
 * Rubriques, fiche avec paragraphes, petit tableau (lignes « a | b »), exemples à écouter, explication par Kak'Igonjo.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { Ligne } from '@nkala/noyau';
import { KakIgonjoFeuille, useIaCours } from './KakIgonjoCours';
import { libelleDialecte, Son } from './OnenjiLecon';
import { Carte, Ecran, Entete, EtatVide, Ic, Puce, Rangee, SectionTitre, T } from './kit';
import { useTheme } from './Prefs';

export const RUBRIQUES: Record<string, string> = { conjugaison: 'Conjugaison', classes_nominales: 'Classes nominales', pronoms: 'Pronoms', nombres: 'Nombres', phrase: 'La phrase', prononciation: 'Prononciation', autre: 'Autres' };
type Exemple = { myene: string; francais: string; audio?: string };
const exemplesDe = (f: Ligne): Exemple[] => {
  const v = typeof f.exemples === 'string' ? (() => { try { return JSON.parse(f.exemples); } catch { return []; } })() : f.exemples;
  return Array.isArray(v) ? v.filter((x: Exemple) => x && x.myene) : [];
};

export function ListeGrammaire({ fiches, retour, ouvrir, entete }: { fiches: Ligne[]; retour: () => void; ouvrir: (id: string) => void; entete?: React.ReactNode }) {
  const { c } = useTheme();
  const [rub, setRub] = useState<string | null>(null);
  const rubriques = useMemo(() => [...new Set(fiches.map(f => String(f.categorie || 'autre')))], [fiches]);
  const liste = fiches.filter(f => !rub || String(f.categorie || 'autre') === rub);
  return (
    <Ecran bas={40}>
      {entete ?? <Entete titre="Grammaire" sous="Fiches courtes, exemples sourcés" retour={retour} recherche={false} />}
      {rubriques.length > 1 && <Rangee>{[<Puce key="t" label="Tout" actif={!rub} onPress={() => setRub(null)} />, ...rubriques.map(r => <Puce key={r} label={RUBRIQUES[r] ?? r} actif={rub === r} onPress={() => setRub(r)} />)]}</Rangee>}
      {liste.length === 0 ? <EtatVide mascotte titre="Bientôt des fiches" texte="Les fiches de grammaire arrivent avec les prochaines unités." /> :
        liste.map(f => (
          <Carte key={f.id} onPress={() => ouvrir(f.id)} label={f.titre}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
            <Ic nom="grammaire" taille={24} couleur={c.accent} />
            <View style={{ flex: 1, gap: 2 }}><T v="carte">{f.titre}</T>{!!f.resume && <T v="petit" numberOfLines={2}>{f.resume}</T>}<T v="petit" style={{ color: c.discret }}>{RUBRIQUES[String(f.categorie || 'autre')] ?? f.categorie}</T></View>
            <Ic nom="suivant" taille={18} couleur={c.discret} />
          </View></Carte>
        ))}
    </Ecran>
  );
}

export function FicheGrammaire({ fiche, retour }: { fiche: Ligne | undefined; retour: () => void }) {
  const { c } = useTheme();
  const ia = useIaCours();
  const [explique, setExplique] = useState(false);
  if (!fiche) return <Ecran><Entete titre="Fiche introuvable" retour={retour} recherche={false} /></Ecran>;
  const blocs = String(fiche.contenu ?? '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const exemples = exemplesDe(fiche);
  return (
    <Ecran bas={40}>
      <Entete titre={fiche.titre} sous={RUBRIQUES[String(fiche.categorie || 'autre')]} retour={retour} recherche={false} />
      {!!fiche.resume && <T v="sousTitre">{fiche.resume}</T>}
      {blocs.map((b, i) => {
        const lignes = b.split('\n');
        // Tableau : toutes les lignes du bloc ont « | »
        if (lignes.length > 0 && lignes.every(l => l.includes('|'))) return (
          <Carte key={i} plat><View style={{ padding: 8 }}>
            {lignes.map((l, j) => <View key={j} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderTopWidth: j ? 1 : 0, borderColor: c.bord }}>
              {l.split('|').map((cel, k) => <T key={k} v="corps" style={{ flex: 1, fontStyle: k ? 'italic' : 'normal' }} fort={k === 0}>{cel.trim()}</T>)}
            </View>)}
          </View></Carte>
        );
        return <T key={i} v="corps">{b}</T>;
      })}
      {exemples.length > 0 && <><SectionTitre titre="Exemples" />{exemples.map((x, i) => (
        <Carte key={i} plat><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12 }}>
          <View style={{ flex: 1 }}><T v="carte" style={{ fontStyle: 'italic' }}>{x.myene}</T><T v="corps">{x.francais}</T></View>
          {!!x.audio && <Son audio={x.audio} lent />}
        </View></Carte>
      ))}</>}
      <T v="petit" style={{ color: c.discret }}>{[fiche.dialecte ? libelleDialecte(fiche.dialecte) : null, fiche.source ? `Source : ${fiche.source}` : null].filter(Boolean).join(' · ')}</T>
      {ia.raison !== 'enfant' && <Puce label="Kak'Igonjo m'explique" icone="info" onPress={() => setExplique(true)} />}
      {explique && <KakIgonjoFeuille visible onClose={() => setExplique(false)} titre={fiche.titre}
        consigne={`Explique-moi simplement cette fiche de grammaire myènè, « ${fiche.titre} » : ${String(fiche.contenu ?? '').slice(0, 1500)}. Exemples de la fiche : ${exemples.map(x => `${x.myene} = ${x.francais}`).join(' ; ')}. Source : ${fiche.source}. N'ajoute aucun mot myènè qui n'est ni dans la fiche ni dans le corpus.`}
        affiche={`Explique-moi « ${fiche.titre} ».`} />}
    </Ecran>
  );
}
