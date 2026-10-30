// Tests des règles de sécurité Firestore / RTDB / Storage d'OMPANGANO.
// Lancer : npx firebase emulators:exec --only firestore,database,storage --project demo-ompangano "node tests/rules.test.mjs"
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref as dbRef, set as dbSet, update as dbUpdate, get as dbGet } from 'firebase/database';
import { ref as stRef, uploadBytes } from 'firebase/storage';

const env = await initializeTestEnvironment({
  projectId: 'demo-ompangano',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  database: { rules: readFileSync('database.rules.json', 'utf8') },
  storage: { rules: readFileSync('storage.rules', 'utf8') }
});

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '→', e.message?.slice(0, 200)); }
}

const base = { displayName: 'X', fullName: 'X', tribe: 'Ôrungu', registrationCompleted: true };
const newUser = { ...base, role: 'user', status: 'active', xp: 0, levelIndex: 1, badges: [], contributionsCount: 0, recordingsCount: 0, validationsCount: 0, suspicionScore: 0 };

await env.withSecurityRulesDisabled(async (ctx) => {
  const fs = ctx.firestore();
  await setDoc(doc(fs, 'users/alice'), { ...newUser, xp: 100 });
  await setDoc(doc(fs, 'users/bob'), { ...newUser, xp: 50 });
  await setDoc(doc(fs, 'users/val'), { ...newUser, role: 'validator' });
  await setDoc(doc(fs, 'users/adm'), { ...newUser, role: 'admin' });
  await setDoc(doc(fs, 'admins/adm'), { role: 'admin' });
  await setDoc(doc(fs, 'contributions/c1'), { userId: 'alice', status: 'pending', rewardedXp: 0 });
  await setDoc(doc(fs, 'contributions/c2'), { userId: 'val', status: 'pending' });
  await setDoc(doc(fs, 'items/i1'), { frenchText: 'Merci', myeneText: 'Akéwa' });
  const db = ctx.database();
  await dbSet(dbRef(db, 'users/alice'), { ...newUser, xp: 100, badges: { 0: 'b' } });
  await dbSet(dbRef(db, 'users/val'), { ...newUser, role: 'validator' });
  await dbSet(dbRef(db, 'admins/adm'), { role: 'admin' });
  await dbSet(dbRef(db, 'contributions/c1'), { userId: 'alice', status: 'pending' });
});

const alice = env.authenticatedContext('alice', { email: 'alice@x.com', firebase: { sign_in_provider: 'password' } });
const badmin = env.authenticatedContext('eve', { email: 'badminton.admin@gmail.com', email_verified: true, firebase: { sign_in_provider: 'password' } });
const anon = env.authenticatedContext('anon', { firebase: { sign_in_provider: 'anonymous' } });
const val = env.authenticatedContext('val', { firebase: { sign_in_provider: 'password' } });
const adm = env.authenticatedContext('adm', { firebase: { sign_in_provider: 'password' } });
const superA = env.authenticatedContext('capp', { email: 'andymigoumbi@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });

console.log('Firestore');
await t('anonyme ne lit pas les items', () => assertFails(getDoc(doc(anon.firestore(), 'items/i1'))));
await t('connecté lit les items', () => assertSucceeds(getDoc(doc(alice.firestore(), 'items/i1'))));
await t('contributeur ne modifie pas un item', () => assertFails(setDoc(doc(alice.firestore(), 'items/i1'), { myeneText: 'x' }, { merge: true })));
await t('contributeur ne se donne pas le rôle admin', () => assertFails(setDoc(doc(alice.firestore(), 'users/alice'), { role: 'admin' }, { merge: true })));
await t('contributeur ne change pas ses XP', () => assertFails(setDoc(doc(alice.firestore(), 'users/alice'), { xp: 99999 }, { merge: true })));
await t('contributeur modifie son village', () => assertSucceeds(setDoc(doc(alice.firestore(), 'users/alice'), { villageOfOrigin: 'Ozouri' }, { merge: true })));
await t('contributeur ne lit pas le profil d’un autre', () => assertFails(getDoc(doc(alice.firestore(), 'users/bob'))));
await t('contributeur ne liste pas les profils', () => assertFails(getDocs(collection(alice.firestore(), 'users'))));
await t('validateur lit les profils', () => assertSucceeds(getDocs(collection(val.firestore(), 'users'))));
await t('« badminton.admin@ » n’est pas admin', () => assertFails(setDoc(doc(badmin.firestore(), 'admins/eve'), { role: 'admin' })));
await t('création de compte avec XP gonflés refusée', () => assertFails(setDoc(doc(badmin.firestore(), 'users/eve'), { ...newUser, xp: 500 })));
await t('création de compte normale acceptée', () => assertSucceeds(setDoc(doc(badmin.firestore(), 'users/eve'), newUser)));
await t('contribution au nom d’un autre refusée', () => assertFails(setDoc(doc(alice.firestore(), 'contributions/x1'), { userId: 'bob', status: 'pending' })));
await t('contribution déjà « approved » refusée', () => assertFails(setDoc(doc(alice.firestore(), 'contributions/x2'), { userId: 'alice', status: 'approved' })));
await t('contribution en attente acceptée', () => assertSucceeds(setDoc(doc(alice.firestore(), 'contributions/x3'), { userId: 'alice', status: 'pending' })));
await t('contributeur supprime sa contribution en attente', () => assertSucceeds(deleteDoc(doc(alice.firestore(), 'contributions/x3'))));
await t('validateur valide la contribution d’un autre', () => assertSucceeds(setDoc(doc(val.firestore(), 'contributions/c1'), { status: 'approved', rewardedXp: 50 }, { merge: true })));
await t('validateur ne valide pas sa propre contribution', () => assertFails(setDoc(doc(val.firestore(), 'contributions/c2'), { status: 'approved' }, { merge: true })));
await t('validateur attribue des XP à un contributeur', () => assertSucceeds(setDoc(doc(val.firestore(), 'users/alice'), { xp: 150, contributionsCount: 1 }, { merge: true })));
await t('validateur ne change pas le rôle d’un contributeur', () => assertFails(setDoc(doc(val.firestore(), 'users/alice'), { role: 'admin' }, { merge: true })));
await t('validateur ne se donne pas d’XP', () => assertFails(setDoc(doc(val.firestore(), 'users/val'), { xp: 9999 }, { merge: true })));
await t('admin change un rôle', () => assertSucceeds(setDoc(doc(adm.firestore(), 'users/bob'), { role: 'validator' }, { merge: true })));
await t('super-admin (adresse exacte) écrit admins', () => assertSucceeds(setDoc(doc(superA.firestore(), 'admins/capp'), { role: 'admin' })));
await t('classement : chiffres faux refusés', () => assertFails(setDoc(doc(alice.firestore(), 'leaderboard/alice'), { xp: 99999, levelIndex: 1, contributionsCount: 1, recordingsCount: 0, validationsCount: 0, badgesCount: 0 })));
await t('classement : chiffres exacts acceptés', () => assertSucceeds(setDoc(doc(alice.firestore(), 'leaderboard/alice'), { xp: 150, levelIndex: 1, contributionsCount: 1, recordingsCount: 0, validationsCount: 0, badgesCount: 0 })));

console.log('Realtime Database');
await t('RTDB : contributeur ne lit pas la liste des profils', () => assertFails(dbGet(dbRef(alice.database(), 'users'))));
await t('RTDB : contributeur lit son profil', () => assertSucceeds(dbGet(dbRef(alice.database(), 'users/alice'))));
await t('RTDB : contributeur ne change pas son rôle', () => assertFails(dbUpdate(dbRef(alice.database(), 'users/alice'), { role: 'admin' })));
await t('RTDB : contributeur ne change pas ses XP', () => assertFails(dbUpdate(dbRef(alice.database(), 'users/alice'), { xp: 99999 })));
await t('RTDB : contributeur modifie son village', () => assertSucceeds(dbUpdate(dbRef(alice.database(), 'users/alice'), { villageOfOrigin: 'Ozouri', updatedAt: 'x' })));
await t('RTDB : création de compte par défaut', () => assertSucceeds(dbUpdate(dbRef(badmin.database(), 'users/eve'), { displayName: 'E', role: 'user', xp: 0, levelIndex: 1 })));
await t('RTDB : « badminton.admin@ » n’écrit pas admins', () => assertFails(dbSet(dbRef(badmin.database(), 'admins/eve'), { role: 'admin' })));
await t('RTDB : anonyme n’écrit pas de contribution', () => assertFails(dbSet(dbRef(anon.database(), 'contributions/z'), { userId: 'anon', status: 'pending' })));
await t('RTDB : validateur valide la contribution d’alice', () => assertSucceeds(dbUpdate(dbRef(val.database(), 'contributions/c1'), { status: 'approved' })));
await t('RTDB : contributeur ne modifie pas les items', () => assertFails(dbSet(dbRef(alice.database(), 'items/i9'), { a: 1 })));

console.log('Storage');
const audio = new Uint8Array([1, 2, 3]);
await t('Storage : envoi dans son dossier', () => assertSucceeds(uploadBytes(stRef(alice.storage(), 'recordings/alice/i1_1.webm'), audio, { contentType: 'audio/webm' })));
await t('Storage : envoi dans le dossier d’un autre refusé', () => assertFails(uploadBytes(stRef(alice.storage(), 'recordings/bob/i1_1.webm'), audio, { contentType: 'audio/webm' })));
await t('Storage : fichier non audio refusé', () => assertFails(uploadBytes(stRef(alice.storage(), 'recordings/alice/x.html'), audio, { contentType: 'text/html' })));

await env.cleanup();
console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
