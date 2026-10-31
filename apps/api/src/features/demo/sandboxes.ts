import type { Connection } from 'mongoose';
import { type Db, ensureIndexes, modelsFor } from '../../core/db.ts';
import { HttpError } from '../../core/errors.ts';
import { log } from '../../core/log.ts';
import { seed } from '../../seed/seed.ts';

const PREFIX = 'sbx_';

/**
 * One private database per demo visitor, seeded on first use and dropped once idle.
 * State lives in memory: when the API sleeps and wakes, old sandboxes are dropped at boot
 * and returning visitors simply get a fresh one.
 */
export function sandboxes(
  base: Connection,
  opts: { idleMs: number; max: number; passwordHash: () => Promise<string> },
) {
  const ready = new Map<string, Promise<Db>>();
  const lastSeen = new Map<string, number>();

  async function create(id: string) {
    const db = modelsFor(base.useDb(PREFIX + id, { useCache: true }));
    if ((await db.Clinic.estimatedDocumentCount()) === 0) {
      await ensureIndexes(db);
      const counts = await seed(db, await opts.passwordHash());
      log.info('sandbox seeded', { sandbox: id, ...counts });
    }
    return db;
  }

  return {
    get(id: string): Promise<Db> {
      lastSeen.set(id, Date.now());
      let p = ready.get(id);
      if (!p) {
        if (ready.size >= opts.max)
          throw new HttpError(503, 'demo_full', 'The demo clinic is full right now. Try again in a few minutes.');
        p = create(id).catch((err) => {
          ready.delete(id);
          throw err;
        });
        ready.set(id, p);
      }
      return p;
    },

    async reap(now = Date.now()) {
      for (const [id, seen] of lastSeen) {
        if (now - seen < opts.idleMs) continue;
        ready.delete(id);
        lastSeen.delete(id);
        await base.useDb(PREFIX + id, { useCache: false }).dropDatabase();
        log.info('sandbox dropped', { sandbox: id });
      }
    },

    /** Drops sandboxes left over from before this process started. */
    async dropAll() {
      const { databases } = await base.db!.admin().listDatabases({ nameOnly: true });
      for (const { name } of databases) {
        if (name.startsWith(PREFIX)) await base.useDb(name, { useCache: false }).dropDatabase();
      }
    },

    get size() {
      return ready.size;
    },
  };
}
export type Sandboxes = ReturnType<typeof sandboxes>;
