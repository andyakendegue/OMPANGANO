/** Équipements et services du catalogue : saisie en puces (case, quantité, choix) et affichage groupé avec icônes. */
import { Pressable, View } from 'react-native';
import { CATALOGUE_LOGEMENT, equipementsGroupes, type ItemEquipement } from '@nkala/noyau';
import { Carte, Ic, Puce, T } from '../kit';
import { useTheme } from '../Prefs';

type Valeurs = Record<string, true | number | string>;

function Compteur({ valeur, onChange, label }: { valeur: number; onChange: (n: number) => void; label: string }) {
  const { c } = useTheme();
  const b = (txt: string, d: number, a11y: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={() => onChange(Math.max(0, valeur + d))} hitSlop={6}
      style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: c.bord, alignItems: 'center', justifyContent: 'center', backgroundColor: c.carte }}>
      <T v="carte">{txt}</T>
    </Pressable>
  );
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{b('−', -1, `Moins de ${label}`)}<T v="carte" style={{ minWidth: 24, textAlign: 'center' }}>{valeur}</T>{b('+', 1, `Plus de ${label}`)}</View>;
}

function Ligne({ it, v, set }: { it: ItemEquipement; v: true | number | string | undefined; set: (x: true | number | string | undefined) => void }) {
  const { c } = useTheme();
  if (it.type === 'bool') return <Puce label={it.label} icone={it.icon} actif={v === true} onPress={() => set(v === true ? undefined : true)} />;
  if (it.type === 'number') {
    const n = typeof v === 'number' ? v : 0;
    if (!n) return <Puce label={it.label} icone={it.icon} onPress={() => set(1)} />;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: c.accent, width: '100%' }}>
        <Ic nom={it.icon} taille={18} couleur={c.accent} /><T v="corps" fort style={{ flex: 1 }}>{it.label}</T>
        <Compteur valeur={n} label={it.label} onChange={x => set(x > 0 ? x : undefined)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 6, width: '100%' }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ic nom={it.icon} taille={18} couleur={v ? c.accent : c.discret} /><T v="corps" fort>{it.label}</T></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {it.options?.map(o => <Puce key={o.id} label={o.label} actif={v === o.id} onPress={() => set(v === o.id ? undefined : o.id)} />)}
      </View>
    </View>
  );
}

export function SaisieEquipements({ valeurs, onChange }: { valeurs: Valeurs; onChange: (v: Valeurs) => void }) {
  const { c } = useTheme();
  const set = (id: string, x: true | number | string | undefined) => { const n = { ...valeurs }; if (x === undefined) delete n[id]; else n[id] = x; onChange(n); };
  return (
    <View style={{ gap: 14 }}>
      {CATALOGUE_LOGEMENT.groupes.map(g => {
        const nb = g.items.filter(i => valeurs[i.id] !== undefined).length;
        return (
          <Carte key={g.id} plat><View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ic nom={g.icon} taille={20} couleur={c.accent} /><T v="carte" style={{ flex: 1 }}>{g.label}</T>{nb > 0 && <T v="petit" couleur={c.accent}>{nb}</T>}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {g.items.map(it => <Ligne key={it.id} it={it} v={valeurs[it.id]} set={x => set(it.id, x)} />)}
            </View>
          </View></Carte>
        );
      })}
    </View>
  );
}

/** Seulement ce qui est coché, groupé comme le catalogue (« Climatisation · 3 », « Compteur : Prépayé »). */
export function AffichageEquipements({ valeurs }: { valeurs?: Valeurs }) {
  const { c } = useTheme();
  const groupes = equipementsGroupes(valeurs);
  if (!groupes.length) return <T v="petit">Aucun équipement indiqué.</T>;
  return (
    <View style={{ gap: 12 }}>
      {groupes.map(g => (
        <View key={g.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Ic nom={g.icon} taille={18} couleur={c.accent} /><T v="libelle">{g.label}</T></View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {g.coches.map(i => {
              const alerte = i.id === 'zone_inondable' && valeurs?.[i.id] !== 'jamais';
              return (
                <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: alerte ? c.erreur + '22' : c.carte, borderWidth: 1, borderColor: alerte ? c.erreur : c.bord }}>
                  <Ic nom={i.icon} taille={16} couleur={alerte ? c.erreur : c.texte} /><T v="petit" couleur={alerte ? c.erreur : c.texte}>{i.texte}</T>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
