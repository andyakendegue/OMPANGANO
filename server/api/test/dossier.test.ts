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
