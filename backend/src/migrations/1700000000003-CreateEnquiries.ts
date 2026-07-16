import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Introduces the Enquiry schema (tech-design.md Component 1 / Data Design,
 * issue #25). No prior Enquiry table exists. `budget` is `bigint` (resolved
 * Clarification Q1 — no int4 overflow risk, no explicit upper bound).
 * `UNIQUE(lead_id)` is DB-level defense-in-depth behind the app-level 409
 * eligibility check (resolved Clarification Q2 — one Enquiry per Lead).
 * Reversible: down drops the table (and its FKs/index/unique constraint via
 * CASCADE) — see CreateLeads1700000000002 for why raw SQL (not
 * queryRunner.dropTable()) is used, and why the index is embedded in the
 * CREATE TABLE rather than a follow-up createIndex() call (pg-mem
 * compatibility, ref-code.md Migration Scripts).
 */
export class CreateEnquiries1700000000003 implements MigrationInterface {
  name = 'CreateEnquiries1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enquiries',
        columns: [
          { name: 'enquiry_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'lead_id', type: 'uuid', isUnique: true }, // one Enquiry per Lead (Q2)
          { name: 'budget', type: 'bigint' }, // Q1: bigint, no explicit upper bound
          { name: 'variant', type: 'text' },
          { name: 'exchange_interest', type: 'boolean' },
          { name: 'finance_interest', type: 'boolean' },
          { name: 'converted_by', type: 'uuid' },
          { name: 'owner_id', type: 'uuid' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'status', type: 'varchar', default: "'New'" },
          { name: 'custom_fields', type: 'jsonb', default: "'{}'" },
          { name: 'converted_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['lead_id'], referencedTableName: 'leads', referencedColumnNames: ['lead_id'] },
          { columnNames: ['converted_by'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['owner_id'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
          {
            columnNames: ['dealer_group_id'],
            referencedTableName: 'dealer_groups',
            referencedColumnNames: ['dealer_group_id'],
          },
        ],
        // Embedded in CREATE TABLE (not a follow-up createIndex) so it travels
        // through both the real-Postgres and pg-mem drivers — see #24 migration.
        indices: [
          { name: 'idx_enquiries_owner_location_created', columnNames: ['owner_id', 'location_id', 'converted_at'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL (not dropTable()) so it also runs against pg-mem — see #24 migration.
    await queryRunner.query('DROP TABLE IF EXISTS "enquiries" CASCADE');
  }
}
