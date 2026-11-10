import { fonctionActive, peutAcceder, type Contenu, type MotifRefus } from '@nkala/noyau';
import { useDroits } from './Droits';
import { Bouton, Carte, Ic, T } from './kit';
import { useTheme } from './Prefs';
import { View } from 'react-native';

const MESSAGES: Record<MotifRefus, string> = {
  abonnement_requis: 'Ce contenu est réservé aux abonnés.',
  achat_requis: 'Ce contenu s\'achète à l\'unité.',
  role_requis: 'Ce contenu est réservé à certains profils.',
  expire: 'Ton accès à ce contenu a expiré.',
};

/**
 * Cadenas des contenus à accès payant (NKALA_AUDIT_COMPLET.md §10bis.2, écran 98). Affiche le contenu si le droit existe, sinon une proposition.
 * Cette vérification ne sert qu'à l'affichage : le serveur refuse de toute façon le contenu, la clé ou la licence sans le droit.
 */
export function Verrou({ contenu, children, onVoirOffres }: { contenu: Contenu; children: React.ReactNode; onVoirOffres?: () => void }) {
  const droits = useDroits();
  const { c } = useTheme();
  const decision = peutAcceder(contenu, droits);
  if (decision.ok) return <>{children}</>;
  const achatsOuverts = fonctionActive('achats');
  return (
    <Carte style={{ padding: 20, gap: 14, alignItems: 'center' }}>
      <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bordAmbre, alignItems: 'center', justifyContent: 'center' }}><Ic nom="verrou" taille={28} couleur={c.accent} /></View>
        <T v="sousTitre" style={{ textAlign: 'center' }}>{MESSAGES[decision.motif]}</T>
        {!achatsOuverts && <T v="petit" style={{ textAlign: 'center' }}>Les offres arrivent bientôt.</T>}
      </View>
      {decision.motif !== 'role_requis' && <Bouton label={achatsOuverts ? 'Voir les offres' : 'Bientôt disponible'} desactive={!achatsOuverts} onPress={onVoirOffres} variante="ambre" />}
    </Carte>
  );
}
