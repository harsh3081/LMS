import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the default `lead_sources` and `vehicle_models` rows.
 *
 * Root cause fixed: `CreateFoundationalTables1700000000001` only creates
 * these tables — it never inserts rows. The real app entry point
 * (`main.ts`/`data-source.ts` against real Postgres) runs migrations only
 * and does not call the test-only `seeds/test-seed.ts` script, so a fresh
 * real-Postgres environment ends up with empty `lead_sources`/`vehicle_models`
 * tables and the "New Lead" form's Source/Model dropdowns have nothing to
 * select, blocking lead creation entirely. `dev-server-pgmem.ts` (the sandbox
 * script) masked this because it explicitly calls `seedTestFixtures()` after
 * migrating — that seeding was never part of the real migration path.
 *
 * Values match `.phoenix-os/project/specs/24/tests/fixtures/{lead-sources,
 * vehicle-models}.json` exactly, so this migration keeps the frozen test
 * fixtures and the real seeded data in lock-step. `ON CONFLICT DO NOTHING`
 * keeps this idempotent/safe to re-run.
 */
export class SeedMasterData1700000000004 implements MigrationInterface {
  name = 'SeedMasterData1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "lead_sources" (source_id, name, active) VALUES
        (1, 'Walk-in', true),
        (2, 'Referral', true),
        (3, 'Call', true),
        (4, 'Online', true),
        (5, 'Discontinued', false)
      ON CONFLICT (source_id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "vehicle_models" (model_id, name) VALUES
        (101, 'Compact Hatchback LX'),
        (102, 'Sedan GT'),
        (103, 'SUV Adventure Plus')
      ON CONFLICT (model_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "lead_sources" WHERE source_id IN (1, 2, 3, 4, 5)');
    await queryRunner.query('DELETE FROM "vehicle_models" WHERE model_id IN (101, 102, 103)');
  }
}
