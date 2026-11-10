import { fonctionActive, peutAcceder, RANGS, type Contenu, type MotifRefus, type RegleAvancee } from '@nkala/noyau';
import { useDroits, useRegle } from './Droits';
import { useGlobale } from './Globale';
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
export function Verrou({ contenu, children, onVoirOffres, regle }: { contenu: Contenu; children: React.ReactNode; onVoirOffres?: () => void; regle?: RegleAvancee | Record<string, any> | null }) {
  const juger = useRegle();
  const avance = regle ? juger(regle.rangMin !== undefined || regle.plans !== undefined ? { rang_min: (regle as RegleAvancee).rangMin, plans: (regle as RegleAvancee).plans } : regle) : null;
  const droits = useDroits();
  const { ouvrirBoutique } = useGlobale();
  const { c } = useTheme();
  const decision = peutAcceder(contenu, droits);
  if (decision.ok && (!avance || avance.ok)) return <>{children}</>;
  if (decision.ok && avance && !avance.ok) return (
    <Carte style={{ padding: 20, gap: 14, alignItems: 'center' }}>
      <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bordAmbre, alignItems: 'center', justifyContent: 'center' }}><Ic nom="verrou" taille={28} couleur={c.accent} /></View>
        <T v="sousTitre" style={{ textAlign: 'center' }}>{avance.motif === 'rang_requis' ? `Disponible à partir du rang « ${RANGS[Math.min(RANGS.length, avance.rangMin) - 1]?.nom ?? avance.rangMin} »` : 'Réservé à une formule d\'abonnement'}</T>
        <T v="petit" style={{ textAlign: 'center' }}>{avance.motif === 'rang_requis' ? 'Gagne de l\'XP en apprenant, en jouant et en contribuer pour monter de rang.' : 'Choisis une formule qui débloque ce contenu.'}</T>
      </View>
      {avance.motif === 'plan_requis' && <Bouton label="Voir les formules" variante="ambre" onPress={onVoirOffres ?? ouvrirBoutique} />}
    </Carte>
  );
  if (decision.ok) return <>{children}</>;
  const achatsOuverts = fonctionActive('achats');
  return (
    <Carte style={{ padding: 20, gap: 14, alignItems: 'center' }}>
      <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.fond2, borderWidth: 1, borderColor: c.bordAmbre, alignItems: 'center', justifyContent: 'center' }}><Ic nom="verrou" taille={28} couleur={c.accent} /></View>
        <T v="sousTitre" style={{ textAlign: 'center' }}>{MESSAGES[decision.motif]}</T>
        {!achatsOuverts && <T v="petit" style={{ textAlign: 'center' }}>Les offres arrivent bientôt.</T>}
      </View>
      {decision.motif !== 'role_requis' && <Bouton label={achatsOuverts ? 'Voir les offres' : 'Bientôt disponible'} desactive={!achatsOuverts} onPress={onVoirOffres ?? ouvrirBoutique} variante="ambre" />}
    </Carte>
  );
}
