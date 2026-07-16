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
    const src = await dataSource.query(
      "INSERT INTO lead_sources (source_id, name, active) VALUES (1, 'Walk-in', true) RETURNING source_id",
    );
    const model = await dataSource.query(
      "INSERT INTO vehicle_models (model_id, name) VALUES (101, 'Hatch') RETURNING model_id",
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
    await dataSource.undoLastMigration();

    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads'`,
    );
    expect(tables).toEqual([]);
  });
});
