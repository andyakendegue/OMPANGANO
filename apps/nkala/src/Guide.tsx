import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MYENE, TEXTES_GUIDE } from '@nkala/noyau';
import { BlocsTexte, EcranModal } from './ui';
import { couleurs } from './theme';

export const CLE_GUIDE_VU = 'nkala_guide_visuel_vu_v1';
const ONGLETS = ['1. Objectifs', '2. Contribuer (3 étapes)', '3. Ethnies & Hors-ligne', '4. Badges & Défis'];

/** Guide visuel et objectifs : quatre pages, textes repris du site web. */
export function GuideModale({ visible, prenom, apresInscription, onClose, onAller }: {
  visible: boolean; prenom?: string; apresInscription?: boolean; onClose: () => void; onAller?: (cible: 'contribuer' | 'ezango' | 'classement' | 'profil') => void;
}) {
  const [page, setPage] = useState(0);
  const terminer = (cible?: 'contribuer' | 'ezango' | 'classement' | 'profil') => {
    AsyncStorage.setItem(CLE_GUIDE_VU, 'true').catch(() => {});
    setPage(0); onClose();
    if (cible) onAller?.(cible);
  };
  return (
    <EcranModal visible={visible}
      titre={prenom ? `${MYENE.MBOLO.mot}, ${prenom} ! Voici comment utiliser Nkala` : 'Objectifs & Guide Visuel de la Plateforme Nkala'}
      sousTitre={apresInscription ? `${MYENE.SALE.mot} ! Bienvenue à bord • Guide Visuel & Objectifs` : 'Guide Visuel Interactif & Objectifs Nkala'}
      onClose={() => terminer()}>
      <View style={s.onglets}>
        {ONGLETS.map((o, i) => (
          <Pressable key={o} onPress={() => setPage(i)} style={[s.onglet, page === i && s.ongletActif]}><Text style={[s.ongletTexte, page === i && { color: '#fff' }]}>{o}</Text></Pressable>
        ))}
      </View>
      <BlocsTexte blocs={TEXTES_GUIDE[String(page)] || []} onBouton={t => terminer(t.includes('Ethnie') ? 'ezango' : 'contribuer')} />
      <View style={s.pied}>
        <Pressable disabled={page === 0} onPress={() => setPage(p => p - 1)} style={[s.nav, page === 0 && { opacity: 0.4 }]}><Text style={s.navTexte}>Étape précédente</Text></Pressable>
        {page < ONGLETS.length - 1
          ? <Pressable onPress={() => setPage(p => p + 1)} style={[s.nav, s.navPlein]}><Text style={[s.navTexte, { color: '#fff' }]}>Étape suivante</Text></Pressable>
          : <Pressable onPress={() => terminer('contribuer')} style={[s.nav, s.navPlein]}><Text style={[s.navTexte, { color: '#fff' }]}>C'est compris, commencer !</Text></Pressable>}
      </View>
    </EcranModal>
  );
}

const s = StyleSheet.create({
  onglets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  onglet: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1 },
  ongletActif: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  ongletTexte: { color: couleurs.texte, fontSize: 12, fontWeight: '700' },
  pied: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  nav: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderColor: couleurs.bord, borderWidth: 1 },
  navPlein: { backgroundColor: couleurs.terre, borderColor: couleurs.terre },
  navTexte: { color: couleurs.texte, fontWeight: '800', fontSize: 13 },
});
