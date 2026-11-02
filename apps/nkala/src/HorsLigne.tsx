import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { synchroniserCatalogue } from '@nkala/noyau';
import { catalogue } from './catalogue';
import { listerFile, rejouerFile } from './fileAttente';
import { EcranModal } from './ui';
import { couleurs } from './theme';

type Bandeau = { type: 'error' | 'success'; text: string } | null;

/** Mode hors-ligne et synchronisation : pack complet du catalogue sur l'appareil, file d'attente des contributions. */
export function HorsLigneModale({ visible, onClose, onChange }: { visible: boolean; onClose: () => void; onChange?: () => void }) {
  const [enLigne, setEnLigne] = useState(true);
  const [nb, setNb] = useState(0);
  const [file, setFile] = useState<{ id: string; texte: string; avecVoix: boolean; date: string }[]>([]);
  const [bandeau, setBandeau] = useState<Bandeau>(null);
  const [progres, setProgres] = useState<number | null>(null);
  const [confirmerVidage, setConfirmerVidage] = useState(false);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => NetInfo.addEventListener(e => setEnLigne(e.isConnected !== false)), []);
  const charger = useCallback(async () => { setNb(await catalogue.compter()); setFile(await listerFile()); }, []);
  useEffect(() => { if (visible) { setBandeau(null); setConfirmerVidage(false); charger(); } }, [visible, charger]);

  const telecharger = async () => {
    if (!enLigne) return setBandeau({ type: 'error', text: 'Une connexion internet active est requise pour télécharger le pack complet.' });
    setBandeau(null); setOccupe(true); setProgres(0);
    const r = await synchroniserCatalogue(catalogue, p => setProgres(Math.round((p.fait / Math.max(1, p.total)) * 100)));
    setProgres(null); setOccupe(false); await charger(); onChange?.();
    setBandeau(r.ok
      ? { type: 'success', text: 'Pack hors-ligne téléchargé et prêt pour le mode avion.' }
      : { type: 'error', text: 'Erreur lors du téléchargement du pack hors-ligne : connexion interrompue (la reprise se fera là où elle s’est arrêtée).' });
  };
  const synchroniser = async () => {
    if (!enLigne) return setBandeau({ type: 'error', text: 'Impossible de synchroniser sans connexion internet. Vos données restent en sécurité sur cet appareil.' });
    setBandeau(null); setOccupe(true);
    await rejouerFile();
    const restant = (await listerFile()).length;
    setOccupe(false); await charger(); onChange?.();
    setBandeau(restant === 0 ? { type: 'success', text: 'Synchronisation terminée avec succès !' } : { type: 'error', text: 'Certaines données restent en attente de réseau.' });
  };
  const vider = async () => { await catalogue.vider(); setConfirmerVidage(false); await charger(); onChange?.(); setBandeau({ type: 'success', text: 'Le pack hors-ligne a été vidé.' }); };

  return (
    <EcranModal visible={visible} titre="Mode Hors-Ligne & Synchronisation" sousTitre="Contribuez sans interruption, même sans réseau" onClose={onClose}>
      {bandeau && <Text style={bandeau.type === 'success' ? s.ok : s.erreur}>{bandeau.text}</Text>}
      <Text style={enLigne ? s.ok : s.erreur}>{enLigne ? 'Connexion active (Synchronisation automatique activée)' : 'Mode Hors-ligne (Toutes vos actions sont sauvegardées localement)'}</Text>

      <View style={s.carte}>
        <Text style={s.titre}>Pack Nkala Local  {nb > 0 ? 'Téléchargé & Actif' : 'Cache automatique actif'}</Text>
        <Text style={s.texte}>Téléchargez l’intégralité des expressions, images et prononciations dans la mémoire de votre appareil. Vous pourrez naviguer, ajouter des favoris, valider et enregistrer vos audios au village ou en mode avion.</Text>
        <Text style={s.discret}>Contenu : {nb.toLocaleString('fr-FR')} phrases</Text>
        {progres !== null && <Text style={s.texte}>Téléchargement… {progres}%</Text>}
        <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={telecharger} disabled={occupe}>
          {occupe && progres !== null ? <ActivityIndicator color="#fff" /> : <Text style={s.boutonTexte}>{nb > 0 ? 'Mettre à jour le pack hors-ligne' : 'Télécharger le pack complet (Phrases & Images)'}</Text>}
        </Pressable>
        {confirmerVidage ? (
          <View style={{ gap: 8 }}>
            <Text style={s.texte}>Vider le cache hors-ligne ?</Text>
            <View style={s.ligne}>
              <Pressable style={[s.bouton, { flex: 1, backgroundColor: '#991b1b' }]} onPress={vider}><Text style={s.boutonTexte}>Confirmer</Text></Pressable>
              <Pressable style={[s.bouton2, { flex: 1 }]} onPress={() => setConfirmerVidage(false)}><Text style={s.boutonTexte}>Annuler</Text></Pressable>
            </View>
          </View>
        ) : nb > 0 && <Pressable onPress={() => setConfirmerVidage(true)}><Text style={s.danger}>Vider le cache hors-ligne</Text></Pressable>}
      </View>

      <View style={s.carte}>
        <Text style={s.titre}>File d'Attente de Synchronisation  {file.length} en attente</Text>
        {file.length === 0 && <Text style={s.texte}>Aucune donnée en attente. Toutes vos contributions, favoris, validations et points XP sont synchronisés.</Text>}
        {file.map(f => (
          <View key={f.id} style={s.element}>
            <Text style={s.texte} numberOfLines={1}>{f.texte}</Text>
            <Text style={s.discret}>{f.avecVoix ? 'avec voix · ' : ''}{new Date(f.date).toLocaleString('fr-FR')}</Text>
          </View>
        ))}
        <Pressable style={[s.bouton, occupe && { opacity: 0.6 }]} onPress={synchroniser} disabled={occupe}><Text style={s.boutonTexte}>Synchroniser automatiquement maintenant</Text></Pressable>
      </View>
    </EcranModal>
  );
}

const s = StyleSheet.create({
  carte: { backgroundColor: couleurs.carte, borderColor: couleurs.bord, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  ligne: { flexDirection: 'row', gap: 8 },
  titre: { color: couleurs.texteClair, fontSize: 15, fontWeight: '800' },
  texte: { color: couleurs.texte, fontSize: 13, lineHeight: 19 },
  discret: { color: couleurs.discret, fontSize: 12 },
  ok: { color: '#86efac', fontSize: 13, fontWeight: '600' },
  erreur: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  danger: { color: '#fca5a5', fontSize: 13, fontWeight: '700' },
  element: { backgroundColor: couleurs.fond, borderRadius: 10, padding: 8 },
  bouton: { backgroundColor: couleurs.terre, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  bouton2: { borderColor: couleurs.bord, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
});
