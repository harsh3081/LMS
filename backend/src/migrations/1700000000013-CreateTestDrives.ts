import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Introduces the `demo_vehicles` and `test_drives` schemas (issue #34,
 * "Book a Test Drive Slot" — the FIRST Story under Epic #2, Test Drive
 * Management). No prior Test Drive / demo-fleet table exists. Mirrors
 * CreateFollowups1700000000010's structure/conventions exactly (embedded
 * `indices`/`checks` in the CREATE TABLE, raw-SQL `down()` — pg-mem
 * compatibility).
 *
 * Authoritative source: `.phoenix-os/project/specs/design/lms-1/tech-design.md`
 * Data Design section ("Test Drive" / "Vehicle (demo)" entities). This Story
 * is explicitly the FOUNDATION for six more Epic #2 Stories (#35 scheduler
 * grid, #36 double-booking prevention, #37 data integrity, #38 auto-
 * reminders, #39 outcome logging, #40 outcome reporting) — see NOTES.md for
 * the full list of deliberately-deferred concerns each of those owns.
 *
 * Schema decisions (documented here since there is no separate tech-design
 * spec.md/tech-design.md for this fast-tracked Story):
 *
 * 1. `demo_vehicles` — a NEW, separate master-data table, deliberately NOT
 *    the same as `vehicle_models` (see vehicle-models/entities/vehicle-model.entity.ts's
 *    own comment anticipating this: "deliberately NOT the location-scoped
 *    demo-fleet Vehicle table — resolved"). `vehicle_models` is the abstract,
 *    location-agnostic model catalog (e.g. "Sedan GT") with a small plain-int
 *    PK, seeded once by SeedMasterData1700000000004. `demo_vehicles` is
 *    location-scoped PHYSICAL fleet inventory available for test drives — a
 *    materially different, larger, operationally-changing dataset — so it
 *    gets its own uuid PK (mirrors the leads/enquiries/followups convention
 *    for operational data, not the lead_sources/vehicle_models convention for
 *    small static catalogs). `model_id` FKs to the existing `vehicle_models`
 *    (which physical model this unit is); `variant` is free-text (mirrors
 *    `enquiries.variant`); `location_id` is NOT NULL (tech-design: "Vehicle
 *    (demo)... location_id... Master data"); `is_active` is a simple boolean
 *    (issue guidance: "keep simple... a richer availability-calendar concept
 *    is #35/#36's territory").
 *
 * 2. `test_drives` — `enquiry_id` (NOT NULL FK -> enquiries): a Test Drive
 *    always belongs to exactly one Enquiry, mirrors `followups.enquiry_id`
 *    exactly ("select a customer" in AC1 = select one of the DSE's own open
 *    Enquiries, per the orchestrator's brief — booking is against an
 *    existing Enquiry, not a freestanding customer entry). `vehicle_id` (NOT
 *    NULL FK -> demo_vehicles). `slot_start`/`slot_end` (timestamptz, NOT
 *    NULL) — AC1/AC2. `status` (varchar, default 'Booked') — this Story only
 *    ever writes 'Booked' (`TEST_DRIVE_STATUS_BOOKED`, defined in the
 *    entity); the CHECK constraint below is deliberately scoped to JUST that
 *    one value for now (mirrors followups.type's IN-list CHECK precedent) —
 *    issue #39 ("Log Test Drive Outcome") will widen it via an
 *    ALTER-CONSTRAINT migration to add Completed/No-show/Cancelled, exactly
 *    the same additive pattern CreateFollowups1700000000010's own comment
 *    anticipated for its `type` column. `remarks` (text, nullable) —
 *    reserved for #39's outcome remarks; this Story never writes it.
 *    `booked_by` (NOT NULL FK -> users) — server-derived from the Principal,
 *    never client-supplied (ADR-003/009), mirrors `followups.logged_by`'s
 *    "who performed this action" naming (a booking is not reassigned, so no
 *    owner_id/owner_updated_at pair). `location_id`/`dealer_group_id` are
 *    duplicated onto this table (not reached only via enquiry_id -> enquiries),
 *    mirroring `followups`' own precedent — keeps the row self-sufficient for
 *    a tenant-scoped choke-point query and gives #35's future scheduler-grid
 *    Story an efficient, index-friendly column to filter on without a join.
 *
 * 3. `updated_at` IS included on `test_drives` (unlike the immutable-log
 *    `followups` table) because, unlike a Follow-up, a Test Drive booking's
 *    `status`/`remarks` ARE expected to change later (#36 may free a
 *    cancelled slot, #39 will set the outcome) — mirrors leads/enquiries'
 *    mutable-record created+updated pair, not followups' single-timestamp
 *    append-only convention.
 *
 * 4. Deliberately NOT added in this Story (kept additive-friendly for later,
 *    per the parent issue's explicit guidance): any uniqueness/overlap
 *    constraint on (vehicle_id, slot_start, slot_end) — issue #36 ("Prevent
 *    Double-Booking of Demo Vehicles") owns that entirely (transactional
 *    conflict detection via `SELECT ... FOR UPDATE`/unique-constraint per
 *    ADR-002, helpful error messages, nearest-open-slot suggestions, freeing
 *    slots on cancel/reschedule). This Story accepts bookings naively — see
 *    NOTES.md "Deliberate scope boundary with #36".
 *
 * Indices: `idx_demo_vehicles_location` (location-scoped dropdown lookups,
 * AC1); `idx_test_drives_vehicle_slot` (vehicle_id, slot_start) — not a
 * uniqueness constraint, just an index anticipating #36's own conflict-query
 * needs; `idx_test_drives_booked_by_slot` (booked_by, slot_start) — backs
 * AC5's "my upcoming bookings" query, mirrors `idx_followups_enquiry_logged`'s
 * precedent of provisioning the index the Story's own read-path needs.
 */
export class CreateTestDrives1700000000013 implements MigrationInterface {
  name = 'CreateTestDrives1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'demo_vehicles',
        columns: [
          { name: 'vehicle_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'model_id', type: 'int' },
          { name: 'variant', type: 'varchar' },
          { name: 'location_id', type: 'uuid' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['model_id'], referencedTableName: 'vehicle_models', referencedColumnNames: ['model_id'] },
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
        ],
        indices: [{ name: 'idx_demo_vehicles_location', columnNames: ['location_id'] }],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'test_drives',
        columns: [
          { name: 'test_drive_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'enquiry_id', type: 'uuid' },
          { name: 'vehicle_id', type: 'uuid' },
          { name: 'slot_start', type: 'timestamptz' },
          { name: 'slot_end', type: 'timestamptz' },
          { name: 'status', type: 'varchar', default: "'Booked'" },
          { name: 'remarks', type: 'text', isNullable: true },
          { name: 'booked_by', type: 'uuid' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['enquiry_id'], referencedTableName: 'enquiries', referencedColumnNames: ['enquiry_id'] },
          {
            columnNames: ['vehicle_id'],
            referencedTableName: 'demo_vehicles',
            referencedColumnNames: ['vehicle_id'],
          },
          { columnNames: ['booked_by'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
          {
            columnNames: ['dealer_group_id'],
            referencedTableName: 'dealer_groups',
            referencedColumnNames: ['dealer_group_id'],
          },
        ],
        // Defense-in-depth IN-list CHECK — deliberately scoped to ONLY the
        // one status value this Story ever writes (see class comment point
        // 2); #39 widens this via ALTER ... DROP/ADD CONSTRAINT.
        checks: [{ columnNames: ['status'], expression: "\"status\" IN ('Booked')" }],
        indices: [
          { name: 'idx_test_drives_vehicle_slot', columnNames: ['vehicle_id', 'slot_start'] },
          { name: 'idx_test_drives_booked_by_slot', columnNames: ['booked_by', 'slot_start'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL (not dropTable()) so it also runs against pg-mem — see
    // CreateFollowups1700000000010 for why. Drop test_drives first (FK
    // dependency on demo_vehicles).
    await queryRunner.query('DROP TABLE IF EXISTS "test_drives" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "demo_vehicles" CASCADE');
  }
}
