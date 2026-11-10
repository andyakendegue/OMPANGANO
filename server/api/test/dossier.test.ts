// Dossier de référence du RAG : ajout, modification, retrait, ignorés, injection dans le contexte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPgliteDb, runMigrations } from '../src/db.ts';
import { synchroniserDossier } from '../src/dossier.ts';
import { construireSysteme, fournisseurEmbeddingParDefaut } from '../src/ia.ts';

test('dossier : indexe, ne réindexe que le modifié, oublie le retiré, alimente le prompt', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'emb-'));
  const db = await createPgliteDb();
  await runMigrations(db);
  const embed = fournisseurEmbeddingParDefaut({} as any);
  const env = { EMBEDDINGS_DIR: dir } as any;
  try {
    await mkdir(path.join(dir, 'langue'));
    await writeFile(path.join(dir, 'langue', 'salutations.md'), '# Salutations\nMbolo signifie bonjour en myènè. On dit mbolo à toute personne rencontrée le matin au village.');
    await writeFile(path.join(dir, 'pirogues.txt'), 'La pirogue monoxyle est creusée dans un tronc de okoumé par les maîtres charpentiers de la lagune.');
    await writeFile(path.join(dir, 'image.png'), 'x');
    await writeFile(path.join(dir, '.cache'), 'caché');
    let r = await synchroniserDossier(db, embed, 'test', env);
    assert.equal(r.ajoutes, 2); assert.equal(r.ignores, 1); assert.deepEqual(r.erreurs, []);
    r = await synchroniserDossier(db, embed, 'test', env);
    assert.equal(r.inchanges, 2); assert.equal(r.ajoutes + r.modifies, 0);
    await writeFile(path.join(dir, 'pirogues.txt'), 'La pirogue monoxyle est creusée dans un tronc de okoumé. Version corrigée et complétée du document.');
    r = await synchroniserDossier(db, embed, 'test', env);
    assert.equal(r.modifies, 1); assert.equal(r.inchanges, 1);
    const { systeme, contexte } = await construireSysteme(db, embed, { message: 'que veut dire mbolo bonjour myènè', enfant: false });
    assert.ok(contexte.length >= 1); assert.match(systeme, /salutations/);
    await rm(path.join(dir, 'pirogues.txt'));
    r = await synchroniserDossier(db, embed, 'test', env);
    assert.equal(r.supprimes, 1);
    assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM ia_documents`))[0].n, 1);
  } finally { await rm(dir, { recursive: true, force: true }); await db.close(); }
});

import { importerLivres, metaDepuisNom } from '../src/livres.ts';
import { decouperChapitres, quizLecture } from '../../../packages/noyau/src/lecture.ts';

test('bibliothèque : import d\'un livre déposé, chapitres détectés, fiche conservée à la réimportation, quiz à trous', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bib-'));
  const db = await createPgliteDb(); await runMigrations(db);
  try {
    const para = 'La pirogue glissait doucement sur la lagune pendant que les pêcheurs chantaient leurs vieilles chansons. '.repeat(6);
    await mkdir(path.join(dir, 'conte'));
    await writeFile(path.join(dir, 'conte', 'Anonyme - Le grand voyage.txt'), `Chapitre I\n\n${para}\n\nChapitre II\n\n${para}\n\nChapitre III\n\n${para}`);
    assert.deepEqual(metaDepuisNom('conte/Anonyme - Le grand voyage.txt'), { auteur: 'Anonyme', titre: 'Le grand voyage', categorie: 'conte' });
    const env = { BIBLIOTHEQUE_DIR: dir, BIBLIOTHEQUE_RAG: 'non' } as any;
    let r = await importerLivres(db, null, env);
    assert.equal(r.ajoutes, 1); assert.equal(r.chapitres, 3); assert.deepEqual(r.erreurs, []);
    await db.query(`UPDATE contenus SET data = data || '{"resume":"Mon résumé"}'::jsonb WHERE collection = 'bibliotheque'`);
    r = await importerLivres(db, null, env);
    assert.equal(r.inchanges, 1);
    await writeFile(path.join(dir, 'conte', 'Anonyme - Le grand voyage.txt'), `Chapitre I\n\n${para}\n\nChapitre II\n\n${para}`);
    r = await importerLivres(db, null, env);
    assert.equal(r.modifies, 1); assert.equal(r.chapitres, 2);
    const fiche = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque'`))[0].data;
    assert.equal(fiche.resume, 'Mon résumé'); assert.equal(fiche.nb_chapitres, 2);
    assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = 'livre_chapitres'`))[0].n, 2);
  } finally { await rm(dir, { recursive: true, force: true }); await db.close(); }

  assert.equal(decouperChapitres('x'.repeat(40) + '\n\n' + 'Une phrase assez longue pour remplir. '.repeat(400)).length > 2, true);
  const texte = 'Le charpentier marchait lentement vers la forêt avant le lever du soleil sur la lagune. Les enfants ramassaient les copeaux de bois dans de grands paniers tressés. La pirogue flottait sans bruit, droite et fière, devant tout le village rassemblé. Chaque soir, il passait sa paume sur la coque pour sentir les défauts invisibles du bois.';
  const q = quizLecture(texte, 3);
  assert.ok(q.length >= 2); for (const x of q) { assert.equal(x.options.length, 4); assert.equal(x.options[x.bonne].toLowerCase(), x.mot.toLowerCase()); assert.match(x.enonce, /_____/); }
  assert.deepEqual(quizLecture(texte, 3), q, 'déterministe');
});
