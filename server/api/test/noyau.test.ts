// Tests des gabarits transversaux de packages/noyau (accès, publicité, jetons, interrupteurs de modules).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peutAcceder, abonne } from '../../../packages/noyau/src/acces.ts';
import { zoneAffichable, profilAgeDepuis, type ContextePub } from '../../../packages/noyau/src/publicite.ts';
import { verifierQuota, estimerJetons } from '../../../packages/noyau/src/jetons.ts';
import { appliquerModules, moduleActif, fonctionActive } from '../../../packages/noyau/src/modules.ts';

const T = 1_000_000;

test('accès : libre, gratuit avec pub, abonnement, achat, essai, location, rôle', () => {
  assert.deepEqual(peutAcceder({ id: 'a', acces: 'libre' }, null, T), { ok: true, avecPub: false });
  assert.deepEqual(peutAcceder({ id: 'a', acces: 'gratuit_avec_pub' }, null, T), { ok: true, avecPub: true });
  assert.deepEqual(peutAcceder({ id: 'a', acces: 'gratuit_avec_pub' }, { abonneJusque: T + 1 }, T), { ok: true, avecPub: false }, 'l\'abonné ne voit plus de publicité');
  assert.deepEqual(peutAcceder({ id: 'a', acces: 'abonnement' }, null, T), { ok: false, motif: 'abonnement_requis' });
  assert.equal(abonne({ abonneJusque: T }, T), false, 'abonnement échu à l\'instant exact');
  assert.deepEqual(peutAcceder({ id: 'c', acces: 'achat' }, { abonneJusque: T + 1 }, T), { ok: false, motif: 'achat_requis' }, 'un abonnement n\'ouvre pas un achat à l\'unité');
  assert.equal(peutAcceder({ id: 'c', acces: 'achat' }, { achats: ['c'] }, T).ok, true);
  assert.deepEqual(peutAcceder({ id: 'e', acces: 'essai' }, { essais: { e: T - 1 } }, T), { ok: false, motif: 'expire' });
  assert.equal(peutAcceder({ id: 'e', acces: 'essai' }, { essais: { e: T + 1 } }, T).ok, true);
  assert.deepEqual(peutAcceder({ id: 'l', acces: 'location' }, { locations: { l: T - 5 } }, T), { ok: false, motif: 'expire' });
  assert.equal(peutAcceder({ id: 'r', acces: 'reserve', roles: ['admin'] }, { role: 'admin' }, T).ok, true);
  assert.deepEqual(peutAcceder({ id: 'r', acces: 'reserve', roles: ['admin'] }, { role: 'user' }, T), { ok: false, motif: 'role_requis' });
});

test('publicité : toutes les raisons de s\'abstenir', () => {
  const ok: ContextePub = { active: true, abonne: false, profil: 'adulte', enLigne: true, activiteEnCours: false };
  assert.equal(zoneAffichable('bandeau_accueil', ok), true);
  assert.equal(zoneAffichable('bandeau_accueil', { ...ok, active: false }), false, 'interrupteur serveur');
  assert.equal(zoneAffichable('bandeau_accueil', { ...ok, abonne: true }), false);
  assert.equal(zoneAffichable('bandeau_accueil', { ...ok, enLigne: false }), false);
  assert.equal(zoneAffichable('bandeau_apprendre', { ...ok, activiteEnCours: true }), false, 'jamais pendant un exercice');
  assert.equal(zoneAffichable('bandeau_accueil', { ...ok, profil: 'enfant' }), false);
  assert.equal(zoneAffichable('bandeau_apprendre', { ...ok, profil: 'enfant' }), false, 'aucune publicité Onenji pour les enfants');
  assert.equal(zoneAffichable('enfants_contextuel', { ...ok, profil: 'enfant' }), false, 'décision ouverte : fermé par défaut');
});

test('jetons : quotas vérifiés avant l\'appel, le plus strict l\'emporte', () => {
  const q = { parJour: 1000, parMois: 10000, parConversation: 400 };
  assert.deepEqual(verifierQuota(q, { jour: 0, mois: 0, conversation: 0 }, 100), { ok: true, restantJour: 900, restantMois: 9900, alerte: false });
  assert.equal(verifierQuota(q, { jour: 0, mois: 0, conversation: 350 }, 100).ok, false);
  assert.deepEqual(verifierQuota(q, { jour: 950, mois: 0, conversation: 0 }, 100), { ok: false, limite: 'jour', restant: 0 });
  assert.deepEqual(verifierQuota(q, { jour: 0, mois: 9950, conversation: 0 }, 100), { ok: false, limite: 'mois', restant: 0 });
  const v = verifierQuota(q, { jour: 700, mois: 0, conversation: 0 }, 150);
  assert.equal(v.ok && v.alerte, true, 'alerte à 80 %');
  assert.equal(estimerJetons('abc'), 1);
  assert.equal(estimerJetons(''), 0);
});

test('modules : le serveur remplace les valeurs de départ ; la salle des paris suit Azeva', () => {
  appliquerModules({ modules: { ontci: true, azeva: true }, fonctions: { salleParis: true, publicite: true }, inconnu: 1 } as any);
  assert.equal(moduleActif('ontci'), true);
  assert.equal(fonctionActive('publicite'), true);
  assert.equal(fonctionActive('salleParis'), true);
  appliquerModules({ modules: { azeva: false } });
  assert.equal(fonctionActive('salleParis'), false, 'Azeva fermé : salle des paris fermée');
  appliquerModules(null);
});

test('profil d\'âge : date absente ou illisible = enfant (aucune publicité)', () => {
  const now = Date.parse('2026-11-09');
  assert.equal(profilAgeDepuis(undefined, now), 'enfant');
  assert.equal(profilAgeDepuis('n\'importe quoi', now), 'enfant');
  assert.equal(profilAgeDepuis('2016-01-01', now), 'enfant');
  assert.equal(profilAgeDepuis('2011-01-01', now), 'ado');
  assert.equal(profilAgeDepuis('1990-05-05', now), 'adulte');
});
