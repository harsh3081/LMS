import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Introduces the Lead schema (tech-design.md Component 1 / Data Design).
 * No prior Lead table exists. Reversible: down drops the index then the
 * table (EVAL-CC-13). No unique constraint on `mobile` — FR-06 owns dedupe.
 */
export class CreateLeads1700000000002 implements MigrationInterface {
  name = 'CreateLeads1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defense-in-depth CHECK constraint (tech-design.md / ref-code.md Migration
    // Scripts) mirroring the DTO-level India-mobile regex at the DB layer.
    // Application-level validation (class-validator, see CreateLeadDto) is the
    // primary and always-active enforcement path; this DB CHECK is a belt-
    // and-braces backstop for real PostgreSQL. It is skipped only when running
    // against the pg-mem in-memory test substitute (E2E_DB_DRIVER=pgmem, see
    // test/support/test-data-source.ts), because pg-mem's SQL engine does not
    // implement the `~` regex operator on varchar — a test-harness limitation,
    // not a product/spec decision. Real Postgres 16 (dev/CI/prod) always gets
    // the full CHECK.
    const includeMobileCheck = process.env.E2E_DB_DRIVER !== 'pgmem';

    await queryRunner.createTable(
      new Table({
        name: 'leads',
        columns: [
          { name: 'lead_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'customer_name', type: 'text' },
          { name: 'mobile', type: 'varchar', length: '10' },
          { name: 'source_id', type: 'int' },
          { name: 'model_id', type: 'int' },
          { name: 'owner_id', type: 'uuid' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'status', type: 'varchar', default: "'New'" },
          { name: 'custom_fields', type: 'jsonb', default: "'{}'" },
          { name: 'created_by', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['source_id'], referencedTableName: 'lead_sources', referencedColumnNames: ['source_id'] },
          { columnNames: ['model_id'], referencedTableName: 'vehicle_models', referencedColumnNames: ['model_id'] },
          { columnNames: ['owner_id'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['created_by'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          {
            columnNames: ['location_id'],
            referencedTableName: 'locations',
            referencedColumnNames: ['location_id'],
          },
          {
            columnNames: ['dealer_group_id'],
            referencedTableName: 'dealer_groups',
            referencedColumnNames: ['dealer_group_id'],
          },
        ],
        checks: includeMobileCheck
          ? [{ columnNames: ['mobile'], expression: "mobile ~ '^[6-9][0-9]{9}$'" }]
          : [],
        // Owner-scoped queue index (AC6) declared as part of the initial
        // CREATE TABLE rather than a follow-up createIndex() call, so it
        // travels with the table through both drivers (real Postgres and the
        // pg-mem test substitute — standalone createIndex()/dropIndex() calls
        // trigger a TypeORM table-metadata reload that pg-mem's
        // information_schema emulation does not support).
        indices: [
          {
            name: 'idx_leads_owner_location_created',
            columnNames: ['owner_id', 'location_id', 'created_at'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL (rather than queryRunner.dropTable()) so this also runs against
    // the pg-mem test substitute: TypeORM's dropTable() unconditionally loads
    // cached table metadata via an information_schema introspection query
    // pg-mem cannot execute (alias-resolution limitation), independent of the
    // `ifExist` flag. DROP ... CASCADE removes the table and its index/FK/
    // check constraints together on real Postgres (EVAL-CC-13: reversible).
    await queryRunner.query('DROP TABLE IF EXISTS "leads" CASCADE');
  }
}
