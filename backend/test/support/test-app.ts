import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestDataSource } from './test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { createApp } from '../../src/app.factory';

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
  seed: SeedResult;
}

/** Boots a full Nest app (guards, pipes, filters, Swagger) against a fresh,
 * migrated, seeded pg-mem-backed DataSource — one per test file. */
export async function createTestApp(): Promise<TestAppContext> {
  const dataSource = await createTestDataSource();
  const seed = await seedTestFixtures(dataSource);
  const app = await createApp(dataSource);
  await app.init();
  return { app, dataSource, seed };
}

export async function closeTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
  await ctx.dataSource.destroy();
}
