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

import { embeddingSimule } from '../src/ia.ts';

test('bibliothèque : service d\'embeddings en panne = textes importés, une seule erreur, indexation refaite au passage suivant ; noms en collision ; sommaires ignorés', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bib2-'));
  const db = await createPgliteDb(); await runMigrations(db);
  try {
    const para = 'Le présent texte fixe les règles applicables à la pêche artisanale dans les eaux de la lagune et sur le littoral. '.repeat(5);
    const long = 'Arrete N 230 MEF du 29 12 1972 fixant la liste des produits exoneres de la taxe';
    await mkdir(path.join(dir, 'a')); await mkdir(path.join(dir, 'b'));
    for (let i = 1; i <= 5; i++) await writeFile(path.join(dir, 'a', `Texte officiel numero ${i}.md`), `# Texte ${i}\n\n${para}`);
    await writeFile(path.join(dir, 'a', `${long} sur le sucre__1.md`), para);
    await writeFile(path.join(dir, 'b', `${long} sur le sel__2.md`), para);
    await writeFile(path.join(dir, 'a', 'INDEX.md'), para);
    await writeFile(path.join(dir, 'b', 'INDEX.md'), para);
    let appels = 0;
    const panne = { nom: 'panne', modele: 'x', embed: async () => { appels++; throw new Error('embeddings openai 504'); } };
    const env = { BIBLIOTHEQUE_DIR: dir } as any;
    let r = await importerLivres(db, panne, env);
    assert.equal(r.ajoutes, 7, 'les 7 textes sont importés malgré la panne, sans les sommaires INDEX.md');
    assert.equal(r.erreurs.length, 1, JSON.stringify(r.erreurs)); assert.match(r.erreurs[0].message, /indisponible/);
    assert.equal(appels, 3, 'le service est coupé après 3 échecs de suite');
    assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM contenus WHERE collection = 'bibliotheque' AND (data->>'rag_fait')::boolean IS NOT TRUE`))[0].n, 7);
    const fichiers = (await db.query<any>(`SELECT data->>'fichier' AS f FROM contenus WHERE collection = 'bibliotheque'`)).map(x => x.f);
    assert.equal(new Set(fichiers).size, 7, 'deux titres longs identiques sur 50 signes gardent chacun leur fiche');
    // Le service revient : rien n'est réimporté, mais chaque texte est indexé.
    const ok = { nom: 'ok', modele: 'x', embed: async (t: string[]) => embeddingSimule(t) };
    r = await importerLivres(db, ok, env);
    assert.equal(r.ajoutes + r.modifies, 0); assert.equal(r.reindexes, 7); assert.deepEqual(r.erreurs, []);
    r = await importerLivres(db, ok, env);
    assert.equal(r.inchanges, 7); assert.equal(r.reindexes ?? 0, 0);
    assert.ok((await db.query<any>(`SELECT count(*)::int AS n FROM ia_chunks`))[0].n >= 7);
  } finally { await rm(dir, { recursive: true, force: true }); await db.close(); }
});

test('dossier du RAG : service d\'embeddings en panne = une erreur, rien de purgé, reprise au passage suivant', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'rag2-'));
  const db = await createPgliteDb(); await runMigrations(db);
  try {
    for (let i = 1; i <= 6; i++) await writeFile(path.join(dir, `note${i}.md`), `Note ${i} : la pirogue et la lagune, texte assez long pour être découpé. `.repeat(4));
    const ok = { nom: 'ok', modele: 'm', embed: async (t: string[]) => embeddingSimule(t) };
    let r = await synchroniserDossier(db, ok, 'test', { EMBEDDINGS_DIR: dir } as any);
    assert.equal(r.ajoutes, 6);
    await writeFile(path.join(dir, 'note7.md'), 'Une nouvelle note sur les oiseaux du littoral et des lagunes. '.repeat(4));
    for (let i = 1; i <= 6; i++) await writeFile(path.join(dir, `note${i}.md`), `Note ${i} modifiée : la pirogue et la lagune. `.repeat(5));
    let appels = 0;
    const panne = { nom: 'p', modele: 'm', embed: async () => { appels++; throw new Error('embeddings openai 504'); } };
    r = await synchroniserDossier(db, panne, 'test', { EMBEDDINGS_DIR: dir } as any);
    assert.equal(appels, 3); assert.equal(r.erreurs.length, 1); assert.equal(r.supprimes, 0, 'rien de purgé pendant la panne');
    assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM ia_documents WHERE chemin IS NOT NULL`))[0].n, 6, 'aucun document perdu (le nouveau fichier attend le passage suivant)');
    r = await synchroniserDossier(db, ok, 'test', { EMBEDDINGS_DIR: dir } as any);
    assert.deepEqual(r.erreurs, []); assert.equal(r.ajoutes + r.modifies, 7);
  } finally { await rm(dir, { recursive: true, force: true }); await db.close(); }
});

import { libellesFichier, nettoyerNom } from '../../../packages/noyau/src/lecture.ts';

test('noms de dossiers et de fichiers : chiffres du début, soulignés, élisions, n°, dates, majuscule', async () => {
  assert.equal(nettoyerNom('09_hors_normatif'), 'Hors normatif');
  assert.equal(nettoyerNom('00_constitution'), 'Constitution');
  assert.equal(nettoyerNom('10_sommaires_JO'), 'Sommaires JO');
  assert.equal(nettoyerNom('01_Romans'), 'Romans');
  assert.equal(nettoyerNom('06_decisions_juridictions'), 'Decisions juridictions');
  assert.equal(nettoyerNom('Decision_N_104_MEN_du_19_11_1984_portant_organisation_du_Concours_d_admission_en_6e__11608'), 'Decision n° 104 MEN du 19/11/1984 portant organisation du Concours d\'admission en 6e');
  assert.equal(nettoyerNom('DECISION_de_caractere_general_N_12_77_CNC'), 'Decision de caractere general n° 12 77 CNC');
  assert.equal(nettoyerNom('Decision_N_038_CC_relative_a_la_requete_de_Monsieur_Maxime_SIMANGOYE'), 'Decision n° 038 CC relative a la requete de Monsieur Maxime SIMANGOYE', 'les noms propres en capitales restent');
  assert.equal(nettoyerNom('INDEX'), 'Index');
  assert.equal(nettoyerNom('souvenirs_de_m_auguste_bedloe'), 'Souvenirs de m auguste bedloe', 'm et t ne sont pas élidés');
  assert.equal(nettoyerNom('l_ile_aux_trente-cercueils'), "L'ile aux trente-cercueils");
  const l = libellesFichier('textes_officiels/09_hors_normatif/1972/Arrete_N_230_MEF_du_29_12_1972_fixant_la_liste__13229.md');
  assert.equal(l.categorie, 'Hors normatif', 'une année n\'est pas un rayon');
  assert.equal(l.titre, 'Arrete n° 230 MEF du 29/12/1972 fixant la liste');
  assert.deepEqual(l.chemin, ['Textes officiels', 'Hors normatif']);
  assert.deepEqual(libellesFichier('conte/Anonyme - Le grand voyage.txt'), { auteur: 'Anonyme', titre: 'Le grand voyage', categorie: 'Conte', chemin: ['Conte'] });
  assert.equal(libellesFichier('02_theses/01_monde_myene/sans_date/x.pdf').categorie, 'Monde myene');

  // Fiches déjà importées avec le nom brut : libellés remis au propre ; une fiche modifiée dans la console n'est pas touchée.
  const dir = await mkdtemp(path.join(tmpdir(), 'bib3-'));
  const db = await createPgliteDb(); await runMigrations(db);
  try {
    const para = 'Article premier. Le présent arrêté fixe la liste des produits exonérés de la taxe sur les transactions. '.repeat(5);
    await mkdir(path.join(dir, '09_hors_normatif', '1972'), { recursive: true });
    await writeFile(path.join(dir, '09_hors_normatif', '1972', 'Arrete_N_230_MEF_du_29_12_1972__13229.md'), para);
    await writeFile(path.join(dir, '09_hors_normatif', '1972', 'Arrete_N_231_MEF_du_30_12_1972__13230.md'), para + ' Bis.');
    const env = { BIBLIOTHEQUE_DIR: dir, BIBLIOTHEQUE_RAG: 'non' } as any;
    await importerLivres(db, null, env);
    const avant = (await db.query<any>(`SELECT id, data FROM contenus WHERE collection = 'bibliotheque' ORDER BY id`));
    assert.equal(avant[0].data.titre, 'Arrete n° 230 MEF du 29/12/1972'); assert.equal(avant[0].data.categorie, 'Hors normatif');
    // Simule des fiches de l'ancien import (nom brut), dont une retouchée dans la console.
    await db.query(`UPDATE contenus SET data = data || '{"titre":"Arrete N 230 MEF du 29 12 1972 13229","categorie":"1972"}'::jsonb WHERE id = $1`, [avant[0].id]);
    await db.query(`UPDATE contenus SET data = data || '{"titre":"Mon titre","categorie":"Fiscalité"}'::jsonb WHERE id = $1`, [avant[1].id]);
    const r = await importerLivres(db, null, env);
    assert.equal(r.renommes, 1); assert.equal(r.ajoutes + r.modifies, 0, 'les textes ne sont pas réimportés');
    const apres = (await db.query<any>(`SELECT data FROM contenus WHERE collection = 'bibliotheque' ORDER BY id`)).map(x => x.data);
    assert.equal(apres[0].titre, 'Arrete n° 230 MEF du 29/12/1972'); assert.equal(apres[0].categorie, 'Hors normatif');
    assert.equal(apres[1].titre, 'Mon titre'); assert.equal(apres[1].categorie, 'Fiscalité');
  } finally { await rm(dir, { recursive: true, force: true }); await db.close(); }
});
