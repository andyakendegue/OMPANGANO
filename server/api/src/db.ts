/**
 * Accès PostgreSQL. Une interface minimale (requête + transaction) permet d'utiliser
 * `pg` en production et PGlite (PostgreSQL en WASM) dans les tests, sans Docker.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Queryable {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  tx<R>(fn: (q: Queryable) => Promise<R>): Promise<R>;
  close(): Promise<void>;
}

export async function createPgDb(connectionString: string): Promise<Db> {
  const pg = await import('pg');
  // timestamptz renvoyés en texte ISO précis (microsecondes) : on les formate en SQL si besoin
  const pool = new pg.default.Pool({ connectionString, max: 10 });
  return {
    async query(sql, params) {
      return (await pool.query(sql, params as any[])).rows;
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn({ query: async (sql, params) => (await client.query(sql, params as any[])).rows });
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}

export async function createPgliteDb(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.waitReady;
  return {
    // Sans paramètres, exec() accepte plusieurs instructions (fichiers de migration)
    async query(sql, params) {
      if (params === undefined) return ((await pg.exec(sql)).pop()?.rows ?? []) as any[];
      return (await pg.query(sql, params as any[])).rows as any[];
    },
    async tx(fn) {
      return pg.transaction(async (t) => fn({
        query: async (sql, params) =>
          params === undefined ? (((await t.exec(sql)).pop()?.rows ?? []) as any[]) : ((await t.query(sql, params as any[])).rows as any[])
      }));
    },
    close: () => pg.close()
  };
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

/** Applique les fichiers migrations/NNN_*.sql dans l'ordre, une seule fois chacun. */
export async function runMigrations(db: Db, dir = migrationsDir): Promise<string[]> {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map(r => r.name));
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = readFileSync(join(dir, f), 'utf8');
    await db.tx(async q => {
      await q.query(sql);
      await q.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
    });
    applied.push(f);
  }
  return applied;
}
