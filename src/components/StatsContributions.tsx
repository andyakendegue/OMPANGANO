import React, { useEffect, useState } from 'react';
import { api } from '../data/api';

interface Groupe { contributions: number; approuvees: number; enregistrements: number; heures: number; heuresApprouvees: number; contributeurs: number }
interface Stats extends Groupe {
  parStatut: Record<string, number>;
  periode: { aujourdhui: number; septJours: number; trenteJours: number };
  questions: { total: number; avecContribution: number; avecContributionApprouvee: number };
  parEthnie: Record<string, Groupe>;
  parTheme: Record<string, Groupe>;
  topContributeurs: { nom: string; contributions: number; heures: number }[];
}

const heures = (h: number) => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
const nomEthnie = (e: string) => (e === 'inconnue' ? 'Autre / non renseignée' : e);

const Tuile = ({ n, t, sous }: { n: string | number; t: string; sous?: string }) => (
  <div className="p-4 bg-[#27150c] border border-[#4a2412] rounded-2xl">
    <div className="text-xs font-semibold text-[#f59e0b] mb-1">{t}</div>
    <div className="text-2xl font-black text-white">{typeof n === 'number' ? n.toLocaleString('fr-FR') : n}</div>
    {sous && <div className="text-[11px] text-[#a8826d]">{sous}</div>}
  </div>
);

function Tableau({ titre, groupes, libelle }: { titre: string; groupes: Record<string, Groupe>; libelle?: (k: string) => string }) {
  const lignes = Object.entries(groupes).sort((a, b) => b[1].contributions - a[1].contributions);
  return (
    <div className="bg-[#180d07] border border-[#3b1d10] rounded-2xl p-4 overflow-x-auto">
      <h4 className="text-sm font-bold text-white mb-2">{titre}</h4>
      <table className="w-full text-xs text-[#d4af94]">
        <thead><tr className="text-left text-[#a8826d]"><th className="py-1 pr-2">Nom</th><th className="pr-2">Contrib.</th><th className="pr-2">Validées</th><th className="pr-2">Heures</th><th>Contributeurs</th></tr></thead>
        <tbody>
          {lignes.map(([k, g]) => (
            <tr key={k} className="border-t border-[#3b1d10]">
              <td className="py-1 pr-2 text-white">{libelle ? libelle(k) : k}</td><td className="pr-2">{g.contributions}</td>
              <td className="pr-2">{g.approuvees}</td><td className="pr-2">{heures(g.heures)}</td><td>{g.contributeurs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const StatsContributions: React.FC = () => {
  const [s, setS] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => { api<Stats>('GET', '/v1/admin/contribution-stats').then(setS).catch(e => setErreur(e.message)); }, []);
  if (erreur) return <div className="text-xs text-red-300">Statistiques indisponibles : {erreur}</div>;
  if (!s) return <div className="text-xs text-[#a8826d]">Chargement des statistiques…</div>;
  const q = s.questions;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tuile n={s.contributions} t="Contributions" sous={`${s.periode.aujourdhui} aujourd’hui · ${s.periode.septJours} sur 7 j · ${s.periode.trenteJours} sur 30 j`} />
        <Tuile n={heures(s.heures)} t="Heures enregistrées" sous={`${s.enregistrements} enregistrements · ${heures(s.heuresApprouvees)} validées`} />
        <Tuile n={`${q.avecContribution} / ${q.total}`} t="Questions couvertes" sous={`${q.avecContributionApprouvee} avec une contribution validée`} />
        <Tuile n={s.contributeurs} t="Contributeurs actifs" sous={`${s.approuvees} contributions validées`} />
      </div>
      <Tableau titre="Par ethnie" groupes={s.parEthnie} libelle={nomEthnie} />
      <Tableau titre="Par thème" groupes={s.parTheme} />
      <div className="bg-[#180d07] border border-[#3b1d10] rounded-2xl p-4">
        <h4 className="text-sm font-bold text-white mb-2">Meilleurs contributeurs</h4>
        {s.topContributeurs.map((u, i) => (
          <div key={i} className="flex justify-between text-xs text-[#d4af94] border-t border-[#3b1d10] py-1">
            <span className="text-white">{i + 1}. {u.nom}</span><span>{u.contributions} contrib. · {heures(u.heures)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
