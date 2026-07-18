import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Prevent-Double-Booking schema support (issue #36, "Prevent Double-Booking
 * of Demo Vehicles" — AC1/AC3/AC4/AC5). Purely additive — does not edit the
 * frozen #34/#35 migration files (1700000000013-CreateTestDrives.ts,
 * 1700000000014-SeedDemoVehicles.ts).
 *
 * Two changes, both required for this Story's own AC proofs (see
 * .phoenix-os/project/specs/36/NOTES.md for the full design rationale):
 *
 * 1. WIDENS the `test_drives.status` CHECK constraint from `IN ('Booked')`
 *    to `IN ('Booked', 'Completed', 'No-show', 'Cancelled')`. This column's
 *    class comment (test-drive.entity.ts) and 1700000000013's own comment
 *    both anticipated issue #39 ("Log Test Drive Outcome") doing this widening
 *    via an additive ALTER-CONSTRAINT migration — done here, one Story early,
 *    ONLY because AC5 ("cancelled/rescheduled bookings free up the slot
 *    immediately") requires a test that actually writes a terminal status to
 *    a row (bypassing the not-yet-built #39 endpoint, via direct repository/
 *    DB manipulation) to prove the conflict-check query correctly stops
 *    treating that row as blocking. That proof is impossible without the DB
 *    accepting the terminal status value at all. This migration does NOT
 *    build any of #39's actual outcome-logging feature (no endpoint, no DTO,
 *    no service method writes these values) — only the schema capability is
 *    unlocked early, exactly the additive step the codebase's own comments
 *    already earmarked, so #39 does not need to touch this CHECK constraint
 *    again.
 *
 *    Constraint-name note: 1700000000013 declared its `checks` array without
 *    an explicit `name`, so TypeORM's `DefaultNamingStrategy` deterministically
 *    generated one client-side (computed from table+column, NOT randomly, NOT
 *    a pg-mem quirk) — empirically observed as
 *    `CHK_26ad94fa622d6833fe8cb924af` when this Story's sandbox ran the
 *    up-migration. `DROP CONSTRAINT IF EXISTS` is used so this migration is
 *    still a no-op-safe re-run against an environment where that name might
 *    legitimately differ (e.g. a different TypeORM minor version's hashing) —
 *    the widened CHECK is then unconditionally (re-)added under an explicit,
 *    stable name (`CHK_test_drives_status`) so this ambiguity cannot recur for
 *    any future migration.
 *
 * 2. ADDS a PARTIAL UNIQUE index — `UQ_test_drives_vehicle_slot_booked` on
 *    `(vehicle_id, slot_start, slot_end)` WHERE `status = 'Booked'` — the
 *    DB-level defense-in-depth backstop behind TestDrivesService.book's
 *    app-level pre-check (ADR-002, mirrors the exact
 *    `UNIQUE(lead_id)`-behind-a-409-check precedent
 *    `enquiries.lead_id` established in 1700000000003-CreateEnquiries.ts).
 *    PARTIAL (not a plain table-wide UNIQUE) specifically so a CANCELLED
 *    booking's row does not permanently "squat" on its old slot — a new
 *    booking can legitimately reuse the exact same vehicle+slot once the
 *    prior row's status is no longer 'Booked' (AC5). Confirmed via a
 *    throwaway sandbox test that pg-mem supports partial (WHERE-qualified)
 *    UNIQUE indexes. See NOTES.md "Concurrency mechanism" for the full
 *    investigation (FOR UPDATE row-locking was tried FIRST and rejected —
 *    pg-mem accepts the syntax but provides no real blocking/serialization,
 *    proven by an interleaved-transaction throwaway test where two "racing"
 *    check-then-insert transactions both read 0 conflicting rows before
 *    either committed; a bare UNIQUE constraint, by contrast, correctly
 *    rejected the second of two identically-raced inserts in the same
 *    throwaway harness).
 *
 *    IMPORTANT LIMITATION (documented honestly, not silently omitted): this
 *    is a UNIQUE index on the exact (vehicle_id, slot_start, slot_end)
 *    tuple, not a true Postgres range-overlap exclusion constraint. It
 *    catches an EXACT-duplicate-slot race (two DSEs racing on literally the
 *    same slotStart/slotEnd) but cannot, by itself, catch a race between two
 *    PARTIALLY-overlapping-but-not-identical slots (e.g. 10:00-10:30 vs.
 *    10:15-10:45) at the DB layer. AC4's "overlapping ranges, not just exact
 *    matches" correctness therefore rests primarily on
 *    TestDrivesService.book's app-level pre-check (reusing
 *    TestDrivesRepository.findBookedInRange's overlap-range query,
 *    `slotStart < to AND slotEnd > from`) run inside the same transaction as
 *    the insert — not on this index. A real Postgres deployment SHOULD
 *    additionally add a `tsrange` + `EXCLUDE USING gist (vehicle_id WITH =,
 *    slot_range WITH &&) WHERE (status = 'Booked')` constraint for a true
 *    DB-enforced range-overlap guarantee; this was attempted here first and
 *    confirmed NOT usable in this sandbox — pg-mem does not implement the
 *    `btree_gist` extension (`CREATE EXTENSION IF NOT EXISTS btree_gist`
 *    fails with "Extension does not exist"), so a GiST exclusion constraint
 *    cannot even be authored, let alone tested, here.
 */
export class TestDriveConflictPrevention1700000000015 implements MigrationInterface {
  name = 'TestDriveConflictPrevention1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "test_drives" DROP CONSTRAINT IF EXISTS "CHK_26ad94fa622d6833fe8cb924af"`);
    await queryRunner.query(`ALTER TABLE "test_drives" DROP CONSTRAINT IF EXISTS "CHK_test_drives_status"`);
    await queryRunner.query(
      `ALTER TABLE "test_drives" ADD CONSTRAINT "CHK_test_drives_status" CHECK ("status" IN ('Booked', 'Completed', 'No-show', 'Cancelled'))`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_test_drives_vehicle_slot_booked" ON "test_drives" ("vehicle_id", "slot_start", "slot_end") WHERE "status" = 'Booked'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_test_drives_vehicle_slot_booked"`);

    await queryRunner.query(`ALTER TABLE "test_drives" DROP CONSTRAINT IF EXISTS "CHK_test_drives_status"`);
    await queryRunner.query(
      `ALTER TABLE "test_drives" ADD CONSTRAINT "CHK_26ad94fa622d6833fe8cb924af" CHECK ("status" IN ('Booked'))`,
    );
  }
}
