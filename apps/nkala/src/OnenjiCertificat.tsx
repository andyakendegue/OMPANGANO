/**
 * Certificats d'Onenji (audit Apprendre §8.9) : numérotés par le serveur (NKL-AAAA-000123), vérifiables par un lien public,
 * partageables et téléchargeables (page HTML imprimable). Sans compte : certificat sur l'appareil, sans numéro.
 */
import { useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { mesCertificats, obtenirCertificat, urlApi, type CertificatOnenji, type Parcours } from '@nkala/noyau';
import { useAuth } from './AuthProvider';
import { Bouton, Carte, Chargement, Ecran, Entete, EtatVide, Mascotte, T, useToast } from './kit';
import { useTheme } from './Prefs';

const dateFr = (iso?: string) => new Date(iso ?? Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
export const lienVerification = (numero: string) => `${urlApi()}/pub/certificats/${encodeURIComponent(numero)}?format=html`;
const echapper = (t: string) => t.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** Page HTML du certificat, prête à imprimer ou à enregistrer en PDF depuis le navigateur. */
export function htmlCertificat(c: { nom: string; titre: string; le?: string; numero?: string | null }): string {
  const num = c.numero ? `<p class="num">N° ${echapper(c.numero)}</p><p class="petit">Vérifier : ${echapper(lienVerification(c.numero))}</p>` : '<p class="petit">Certificat sans numéro (obtenu sans compte).</p>';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Certificat · ${echapper(c.titre)}</title>
<style>@page{size:A4 landscape;margin:12mm}body{margin:0;font-family:Georgia,serif;background:#FDFAF7;color:#170D08}main{box-sizing:border-box;max-width:1000px;margin:24px auto;padding:48px;border:6px double #B84A28;border-radius:24px;text-align:center}
h1{font-size:30px;letter-spacing:.08em;text-transform:uppercase;color:#B84A28;margin:0 0 24px}.nom{font-size:40px;margin:12px 0}.parcours{font-size:28px;color:#B84A28;font-style:italic;margin:12px 0}p{font-size:18px;margin:8px 0}.num{font-family:monospace;font-size:18px;margin-top:28px}.petit{font-size:12px;color:#6B4B3A;word-break:break-all}</style></head>
<body><main><h1>Certificat de réussite</h1><p>Onenji · Nkala</p><p class="nom">${echapper(c.nom || 'Apprenant·e Nkala')}</p><p>a terminé le parcours</p><p class="parcours">${echapper(c.titre)}</p><p>le ${dateFr(c.le)}</p>${num}</main></body></html>`;
}

async function telechargerCertificat(c: { nom: string; titre: string; le?: string; numero?: string | null }) {
  const html = htmlCertificat(c);
  const nom = `certificat-${(c.numero ?? c.titre).replace(/[^A-Za-z0-9-]+/g, '-').toLowerCase()}.html`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  const f = new File(Paths.cache, nom);
  if (f.exists) f.delete();
  f.create(); f.write(html);
  await Sharing.shareAsync(f.uri, { mimeType: 'text/html', dialogTitle: 'Enregistrer ou imprimer le certificat', UTI: 'public.html' });
}

export function Certificat({ parcours, onFermer }: { parcours: Parcours; onFermer: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { profil } = useAuth();
  const [cert, setCert] = useState<CertificatOnenji | null>(null);
  const [etat, setEtat] = useState<'charge' | 'pret' | 'local'>(profil ? 'charge' : 'local');
  const nom = profil?.fullName || profil?.displayName || '';
  useEffect(() => {
    if (!profil) return;
    obtenirCertificat(parcours.id).then(r => { setCert(r); setEtat('pret'); }).catch(e => { setEtat('local'); if ((e as { status?: number }).status !== 0) toast((e as Error).message, 'info'); });
  }, [parcours.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (etat === 'charge') return <Ecran><Chargement /></Ecran>;
  const donnees = { nom: cert?.nom ?? nom, titre: cert?.titre ?? parcours.titre, le: cert?.le, numero: cert?.numero ?? null };
  return (
    <Ecran>
      <Carte style={{ padding: 28, alignItems: 'center', gap: 12, borderWidth: 2, borderColor: c.accent }}>
        <Mascotte taille={90} humeur="content" />
        <T v="libelle">Certificat de réussite</T>
        <T v="titre" style={{ textAlign: 'center' }}>{donnees.nom || 'Apprenant·e Nkala'}</T>
        <T v="corps" style={{ textAlign: 'center' }}>a terminé le parcours</T>
        <T v="sousTitre" couleur={c.accent} style={{ textAlign: 'center' }}>{donnees.titre}</T>
        <T v="petit">{dateFr(donnees.le)} · Onenji, Nkala</T>
        {donnees.numero ? <T v="carte" style={{ fontVariant: ['tabular-nums'] }}>N° {donnees.numero}</T>
          : <T v="petit" style={{ textAlign: 'center' }}>{profil ? 'Numéro indisponible hors ligne : rouvre le certificat avec du réseau.' : 'Connecte-toi pour obtenir un certificat numéroté et vérifiable.'}</T>}
      </Carte>
      <Bouton label="Partager" icone="partage" onPress={async () => {
        const lien = donnees.numero ? ` Vérifier : ${lienVerification(donnees.numero)}` : '';
        try { await Share.share({ message: `J'ai terminé le parcours « ${donnees.titre} » sur Nkala (Onenji) le ${dateFr(donnees.le)}.${donnees.numero ? ` Certificat n° ${donnees.numero}.` : ''}${lien}` }); } catch { toast('Partage impossible.', 'erreur'); }
      }} />
      <Bouton label="Télécharger (à imprimer)" icone="telecharger" variante="fantome" onPress={() => telechargerCertificat(donnees).catch(() => toast('Téléchargement impossible.', 'erreur'))} />
      <Bouton label="Fermer" variante="fantome" onPress={onFermer} />
    </Ecran>
  );
}

/** « Mes certificats » : ceux attribués par le serveur au compte. */
export function MesCertificats({ retour, ouvrir }: { retour: () => void; ouvrir: (parcoursId: string) => void }) {
  const { profil } = useAuth();
  const [liste, setListe] = useState<CertificatOnenji[] | null>(null);
  useEffect(() => { if (profil) mesCertificats().then(setListe).catch(() => setListe([])); else setListe([]); }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Ecran bas={40}>
      <Entete titre="Mes certificats" retour={retour} recherche={false} />
      {liste === null ? <Chargement /> : liste.length === 0 ? <EtatVide mascotte titre="Pas encore de certificat" texte={profil ? 'Valide toutes les unités d\'une étape pour obtenir son certificat.' : 'Connecte-toi : les certificats numérotés sont liés à ton compte.'} /> :
        liste.map(x => (
          <Carte key={x.numero} onPress={() => ouvrir(x.parcoursId)} label={`Certificat ${x.titre}`}><View style={{ padding: 16, gap: 4 }}>
            <T v="carte">{x.titre}</T><T v="petit">N° {x.numero} · {dateFr(x.le)}</T>
          </View></Carte>
        ))}
    </Ecran>
  );
}
