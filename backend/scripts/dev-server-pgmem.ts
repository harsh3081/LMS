/**
 * SANDBOX-ONLY dev server bootstrap (NOT used in production/real dev/CI —
 * see backend/src/main.ts for that, which uses real PostgreSQL 16 via
 * src/data-source.ts). This script exists solely so the frozen Playwright
 * suite (.phoenix-os/project/specs/24/tests/) can be run end-to-end against
 * a live instance of this Story's app in a sandbox that has neither a local
 * PostgreSQL install nor Docker available (see evidence.md "Blockers").
 * It boots the exact same AppModule/createApp wiring as main.ts, just
 * backed by the pg-mem in-memory substitute (test/support/test-data-source)
 * instead of a real Postgres connection, and seeds the same fixtures the
 * suite's tests/fixtures/*.json describe.
 */
import 'reflect-metadata';
import { createTestDataSource } from '../test/support/test-data-source';
import { seedTestFixtures } from '../src/seeds/test-seed';
import { createApp } from '../src/app.factory';

async function main() {
  const dataSource = await createTestDataSource();
  await seedTestFixtures(dataSource);
  const app = await createApp(dataSource);
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[sandbox] LMS backend (pg-mem substitute) listening on port ${port}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[sandbox] Failed to start backend:', err);
  process.exit(1);
});
