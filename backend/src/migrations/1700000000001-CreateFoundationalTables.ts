import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Minimal foundational tables that Create-Lead depends on and that do not
 * yet exist in the repo (tech-design.md Component 1 / Clarifications,
 * resolved): users, locations, dealer_groups, lead_sources, vehicle_models,
 * audit_log. Each is scoped to just what Create-Lead needs, not full feature
 * sets. Reversible (down drops in reverse dependency order).
 */
export class CreateFoundationalTables1700000000001 implements MigrationInterface {
  name = 'CreateFoundationalTables1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'locations',
        columns: [
          { name: 'location_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'dealer_groups',
        columns: [
          { name: 'dealer_group_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'user_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password_hash', type: 'varchar' },
          { name: 'role', type: 'varchar' },
          { name: 'display_name', type: 'varchar' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'capabilities', type: 'jsonb', default: "'[]'" },
        ],
        foreignKeys: [
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
          {
            columnNames: ['dealer_group_id'],
            referencedTableName: 'dealer_groups',
            referencedColumnNames: ['dealer_group_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'lead_sources',
        columns: [
          // Plain (non-auto-generated) PK — master-data seeding/administration
          // is out of this Story's scope; ids are assigned by the seed process
          // to match the frozen eval-criteria fixtures exactly.
          { name: 'source_id', type: 'int', isPrimary: true },
          { name: 'name', type: 'varchar' },
          { name: 'active', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'vehicle_models',
        columns: [
          { name: 'model_id', type: 'int', isPrimary: true },
          { name: 'name', type: 'varchar' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'audit_log',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'actor', type: 'uuid' },
          { name: 'action', type: 'varchar' },
          { name: 'entity_type', type: 'varchar' },
          { name: 'entity_id', type: 'varchar' },
          { name: 'before', type: 'jsonb', isNullable: true },
          { name: 'after', type: 'jsonb', isNullable: true },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL — see CreateLeads1700000000002.down() for why queryRunner.dropTable()
    // is avoided (breaks the pg-mem test substitute's introspection query).
    await queryRunner.query('DROP TABLE IF EXISTS "audit_log" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "vehicle_models" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "lead_sources" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "users" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "dealer_groups" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "locations" CASCADE');
  }
}
