import { loadConfig } from '../src/core/config.ts';
import { connect, ensureIndexes, modelsFor } from '../src/core/db.ts';
import { hashPassword } from '../src/features/auth/routes.ts';
import { DEMO_PASSWORD, DEMO_PATIENT, DEMO_DENTIST_EMAIL } from '../src/seed/data.ts';
import { seed } from '../src/seed/seed.ts';

const cfg = loadConfig();
const conn = await connect(cfg.MONGODB_URI, cfg.MONGODB_DB);
await conn.dropDatabase();
const db = modelsFor(conn);
await ensureIndexes(db);
const counts = await seed(db, await hashPassword(DEMO_PASSWORD));
console.log(`Seeded ${cfg.MONGODB_DB}:`, counts);
console.log(`Sign in as ${DEMO_PATIENT.email} or ${DEMO_DENTIST_EMAIL}, password "${DEMO_PASSWORD}"`);
await conn.close();
