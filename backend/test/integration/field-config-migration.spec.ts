/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #27 Task 1.1.
 * Asserts the three new migrations (CreateFieldConfig, MakeLeadFieldsNullable,
 * SeedAdminUser) behave as documented, and that CreateFieldConfig reverses
 * cleanly. Mirrors migration.spec.ts / direct-enquiry-migration.spec.ts's
 * conventions (kept in its own file for isolation, does not edit those).
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createTestDataSource } from '../support/test-data-source';

describe('field-config migrations (issue #27 Task 1.1)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('CreateFieldConfig up-migration creates field_config seeded with AC6 defaults (all four mandatory)', async () => {
    dataSource = await createTestDataSource();

    const rows: { field_name: string; mandatory: boolean }[] = await dataSource.query(
      `SELECT field_name, mandatory FROM field_config ORDER BY field_name`,
    );
    const byName = new Map(rows.map((r) => [r.field_name, r.mandatory]));

    expect(byName.get('customerName')).toBe(true);
    expect(byName.get('mobile')).toBe(true);
    expect(byName.get('sourceId')).toBe(true);
    expect(byName.get('modelId')).toBe(true);
    expect(rows).toHaveLength(4);
  });

  it('MakeLeadFieldsNullable: a bare INSERT into leads omitting customer_name/mobile/source_id/model_id succeeds', async () => {
    // NOTE: mirrors direct-enquiry-migration.spec.ts's nullability-by-INSERT
    // approach (pg-mem's information_schema.is_nullable does not reflect an
    // ALTER COLUMN DROP NOT NULL), so nullability is asserted functionally.
    dataSource = await createTestDataSource();
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('nullable-lead@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );

    const result = await dataSource.query(
      `INSERT INTO leads (owner_id, location_id, dealer_group_id, created_by)
       VALUES ($1, $2, $3, $1) RETURNING lead_id, customer_name, mobile, source_id, model_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );

    expect(result[0].customer_name).toBeNull();
    expect(result[0].mobile).toBeNull();
    expect(result[0].source_id).toBeNull();
    expect(result[0].model_id).toBeNull();
  });

  it('SeedAdminUser: seeds an admin@lms.local account carrying manage-field-config', async () => {
    dataSource = await createTestDataSource();

    const rows: { email: string; role: string; capabilities: unknown; password_hash: string }[] = await dataSource.query(
      `SELECT email, role, capabilities, password_hash FROM users WHERE email = 'admin@lms.local'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].role).toBe('SystemAdministrator');
    const capabilities =
      typeof rows[0].capabilities === 'string' ? JSON.parse(rows[0].capabilities) : rows[0].capabilities;
    expect(capabilities).toContain('manage-field-config');
    expect(bcrypt.compareSync('ChangeMe#Admin1', rows[0].password_hash)).toBe(true);
  });

  it('CreateFieldConfig down-migration reverses cleanly: drops field_config', async () => {
    dataSource = await createTestDataSource();
    // SeedAdminUser1700000000008, MakeLeadFieldsNullable1700000000007,
    // AddOwnerUpdatedAt1700000000009 (issue #28),
    // CreateFollowups1700000000010 (issue #30),
    // AddNextFollowUpAt1700000000011 (issue #31),
    // AddResultingStatusToFollowups1700000000012 (issue #32),
    // CreateTestDrives1700000000013 / SeedDemoVehicles1700000000014 (issue
    // #34), TestDriveConflictPrevention1700000000015 (issue #36), and
    // AddLeadCustomerDetails1700000000016 (issue #114) were all added after
    // this migration; undo those first, in reverse order, then undo this
    // migration itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'field_config'`,
    );
    expect(tables).toEqual([]);
  });
});
