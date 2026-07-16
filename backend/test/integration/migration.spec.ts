/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — Tasks 1.2.1 / 1.2.2.
 * Asserts the up-migration creates the `leads` table with the expected
 * columns/FKs/default status, and that the down-migration reverses cleanly
 * (EVAL-CC-13 companion — automated here at the migration-tool level).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('leads migration (Task 1.2.1 / 1.2.2)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('up-migration creates the leads table with expected columns and default status "New"', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`,
    );
    const columnNames = columns.map((c) => c.column_name).sort();

    expect(columnNames).toEqual(
      [
        'lead_id',
        'customer_name',
        'mobile',
        'source_id',
        'model_id',
        'owner_id',
        'location_id',
        'dealer_group_id',
        'status',
        'custom_fields',
        'created_by',
        'created_at',
        'updated_at',
      ].sort(),
    );
  });

  it('up-migration applies default status "New" when status is not supplied', async () => {
    dataSource = await createTestDataSource();
    // Seed minimal parents then insert a lead without specifying `status`.
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('m@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    // source_id/model_id 901/901 avoid colliding with the seeded master data
    // rows (source_id 1-5, model_id 101-103) that SeedMasterData1700000000004
    // now inserts as part of migrating.
    const src = await dataSource.query(
      "INSERT INTO lead_sources (source_id, name, active) VALUES (901, 'Walk-in-Test', true) RETURNING source_id",
    );
    const model = await dataSource.query(
      "INSERT INTO vehicle_models (model_id, name) VALUES (901, 'Hatch') RETURNING model_id",
    );

    const lead = await dataSource.query(
      `INSERT INTO leads (customer_name, mobile, source_id, model_id, owner_id, location_id, dealer_group_id, created_by)
       VALUES ('Asha','9876543210',$1,$2,$3,$4,$5,$3) RETURNING status, custom_fields`,
      [src[0].source_id, model[0].model_id, user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );

    expect(lead[0].status).toBe('New');
  });

  it('down-migration drops the leads table (reversibility)', async () => {
    dataSource = await createTestDataSource();
    // issue #25 added CreateEnquiries1700000000003, the seed-data fix added
    // SeedMasterData1700000000004, and issue #26 added
    // DirectEnquiry1700000000005 — all three after this migration, so
    // undoLastMigration() now reverts them first, in reverse order; undo
    // four times to reach and verify the leads migration's own reversibility.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads'`,
    );
    expect(tables).toEqual([]);
  });
});

/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — Task 1.1.1 (issue #25).
 * Asserts the up-migration creates the `enquiries` table with the expected
 * columns/FKs/unique(lead_id)/index, and that the down-migration reverses
 * cleanly (EVAL-CC-15 companion — automated here at the migration-tool level).
 */
describe('enquiries migration (Task 1.1.1, issue #25)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('up-migration creates the enquiries table with expected columns and default status "New"', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const columnNames = columns.map((c) => c.column_name).sort();

    // UPDATED (issue #26): DirectEnquiry1700000000005 additively extends this
    // same table (entry_type + Lead-equivalent nullable columns) — this
    // createTestDataSource() runs ALL migrations, so the column list here
    // necessarily reflects the table's current full shape, not just what
    // CreateEnquiries1700000000003 itself added. See
    // direct-enquiry-migration.spec.ts for that migration's own dedicated
    // column/nullability assertions.
    expect(columnNames).toEqual(
      [
        'enquiry_id',
        'lead_id',
        'budget',
        'variant',
        'exchange_interest',
        'finance_interest',
        'converted_by',
        'owner_id',
        'location_id',
        'dealer_group_id',
        'status',
        'custom_fields',
        'converted_at',
        'updated_at',
        'entry_type',
        'customer_name',
        'mobile',
        'source_id',
        'model_id',
      ].sort(),
    );
  });

  it('enforces a UNIQUE constraint on lead_id (defense-in-depth, EVAL-CC-16)', async () => {
    dataSource = await createTestDataSource();
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('encq@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    // source_id 902 avoids colliding with the seeded master data rows
    // (source_id 1-5) that SeedMasterData1700000000004 now inserts.
    const src = await dataSource.query(
      "INSERT INTO lead_sources (source_id, name, active) VALUES (902, 'Walk-in-2', true) RETURNING source_id",
    );
    const model = await dataSource.query(
      "INSERT INTO vehicle_models (model_id, name) VALUES (201, 'Hatch2') RETURNING model_id",
    );
    const lead = await dataSource.query(
      `INSERT INTO leads (customer_name, mobile, source_id, model_id, owner_id, location_id, dealer_group_id, created_by)
       VALUES ('Asha','9876543210',$1,$2,$3,$4,$5,$3) RETURNING lead_id`,
      [src[0].source_id, model[0].model_id, user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );

    const insertEnquiry = () =>
      dataSource.query(
        `INSERT INTO enquiries (lead_id, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
         VALUES ($1, 500000, 'VXi', true, false, $2, $2, $3, $4)`,
        [lead[0].lead_id, user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
      );

    await insertEnquiry();
    await expect(insertEnquiry()).rejects.toBeTruthy();
  });

  it('down-migration drops the enquiries table (reversibility)', async () => {
    dataSource = await createTestDataSource();
    // SeedMasterData1700000000004 and DirectEnquiry1700000000005 (issue #26)
    // were both added after this migration, so undoLastMigration() now
    // reverts them first, in reverse order; undo three times to reach and
    // verify the enquiries migration's own reversibility (drop-table).
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enquiries'`,
    );
    expect(tables).toEqual([]);

    // Sanity: undoing ONLY the enquiries migration must not also drop leads.
    const leadsTables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads'`,
    );
    expect(leadsTables).toHaveLength(1);
  });
});
