/**
 * Mes relevés (décision de Capp du 15 nov. 2026) : un bénéficiaire d'un contrat (contributeur spécial, créateur, professeur,
 * association) voit ses relevés trimestriels validés : chaque part, son assiette, son taux, la retenue, le report et le versement.
 * Rien ne s'affiche pour un compte qui n'est pas bénéficiaire.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { mesReleves, type ReleveApi } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Carte, SectionTitre, T } from './kit';
import { useTheme } from './Prefs';

const F = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`;

export function MesReleves() {
  const { c } = useTheme();
  const { profil } = useAuth();
  const [liste, setListe] = useState<ReleveApi[]>([]);
  useEffect(() => { if (profil) mesReleves().then(setListe).catch(() => setListe([])); }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!liste.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionTitre titre="Mes relevés de reversements" />
      {liste.map(r => (
        <Carte key={r.id} plat><View style={{ padding: 12, gap: 4 }}>
          <T v="carte">{r.trimestre} · {F(r.a_payer_fcfa)}{r.statut === 'paye' ? ' versés' : ' à verser'}</T>
          {r.detail.map((p, i) => <T key={i} v="petit">{p.libelle} : {F(p.assiette)} × {Math.round(p.taux * 10000) / 100} % = {F(p.montant)}</T>)}
          <T v="petit" couleur={c.discret}>Brut {F(r.brut_fcfa)}{r.report_entrant ? ` · report ${F(r.report_entrant)}` : ''}{r.retenue_fcfa ? ` · retenue ${F(r.retenue_fcfa)}` : ''}{r.report_sortant ? ` · reporté au trimestre suivant ${F(r.report_sortant)}` : ''}{r.reference_versement ? ` · versement ${r.reference_versement}` : ''}</T>
        </View></Carte>
      ))}
    </View>
  );
}
