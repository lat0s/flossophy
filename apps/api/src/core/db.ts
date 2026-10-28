import mongoose, { type Connection } from 'mongoose';
import { userSchema } from '../features/auth/model.ts';
import { clinicSchema } from '../features/clinics/model.ts';
import { slotSchema } from '../features/slots/model.ts';
import { emailSchema } from '../features/outbox/model.ts';

// Unknown filter keys are dropped. Operator injection can't happen because every
// request value passes a zod schema of plain strings/numbers before it reaches a query.
mongoose.set('strictQuery', true);

function compile(conn: Connection) {
  return {
    conn,
    User: conn.model('User', userSchema),
    Clinic: conn.model('Clinic', clinicSchema),
    Slot: conn.model('Slot', slotSchema),
    Email: conn.model('Email', emailSchema),
  };
}
export type Db = ReturnType<typeof compile>;

const cache = new WeakMap<Connection, Db>();

/** The models bound to one database (the main one, or a visitor's sandbox). */
export function modelsFor(conn: Connection): Db {
  let db = cache.get(conn);
  if (!db) cache.set(conn, (db = compile(conn)));
  return db;
}

export async function connect(uri: string, dbName: string) {
  const conn = mongoose.createConnection(uri, { dbName, serverSelectionTimeoutMS: 15_000, maxPoolSize: 20 });
  await conn.asPromise();
  return conn;
}

export async function ensureIndexes(db: Db) {
  await Promise.all([db.User.syncIndexes(), db.Clinic.syncIndexes(), db.Slot.syncIndexes(), db.Email.syncIndexes()]);
}
