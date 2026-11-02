import React, { useEffect, useState } from 'react';
import { api } from '../data/api';

interface Stats {
  jours: number;
  resume: { sessions: number; visiteurs: number; duree_moyenne_s: number; connectees: number };
  parJour: { jour: string; sessions: number; visiteurs: number; duree_moyenne_s: number }[];
  parPays: { cle: string; n: number }[];
  parAppareil: { cle: string; n: number }[];
  parSysteme: { cle: string; n: number }[];
  parNavigateur: { cle: string; n: number }[];
  parOnglet: { cle: string; n: number }[];
  recentes: { started_at: string; ip: string | null; country: string | null; device_type: string | null; os: string | null; browser: string | null; screen: string | null; duration_s: number; user_id: string | null }[];
}

const NOM_ONGLET: Record<string, string> = {
  crowdsource: 'Contribuer', explore: 'Ezango', leaderboard: 'Classement', validator: 'Validation', admin: 'Administration', profile: 'Profil'
};
const NOM_PAYS = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }); } catch { return null; } })();
const pays = (c?: string | null) => (c && c !== 'inconnu' ? (NOM_PAYS?.of(c) || c) : 'Inconnu');
export const duree = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

const Barres: React.FC<{ titre: string; lignes: { cle: string; n: number }[]; nom?: (c: string) => string }> = ({ titre, lignes, nom }) => {
  const max = Math.max(1, ...lignes.map(l => l.n));
  return (
    <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-2">
      <h3 className="text-sm font-bold text-white">{titre}</h3>
      {lignes.length === 0 && <p className="text-xs text-[#a8826d]">Aucune donnée.</p>}
      {lignes.map(l => (
        <div key={l.cle} className="text-xs">
          <div className="flex justify-between text-[#fed7aa]"><span>{nom ? nom(l.cle) : l.cle}</span><span className="font-mono">{l.n}</span></div>
          <div className="h-1.5 rounded bg-[#27150c] mt-0.5"><div className="h-1.5 rounded bg-[#f59e0b]" style={{ width: `${(l.n / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
};

export const StatistiquesVisites: React.FC = () => {
  const [jours, setJours] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    let vivant = true;
    setErreur('');
    api<Stats>('GET', `/v1/admin/analytics?days=${jours}`)
      .then(s => { if (vivant) setStats(s); })
      .catch(e => { if (vivant) setErreur(e?.message || 'Statistiques indisponibles.'); });
    return () => { vivant = false; };
  }, [jours]);

  if (erreur) return <p className="text-sm text-[#fca5a5] p-4">{erreur}</p>;
  if (!stats) return <p className="text-sm text-[#a8826d] p-4">Chargement des statistiques…</p>;
  const maxJour = Math.max(1, ...stats.parJour.map(j => j.sessions));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-white">Fréquentation du site</h2>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(j => (
            <button key={j} onClick={() => setJours(j)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${jours === j ? 'bg-[#f59e0b] text-[#180d07]' : 'bg-[#27150c] text-[#d4af94]'}`}>{j} jours</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Visites (sessions)', stats.resume.sessions],
          ['Visiteurs uniques', stats.resume.visiteurs],
          ['Temps moyen par session', duree(stats.resume.duree_moyenne_s)],
          ['Sessions connectées', stats.resume.connectees]
        ].map(([t, v]) => (
          <div key={String(t)} className="p-3.5 bg-[#180d07] rounded-2xl border border-[#4a2412]">
            <span className="text-[11px] text-[#a8826d] block">{t}</span>
            <span className="text-xl font-bold text-amber-400">{v}</span>
          </div>
        ))}
      </div>
      <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412]">
        <h3 className="text-sm font-bold text-white mb-2">Visites par jour</h3>
        {stats.parJour.length === 0 ? <p className="text-xs text-[#a8826d]">Aucune donnée.</p> : (
          <div className="flex items-end gap-1 h-28 overflow-x-auto">
            {stats.parJour.map(j => (
              <div key={j.jour} className="flex flex-col items-center justify-end h-full min-w-[14px] flex-1" title={`${j.jour} : ${j.sessions} visites, ${j.visiteurs} visiteurs, ${duree(j.duree_moyenne_s)} en moyenne`}>
                <div className="w-full rounded-t bg-[#c85a32]" style={{ height: `${Math.max(4, (j.sessions / maxJour) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Barres titre="Onglets consultés" lignes={stats.parOnglet} nom={c => NOM_ONGLET[c] || c} />
        <Barres titre="Pays d'origine" lignes={stats.parPays} nom={pays} />
        <Barres titre="Type d'appareil" lignes={stats.parAppareil} />
        <Barres titre="Système" lignes={stats.parSysteme} />
        <Barres titre="Navigateur" lignes={stats.parNavigateur} />
      </div>
      <div className="p-4 bg-[#180d07] rounded-2xl border border-[#4a2412] space-y-2">
        <h3 className="text-sm font-bold text-white">100 dernières sessions</h3>
        <p className="text-[10px] text-[#a8826d]">Les adresses IP sont des données personnelles : à ne pas diffuser.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-[#fed7aa]">
            <thead><tr className="text-left text-[#a8826d]"><th className="pr-3">Date</th><th className="pr-3">IP</th><th className="pr-3">Pays</th><th className="pr-3">Appareil</th><th className="pr-3">Durée</th><th>Compte</th></tr></thead>
            <tbody>
              {stats.recentes.map((r, i) => (
                <tr key={i} className="border-t border-[#27150c]">
                  <td className="pr-3 whitespace-nowrap">{new Date(r.started_at).toLocaleString('fr-FR')}</td>
                  <td className="pr-3 font-mono">{r.ip || '—'}</td>
                  <td className="pr-3">{pays(r.country)}</td>
                  <td className="pr-3 whitespace-nowrap">{[r.device_type, r.os, r.browser].filter(Boolean).join(' · ')}</td>
                  <td className="pr-3 whitespace-nowrap">{duree(r.duration_s)}</td>
                  <td>{r.user_id ? 'connecté' : 'visiteur'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
