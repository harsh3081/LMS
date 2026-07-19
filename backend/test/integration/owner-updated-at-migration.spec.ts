/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #28 Task 1.1.
 * Asserts the up-migration (1700000000009-AddOwnerUpdatedAt) adds the
 * nullable `owner_updated_at` column to both `leads` and `enquiries`
 * (AC4), and that the down-migration reverses cleanly. Mirrors
 * direct-enquiry-migration.spec.ts / field-config-migration.spec.ts's
 * conventions (kept in its own file for isolation, does not edit those).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('owner-updated-at migration (issue #28 Task 1.1)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  async function seedParents() {
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('owner-meta@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    return { locationId: loc[0].location_id, dealerGroupId: dg[0].dealer_group_id, userId: user[0].user_id };
  }

  it('up-migration adds a nullable owner_updated_at column to leads and enquiries', async () => {
    dataSource = await createTestDataSource();

    const leadsColumns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`,
    );
    expect(leadsColumns.map((c) => c.column_name)).toContain('owner_updated_at');

    const enquiriesColumns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    expect(enquiriesColumns.map((c) => c.column_name)).toContain('owner_updated_at');
  });

  it('owner_updated_at defaults to NULL on a bare Lead insert (never reassigned since creation)', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();
    const src = await dataSource.query(
      "INSERT INTO lead_sources (source_id, name, active) VALUES (920, 'Walk-in-OwnerMeta', true) RETURNING source_id",
    );
    const model = await dataSource.query(
      "INSERT INTO vehicle_models (model_id, name) VALUES (920, 'HatchOwnerMeta') RETURNING model_id",
    );

    const lead = await dataSource.query(
      `INSERT INTO leads (customer_name, mobile, source_id, model_id, owner_id, location_id, dealer_group_id, created_by)
       VALUES ('Asha','9876543210',$1,$2,$3,$4,$5,$3) RETURNING owner_updated_at`,
      [src[0].source_id, model[0].model_id, userId, locationId, dealerGroupId],
    );
    expect(lead[0].owner_updated_at).toBeNull();
  });

  it('owner_updated_at defaults to NULL on a bare Enquiry insert', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();

    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in Owner Meta', '9876543211', 250000, 'LX', false, false, $1, $1, $2, $3) RETURNING owner_updated_at`,
      [userId, locationId, dealerGroupId],
    );
    expect(enquiry[0].owner_updated_at).toBeNull();
  });

  it('down-migration reverses cleanly: drops owner_updated_at from both tables', async () => {
    dataSource = await createTestDataSource();
    // issue #30 added CreateFollowups1700000000010, issue #31 added
    // AddNextFollowUpAt1700000000011, issue #32 added
    // AddResultingStatusToFollowups1700000000012, issue #34 added
    // CreateTestDrives1700000000013 / SeedDemoVehicles1700000000014, issue
    // #36 added TestDriveConflictPrevention1700000000015, issue #114 added
    // AddLeadCustomerDetails1700000000016, issue #124 added
    // AddEnquiryConversionDetails1700000000017, and issue #134 added
    // AddEnquiryCustomerDetails1700000000018, after this one; undo those
    // first, in reverse order, then undo this migration itself.
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

    const leadsColumns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`,
    );
    expect(leadsColumns.map((c) => c.column_name)).not.toContain('owner_updated_at');

    const enquiriesColumns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    expect(enquiriesColumns.map((c) => c.column_name)).not.toContain('owner_updated_at');

    // Sanity: undoing ONLY this migration must not also drop the tables themselves.
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('leads', 'enquiries')`,
    );
    expect(tables.map((t) => t.table_name).sort()).toEqual(['enquiries', 'leads']);
  });
});
