import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * Introduces the `field_config` table (issue #27, FR-04) and seeds AC6's
 * default configuration ("name, mobile number, source, and model of
 * interest marked mandatory" — every configurable field starts mandatory).
 * Additive-only, does not touch any #24/#25/#26 table. Reversible: down
 * drops the table (raw SQL — see CreateLeads1700000000002 for why
 * queryRunner.dropTable() is avoided against the pg-mem test substitute).
 */
export class CreateFieldConfig1700000000006 implements MigrationInterface {
  name = 'CreateFieldConfig1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'field_config',
        columns: [
          { name: 'field_name', type: 'varchar', isPrimary: true },
          { name: 'mandatory', type: 'boolean' },
          { name: 'updated_by', type: 'uuid', isNullable: true },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      INSERT INTO "field_config" (field_name, mandatory) VALUES
        ('customerName', true),
        ('mobile', true),
        ('sourceId', true),
        ('modelId', true)
      ON CONFLICT (field_name) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "field_config" CASCADE');
  }
}
