/**
 * Horaires d'ouverture d'un lieu, écrits comme dans la collection « lieux » : « lun-sam 08:00-18:00 », « tous les jours 06:00-18:00 »,
 * « lun-ven 08:00-12:00,14:00-18:00 ; sam 08:00-12:00 », « 24h/24 ». Renvoie null si le texte n'est pas compris (on n'affiche alors ni ouvert ni fermé).
 */
const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

const minutes = (h: string): number | null => { const m = /^(\d{1,2})(?::|h)(\d{2})?$/.exec(h.trim()); return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null; };

export function estOuvert(horaires: string | null | undefined, quand: Date = new Date()): boolean | null {
  const t = (horaires ?? '').trim().toLowerCase();
  if (!t) return null;
  if (/24\s*h\s*\/\s*24|24h24/.test(t)) return true;
  const jour = quand.getDay(), mn = quand.getHours() * 60 + quand.getMinutes();
  let compris = false, ouvert = false;
  for (const bloc of t.split(';')) {
    const m = /^\s*(tous les jours|[a-zé]{3}(?:\s*-\s*[a-zé]{3})?)\s+(.+)$/.exec(bloc);
    if (!m) continue;
    let jours: number[];
    if (m[1] === 'tous les jours') jours = [0, 1, 2, 3, 4, 5, 6];
    else {
      const [a, b] = m[1].split('-').map(x => JOURS.indexOf(x.trim().slice(0, 3)));
      if (a < 0 || (m[1].includes('-') && b < 0)) continue;
      jours = []; let i = a; const fin = m[1].includes('-') ? b : a;
      for (let k = 0; k < 8; k++) { jours.push(i); if (i === fin) break; i = (i + 1) % 7; }
    }
    for (const plage of m[2].split(',')) {
      const [d, f] = plage.split('-').map(x => minutes(x));
      if (d === null || f === null || d === undefined || f === undefined) continue;
      compris = true;
      if (jours.includes(jour) && mn >= d && mn < f) ouvert = true;
    }
  }
  return compris ? ouvert : null;
}

/** Distance à vol d'oiseau en kilomètres (formule de haversine). */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
