import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

let mongo: MongoMemoryServer;

/** One mongod for all test files; each file uses its own database. */
export async function setup(project: TestProject) {
  mongo = await MongoMemoryServer.create();
  project.provide('mongoUri', mongo.getUri());
}

export async function teardown() {
  await mongo?.stop();
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
