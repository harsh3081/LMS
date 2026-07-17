import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Introduces the `followups` schema (issue #30, "Log a Follow-up with Type
 * and Outcome Remarks" — the FIRST Story under Feature #8, Follow-up
 * management). No prior Follow-up table exists. Mirrors
 * CreateEnquiries1700000000003's structure/conventions exactly (embedded
 * `indices`/`checks` in the CREATE TABLE, raw-SQL `down()` — pg-mem
 * compatibility, see that migration's comment for the full rationale).
 *
 * Schema decisions (documented here since there is no separate tech-design
 * for this fast-tracked Story):
 *
 * 1. `enquiry_id` (NOT NULL FK -> enquiries) — a Follow-up always belongs to
 *    exactly one Enquiry (AC5). `logged_by` (NOT NULL FK -> users) is the DSE
 *    who logged it — naming mirrors `leads.created_by` / `enquiries.converted_by`
 *    (an immutable "who performed this action" audit column, not a
 *    reassignable "current owner" column — a Follow-up log entry is never
 *    reassigned, so there is no `owner_id`/`owner_updated_at` pair here).
 *
 * 2. `location_id`/`dealer_group_id` are duplicated onto this table (rather
 *    than reached only via a join through `enquiry_id` -> `enquiries`),
 *    mirroring the `enquiries` table's own precedent of duplicating tenant
 *    fields onto each row. This keeps the row self-sufficient for a
 *    tenant-scoped choke-point query (ADR-003 pattern) and gives the future
 *    #32 ("role-scoped follow-up history timeline") Story an efficient,
 *    index-friendly column to filter/sort on without a join.
 *
 * 3. `type` is a plain `varchar` (not a DB enum type) validated at the
 *    application layer (LogFollowupDto `@IsIn`) plus a defense-in-depth CHECK
 *    constraint here (mirrors the mobile-regex CHECK precedent in
 *    CreateLeads1700000000002) — an IN-list CHECK (not a regex), so it is NOT
 *    gated behind the `E2E_DB_DRIVER=pgmem` skip that the mobile regex needs;
 *    pg-mem supports simple IN-list CHECK expressions. Kept a plain varchar
 *    rather than a Postgres ENUM type specifically so a future Story can add
 *    a new follow-up type value with a simple CHECK-constraint migration
 *    (ALTER ... DROP/ADD CONSTRAINT) instead of the more invasive
 *    `ALTER TYPE ... ADD VALUE` ceremony.
 *
 * 4. No `updated_at` column — unlike `leads`/`enquiries` (mutable records),
 *    a Follow-up is an immutable, append-only log entry once created (AC5:
 *    "timestamped"), so it carries only `logged_at` (mirrors `audit_log`'s
 *    single-timestamp `created_at`, not the leads/enquiries created+updated
 *    pair). Nothing about this schema needs to change for a future edit
 *    feature to be added later (it would be additive: an `updated_at`
 *    column can be added the same way 1700000000009-AddOwnerUpdatedAt.ts
 *    added one to `leads`/`enquiries` without a breaking migration).
 *
 * 5. Deliberately NOT added in this Story (kept additive-friendly for later,
 *    per the parent issue's guidance): `next_follow_up_at` (#31, schedule a
 *    reminder) and `outcome_status` (#33, update Enquiry status as part of a
 *    follow-up) — both would be nullable additive columns, addable later
 *    exactly the way 1700000000009-AddOwnerUpdatedAt.ts added a nullable
 *    column to two existing tables, with no breaking change to this
 *    migration or the rows it creates.
 */
export class CreateFollowups1700000000010 implements MigrationInterface {
  name = 'CreateFollowups1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'followups',
        columns: [
          { name: 'followup_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'enquiry_id', type: 'uuid' },
          { name: 'type', type: 'varchar' },
          { name: 'remarks', type: 'text' },
          { name: 'logged_by', type: 'uuid' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'logged_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['enquiry_id'], referencedTableName: 'enquiries', referencedColumnNames: ['enquiry_id'] },
          { columnNames: ['logged_by'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
          {
            columnNames: ['dealer_group_id'],
            referencedTableName: 'dealer_groups',
            referencedColumnNames: ['dealer_group_id'],
          },
        ],
        // Defense-in-depth IN-list CHECK backing LogFollowupDto's `@IsIn`
        // (AC1/AC4). Unlike CreateLeads1700000000002's mobile regex CHECK,
        // this does NOT need the E2E_DB_DRIVER=pgmem skip — pg-mem's SQL
        // engine does support simple IN-list CHECK expressions.
        checks: [{ columnNames: ['type'], expression: "\"type\" IN ('Home Visit', 'Showroom Visit', 'Call')" }],
        // Embedded in CREATE TABLE (not a follow-up createIndex call) so it
        // travels through both the real-Postgres and pg-mem drivers — see
        // CreateLeads1700000000002/CreateEnquiries1700000000003.
        indices: [{ name: 'idx_followups_enquiry_logged', columnNames: ['enquiry_id', 'logged_at'] }],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL (not dropTable()) so it also runs against pg-mem — see
    // CreateLeads1700000000002/CreateEnquiries1700000000003 for why.
    await queryRunner.query('DROP TABLE IF EXISTS "followups" CASCADE');
  }
}
