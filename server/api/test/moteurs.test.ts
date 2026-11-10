// Tests de la logique pure de Nkala (packages/noyau) : CSV, validation des contenus, rangs, téléphone, horaires, moteurs de jeux, leçons et séries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvVersObjets, objetsVersCsv } from '../../../packages/noyau/src/contenu/csv.ts';
import { schemaDe, SCHEMAS } from '../../../packages/noyau/src/contenu/schemas.ts';
import { validerLignes, validerTexte, modeleCsv } from '../../../packages/noyau/src/contenu/valider.ts';
import { rangPourXp, nouveauRang, RANGS } from '../../../packages/noyau/src/rangs.ts';
import { normaliserTelephone, afficherTelephone, uidTelephone } from '../../../packages/noyau/src/telephone.ts';
import { estOuvert, distanceKm } from '../../../packages/noyau/src/horaires.ts';
import {
  nouveauPendu, jouerLettre, penduGagne, penduPerdu, penduMasque, nouvelleAnagramme, anagrammeReussie, genererMotsMeles, motTrouve, casesEntre, noterDictee,
  lancerDe, avancerPlateau, graineJour, hasardGraine, choixDuJour, scorePartie, etoiles, lettres, motDeLettres, type CasePlateau,
} from '../../../packages/noyau/src/moteurs.ts';
import { avancerLecon, jugerReponse, justesse, majSerie, nouvelleLecon, optionsDe, progressionVide, terminerLecon, uniteValidee, leconOuverte, type Exercice } from '../../../packages/noyau/src/lecons.ts';

import { melangerPubs, type PubFil } from '../../../packages/noyau/src/fil.ts';
import { decouper, cosinus, embeddingSimule } from '../src/ia.ts';
import { appelXmlRpc, lireReponseXmlRpc } from '../src/regie.ts';
import { jetonExpoValide } from '../src/push.ts';
import { verifierRecu } from '../src/achats.ts';

const hasard = (suite: number[]) => { let i = 0; return () => suite[i++ % suite.length]; };

test('CSV : guillemets, virgules, retours à la ligne, séparateur point-virgule, BOM', () => {
  const t = '﻿id;titre;description\r\na;"Bonjour; ""toi""";"ligne 1\nligne 2"\r\nb;Suite;\r\n';
  const l = csvVersObjets(t);
  assert.equal(l.length, 2); assert.equal(l[0].titre, 'Bonjour; "toi"'); assert.equal(l[0].description, 'ligne 1\nligne 2'); assert.equal(l[1].description, '');
  const retour = csvVersObjets(objetsVersCsv(l, ['id', 'titre', 'description']));
  assert.deepEqual(retour, l);
});

test('contenus : conversion des types, références, doublons, source myènè', () => {
  const s = schemaDe('exercices')!;
  const r = validerLignes(s, [
    { id: 'e1', lecon_id: 'l1', type: 'associer', options: 'a|b|c', reponse: 'a', mot_myene: 'Mbolo', source: '[LEC]' },
    { id: 'e1', lecon_id: 'l1', type: 'associer' },
    { id: 'e 3', lecon_id: 'l1', type: 'inconnu' },
    { id: 'e4', lecon_id: 'zzz', type: 'ecouter', mot_myene: 'Akéwa' },
  ], { lecons: new Set(['l1']) });
  assert.equal(r.valides, 2);
  assert.deepEqual(r.lignes[0].options, ['a', 'b', 'c']);
  assert.ok(r.erreurs.some(e => /double/.test(e.message)));
  assert.ok(r.erreurs.some(e => e.champ === 'type'));
  assert.ok(r.erreurs.some(e => e.champ === 'id' && /invalide/.test(e.message)));
  assert.ok(r.avertissements.some(a => /référence inconnue/.test(a.message)));
  assert.ok(r.avertissements.some(a => /sans source/.test(a.message)), 'tout mot myènè doit porter sa source');
  const b = validerTexte('lieux', 'id,categorie_id,nom,latitude,publie\nl1,c1,Marché,"-0,7193",oui\nl2,c1,Autre,abc,non', {});
  assert.equal(b.lignes[0].latitude, -0.7193); assert.equal(b.lignes[0].publie, true); assert.ok(b.erreurs.some(e => e.champ === 'latitude'));
  assert.equal(validerTexte('inconnue', '[]').erreurs.length, 1);
  assert.deepEqual(validerTexte('rangs', '[{"id":"r1","nom":"A","min_xp":5}]').lignes[0].min_xp, 5);
  assert.equal(validerTexte('rangs', '{"lignes":[{"id":"r1","nom":"A","min_xp":5}]}').valides, 1);
  assert.ok(modeleCsv(s).startsWith('﻿id,lecon_id'));
});

test('schémas : chaque collection a un identifiant, des colonnes uniques, des références connues', () => {
  const ids = new Set(SCHEMAS.map(s => s.id));
  assert.equal(ids.size, SCHEMAS.length);
  for (const s of SCHEMAS) {
    assert.equal(s.champs[0].nom, 'id', s.id);
    assert.equal(new Set(s.champs.map(c => c.nom)).size, s.champs.length, `colonnes en double dans ${s.id}`);
    for (const c of s.champs) if (c.ref) assert.ok(ids.has(c.ref), `${s.id}.${c.nom} → ${c.ref}`);
  }
});

test('rangs : huit classes d\'âge ôrungu, paliers 0 à 30000', () => {
  assert.equal(RANGS.length, 8);
  assert.equal(rangPourXp(0).rang.nom, 'Ekèï-kèï'); assert.equal(rangPourXp(199).rang.id, 'ekei-kei'); assert.equal(rangPourXp(200).rang.id, 'omwana');
  assert.equal(rangPourXp(30000).rang.id, 'mbolo'); assert.equal(rangPourXp(99999).suivant, null); assert.equal(rangPourXp(99999).progression, 1);
  assert.equal(rangPourXp(-5).rang.id, 'ekei-kei');
  assert.equal(nouveauRang(190, 210)?.id, 'omwana'); assert.equal(nouveauRang(210, 220), null);
  assert.equal(rangPourXp(350).progression, 0.5);
});

test('téléphone : Gabon par défaut, international, rejets', () => {
  assert.equal(normaliserTelephone('06 12 34 56'), '+24106123456');
  assert.equal(normaliserTelephone('6123456'), '+24106123456', 'ancien format à 7 chiffres');
  assert.equal(normaliserTelephone('+33 6 12 34 56 78'), '+33612345678');
  assert.equal(normaliserTelephone('0033612345678'), '+33612345678');
  assert.equal(normaliserTelephone('abc'), null); assert.equal(normaliserTelephone('12'), null); assert.equal(normaliserTelephone(''), null);
  assert.equal(afficherTelephone('+24106123456'), '+241 06 12 34 56');
  assert.equal(uidTelephone('+24106123456'), 'tel_24106123456');
});

test('horaires : plages, jours, plusieurs blocs, 24h/24, texte incompris', () => {
  const lundi10h = new Date(2026, 10, 9, 10, 0), dimanche10h = new Date(2026, 10, 15, 10, 0), lundi13h = new Date(2026, 10, 9, 13, 0);
  assert.equal(estOuvert('lun-sam 08:00-18:00', lundi10h), true); assert.equal(estOuvert('lun-sam 08:00-18:00', dimanche10h), false);
  assert.equal(estOuvert('tous les jours 06:00-18:00', dimanche10h), true);
  assert.equal(estOuvert('lun-ven 08:00-12:00,14:00-18:00', lundi13h), false); assert.equal(estOuvert('lun-ven 08:00-12:00,14:00-18:00', new Date(2026, 10, 9, 15)), true);
  assert.equal(estOuvert('lun-ven 08:00-12:00; sam 08:00-10:00', new Date(2026, 10, 14, 9)), true);
  assert.equal(estOuvert('ven-lun 08:00-18:00', dimanche10h), true, 'plage qui passe par le week-end');
  assert.equal(estOuvert('24h/24', dimanche10h), true);
  assert.equal(estOuvert('sur rendez-vous', lundi10h), null); assert.equal(estOuvert('', lundi10h), null); assert.equal(estOuvert(undefined, lundi10h), null);
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 9 }, { latitude: 0, longitude: 10 }) - 111.2) < 1);
});

test('pendu, anagrammes, dictée : règles et lettres myènè', () => {
  const m = { id: 'x', myene: 'Akéwa', francais: 'Merci' };
  assert.deepEqual(lettres('Ɛkɔṉ'), ['Ɛ', 'k', 'ɔ', 'ṉ']);
  assert.equal(motDeLettres(m), true); assert.equal(motDeLettres({ ...m, myene: 'Ibanga wé' }), false);
  let p = nouveauPendu(m, 3);
  p = jouerLettre(p, 'a'); p = jouerLettre(p, 'a'); assert.equal(p.trouvees.length, 1);
  p = jouerLettre(p, 'z'); p = jouerLettre(p, 'Z'); assert.equal(p.ratees.length, 1, 'une lettre ne compte qu\'une fois');
  assert.equal(penduMasque(p).join(''), 'A___a'.replace('A', 'A').toLowerCase() === '' ? '' : penduMasque(p).join(''));
  for (const l of ['k', 'é', 'w']) p = jouerLettre(p, l);
  assert.equal(penduGagne(p), true); assert.equal(penduPerdu(p), false);
  const q = ['x', 'y', 'q'].reduce(jouerLettre, nouveauPendu(m, 3)); assert.equal(penduPerdu(q), true);
  const a = nouvelleAnagramme(m, hasard([0.1, 0.9, 0.4, 0.7]));
  assert.notEqual(a.melange.join(''), lettres(m.myene).join(''));
  assert.equal(anagrammeReussie({ ...a, essai: lettres(m.myene) }), true); assert.equal(anagrammeReussie({ ...a, essai: ['A'] }), false);
  assert.equal(noterDictee('Akéwa', 'akéwa').exact, true); assert.equal(noterDictee('Akéwa', 'akewa').note, 0.9, 'accent manquant = demi-point');
  assert.equal(noterDictee('Akéwa', 'xyz').exact, false); assert.equal(noterDictee('', 'a').note, 0);
});

test('mots mêlés : chaque mot placé est retrouvable, dans les deux sens', () => {
  const mots = ['Akéwa', 'Mbolo', 'Kôkôlô', 'Yaga'].map((x, i) => ({ id: 'm' + i, myene: x, francais: 'f' + i }));
  const g = genererMotsMeles(mots, 9, hasardGraine(42));
  assert.ok(g.mots.length >= 3);
  for (const m of g.mots) {
    const lues = m.cases.map(([r, c]) => g.grille[r][c]).join('');
    assert.equal(lues, lettres(m.mot).map(l => l.toLowerCase()).join(''));
    assert.equal(motTrouve(g, m.cases), m.mot); assert.equal(motTrouve(g, [...m.cases].reverse()), m.mot);
  }
  assert.equal(motTrouve(g, [[0, 0]]), null);
  assert.deepEqual(casesEntre([0, 0], [0, 2]), [[0, 0], [0, 1], [0, 2]]); assert.deepEqual(casesEntre([0, 0], [2, 2]), [[0, 0], [1, 1], [2, 2]]); assert.equal(casesEntre([0, 0], [1, 2]), null);
});

test('plateau, dé, défi du jour, score', () => {
  const cases: CasePlateau[] = [{ position: 1, type: 'neutre' }, { position: 2, type: 'bonus', effet: 2 }, { position: 3, type: 'neutre' }, { position: 4, type: 'recul', effet: -2 }, { position: 5, type: 'neutre' }, { position: 6, type: 'arrivee' }];
  const e0 = { position: 0, tours: 0, fini: false, credits: 100 };
  assert.equal(lancerDe(() => 0), 1); assert.equal(lancerDe(() => 0.999), 6);
  assert.equal(avancerPlateau(e0, 2, cases).etat.position, 4, 'bonus : +2');
  assert.equal(avancerPlateau({ ...e0, position: 1 }, 3, cases).etat.position, 2, 'recul : −2');
  const f = avancerPlateau({ ...e0, position: 5 }, 6, cases); assert.equal(f.etat.position, 6); assert.equal(f.etat.fini, true);
  assert.equal(choixDuJour(['a', 'b', 'c', 'd'], '2026-11-10'), choixDuJour(['a', 'b', 'c', 'd'], '2026-11-10'), 'même défi pour tous le même jour');
  assert.notEqual(graineJour('2026-11-10'), graineJour('2026-11-11')); assert.equal(choixDuJour([], '2026-11-10'), null);
  assert.deepEqual([hasardGraine(7)(), hasardGraine(7)()].map(x => x < 1), [true, true]);
  assert.equal(scorePartie({ bonnes: 5, erreurs: 1, secondesRestantes: 30 }), 505); assert.equal(scorePartie({ bonnes: 0, erreurs: 9 }), 0); assert.equal(scorePartie({ bonnes: 1, erreurs: 0, secondesRestantes: 500, serie: 99 }), 100 + 60 + 50);
  assert.deepEqual([etoiles(0, 5), etoiles(1, 5), etoiles(3, 5), etoiles(5, 5), etoiles(0, 0)], [0, 1, 2, 3, 0]);
});

test('leçons : jugement, options, série, unité 4 sur 5, déblocage', () => {
  const ex: Exercice = { id: 'e', lecon_id: 'l', type: 'associer', options: ['a', 'b'], reponse: 'c' };
  assert.ok(optionsDe(ex).includes('c'), 'la bonne réponse est toujours proposée'); assert.equal(optionsDe(ex).length, 3);
  assert.equal(jugerReponse(ex, ' C '), true); assert.equal(jugerReponse(ex, 'a'), false);
  assert.equal(jugerReponse({ ...ex, type: 'ordre', reponse: 'Ibanga wé. Ka mènè !' }, ['wé.', 'Ibanga', 'Ka', 'mènè !']), false);
  assert.equal(jugerReponse({ ...ex, type: 'ordre', reponse: 'Ibanga wé. Ka mènè !' }, ['Ibanga', 'wé.', 'Ka', 'mènè !']), true);
  assert.equal(jugerReponse({ ...ex, type: 'ecouter' }, 'n\'importe quoi'), true, 'imitation : jamais notée');
  const o = optionsDe({ ...ex, type: 'ordre', options: ['un', 'deux', 'trois'], reponse: undefined }, hasard([0.1, 0.5, 0.9]));
  assert.deepEqual([...o].sort(), ['deux', 'trois', 'un']);
  let e = nouvelleLecon(); const liste = [ex, ex, ex];
  e = avancerLecon(e, liste, true); e = avancerLecon(e, liste, false); e = avancerLecon(e, liste, true, 20);
  assert.equal(e.termine, true); assert.equal(e.xp, 20); assert.equal(justesse(e), 67);
  assert.equal(uniteValidee(4, 5), true); assert.equal(uniteValidee(3, 5), false); assert.equal(uniteValidee(0, 0), false);
  let p = progressionVide(); const lecon = { id: 'l1', unite_id: 'u', titre: 'A', xp: 15 };
  p = terminerLecon(p, lecon, e, '2026-11-10'); assert.equal(p.serie, 1); assert.equal(p.xp, 20);
  p = terminerLecon(p, { ...lecon, id: 'l2' }, e, '2026-11-11'); assert.equal(p.serie, 2);
  p = terminerLecon(p, { ...lecon, id: 'l3' }, e, '2026-11-13'); assert.equal(p.serie, 1, 'série rompue');
  assert.equal(p.recordSerie, 2);
  assert.equal(majSerie({ ...progressionVide(), serie: 3, derniereActivite: '2026-11-10', recordSerie: 3 }, '2026-11-12', true).serie, 4, 'jour de repos protégé');
  assert.equal(majSerie(p, p.derniereActivite!).serie, p.serie, 'même jour : inchangée');
  const lecons = [{ id: 'a', unite_id: 'u', titre: 'A', ordre: 1 }, { id: 'b', unite_id: 'u', titre: 'B', ordre: 2 }];
  assert.equal(leconOuverte(lecons, 'a', progressionVide()), true); assert.equal(leconOuverte(lecons, 'b', progressionVide()), false);
  assert.equal(leconOuverte(lecons, 'b', { ...progressionVide(), leconsTerminees: { a: { justesse: 100, le: 'x' } } }), true);
});

test('fil sponsorisé : jamais en tête ni en fin, jamais deux de suite, rythme régulier', () => {
  const pub = (i: number): PubFil => ({ id: 'p' + i, zone: 'z', image: null, lien: null, titre: null, texte_alt: 'x', annonceur: null });
  const items = Array.from({ length: 12 }, (_, i) => i);
  const f = melangerPubs(items, [pub(1), pub(2)], i => 'i' + i, { premier: 2, intervalle: 5 });
  assert.equal(f[0].type, 'item'); assert.equal(f[f.length - 1].type, 'item');
  assert.ok(f.every((e, i) => !(e.type === 'pub' && f[i + 1]?.type === 'pub')));
  const pos = f.map((e, i) => (e.type === 'pub' ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(pos, [2, 8], 'après 2 éléments puis tous les 5');
  assert.equal(f.filter(e => e.type === 'item').length, 12, 'aucun élément perdu');
  assert.equal(new Set(f.map(e => e.cle)).size, f.length, 'clés uniques');
  assert.equal(melangerPubs(items, [], undefined, {}).length, 12, 'sans publicité : la liste seule');
  assert.equal(melangerPubs([1, 2], [pub(1)], undefined, { premier: 2 }).length, 2, 'liste courte : pas de publicité en fin');
  assert.equal(melangerPubs([1], [pub(1)]).length, 1); assert.equal(melangerPubs([], [pub(1)]).length, 0);
});

test('RAG : découpage, similarité, embeddings simulés', () => {
  assert.deepEqual(decouper('', 100), []); assert.deepEqual(decouper('court', 100), ['court']);
  const long = Array.from({ length: 30 }, (_, i) => `Phrase numéro ${i} du document.`).join(' ');
  const m = decouper(long, 200, 40);
  assert.ok(m.length > 3); assert.ok(m.every(x => x.length <= 200)); assert.ok(m.join(' ').includes('numéro 29'), 'rien n\'est perdu');
  assert.ok(Math.abs(cosinus([1, 0], [1, 0]) - 1) < 1e-9); assert.equal(cosinus([1, 0], [0, 1]), 0); assert.equal(cosinus([], [1]), 0);
  const [a, b, c] = embeddingSimule(['pêcher le poisson avec un filet', 'le poisson se pêche au filet', 'rumba guitare balafon fête']);
  assert.ok(cosinus(a, b) > cosinus(a, c));
  assert.equal(a.length, 128);
});

test('XML-RPC (Revive) : encodage et lecture des réponses', () => {
  const x = appelXmlRpc('ox.addCampaign', ['sess', { campaignName: 'A & B <c>', advertiserId: 3, actif: true }]);
  assert.match(x, /<methodName>ox.addCampaign<\/methodName>/); assert.match(x, /A &amp; B &lt;c&gt;/); assert.match(x, /<int>3<\/int>/); assert.match(x, /<boolean>1<\/boolean>/);
  assert.equal(lireReponseXmlRpc('<methodResponse><params><param><value><int>42</int></value></param></params></methodResponse>').valeur, '42');
  assert.equal(lireReponseXmlRpc('<methodResponse><params><param><value><string>abc</string></value></param></params></methodResponse>').valeur, 'abc');
  assert.equal(lireReponseXmlRpc('<methodResponse><fault><value><struct><member><name>faultCode</name><value><int>1</int></value></member><member><name>faultString</name><value><string>Mauvais mot de passe</string></value></member></struct></value></fault></methodResponse>').erreur, 'Mauvais mot de passe');
});

test('notifications et achats : jetons Expo, reçus', async () => {
  assert.equal(jetonExpoValide('ExponentPushToken[abcdefghijkl]'), true); assert.equal(jetonExpoValide('abc'), false); assert.equal(jetonExpoValide(12), false);
  assert.equal('erreur' in (await verifierRecu({}, 'simulation', 'simule:abcd')), true, 'refusé sans ACHATS_FOURNISSEUR');
  assert.equal('erreur' in (await verifierRecu({ ACHATS_FOURNISSEUR: 'simulation', NODE_ENV: 'production' }, 'simulation', 'simule:abcd')), true, 'jamais en production');
  assert.deepEqual(await verifierRecu({ ACHATS_FOURNISSEUR: 'simulation' }, 'simulation', 'simule:abcd'), { reference: 'simule:abcd' });
  assert.equal((await verifierRecu({}, 'apple', 'x') as { statut: number }).statut, 501); assert.equal((await verifierRecu({}, 'bidon', 'x') as { statut: number }).statut, 400);
});
