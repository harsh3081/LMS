import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds a handful of demo vehicles (issue #34, AC1) so a fresh real-Postgres
 * environment's booking-form dropdown has real data to select from, mirroring
 * SeedMasterData1700000000004's `ON CONFLICT DO NOTHING` idempotent pattern.
 *
 * Location choice: `demo_vehicles.location_id` is NOT NULL (tech-design:
 * location-scoped fleet), and no migration seeds a general-purpose real-world
 * location — the only location a MIGRATION (as opposed to the Jest-only
 * test-seed.ts fixture) currently knows about is the one
 * SeedAdminUser1700000000008 already created
 * ('33333333-0000-0000-0000-000000000099', "HQ (Admin)"). Reusing it here
 * (rather than inventing a brand-new one) avoids seeding an orphan location
 * with no seeded user attached to it. Uses the existing `vehicle_models`
 * rows (101/102/103) SeedMasterData1700000000004 already seeded — no new
 * model rows needed.
 *
 * Fixed `vehicle_id` UUIDs (not the column's `uuid_generate_v4()` default)
 * are used here specifically so `ON CONFLICT (vehicle_id) DO NOTHING` is a
 * real idempotency check on re-run, exactly like SeedMasterData's fixed
 * source_id/model_id values.
 *
 * NOTE (see NOTES.md "Demo vehicle seeding — split between migration and
 * test-seed.ts"): the Jest/Supertest integration suite additionally seeds
 * its OWN demo vehicles scoped to the dseA/dseB/dseC test-fixture locations
 * (backend/src/seeds/test-seed.ts) — that seeding cannot live in a migration
 * because those test-fixture locations do not exist until test-seed.ts runs
 * (after migrations), so a migration cannot FK against them. This migration
 * is the real-Postgres/production-analogous seed path; test-seed.ts is the
 * Jest-fixture path. Both follow the same 2-3-per-location guidance from the
 * parent issue.
 */
export class SeedDemoVehicles1700000000014 implements MigrationInterface {
  name = 'SeedDemoVehicles1700000000014';

  private readonly locationId = '33333333-0000-0000-0000-000000000099';
  private readonly vehicleIds = [
    '55555555-1111-0000-0000-000000000001',
    '55555555-1111-0000-0000-000000000002',
    '55555555-1111-0000-0000-000000000003',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "demo_vehicles" (vehicle_id, model_id, variant, location_id, is_active) VALUES
        ($1, 101, 'LX', $4, true),
        ($2, 102, 'GT Turbo', $4, true),
        ($3, 103, 'Adventure Plus AWD', $4, true)
      ON CONFLICT (vehicle_id) DO NOTHING`,
      [...this.vehicleIds, this.locationId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Literal IN-list (not a parameterized array) — mirrors
    // SeedMasterData1700000000004.down()'s convention; pg-mem's SQL engine
    // does not reliably support the `= ANY($1::uuid[])` parameterized-array
    // form.
    await queryRunner.query(
      `DELETE FROM "demo_vehicles" WHERE vehicle_id IN ('${this.vehicleIds.join("','")}')`,
    );
  }
}
