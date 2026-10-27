// Writes the OpenAPI document to a file, e.g. for the gate image.
import { writeFileSync } from 'node:fs';
import { buildSpec } from '../src/app.ts';
import { loadConfig } from '../src/core/config.ts';

const out = process.argv[2] ?? 'openapi.json';
writeFileSync(
  out,
  JSON.stringify(buildSpec(loadConfig({ ...process.env, NODE_ENV: 'development', DEMO_PERSONAS: 'true' }))),
);
console.log(`Wrote ${out}`);
