/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #34 Task 1.1.
 * Asserts the up-migration (1700000000013-CreateTestDrives) creates the
 * `demo_vehicles` and `test_drives` tables with the expected columns/FKs/
 * CHECK/indices, that SeedDemoVehicles1700000000014 seeds real rows, and
 * that both down-migrations reverse cleanly. Mirrors
 * followups-migration.spec.ts's structure/conventions.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('test-drives migrations (issue #34 Task 1.1)', () => {
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
       VALUES ('testdrive@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in', '9876543210', 300000, 'LX', false, false, $1, $1, $2, $3) RETURNING enquiry_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );
    const vehicle = await dataSource.query(
      `INSERT INTO demo_vehicles (model_id, variant, location_id) VALUES (101, 'LX', $1) RETURNING vehicle_id`,
      [loc[0].location_id],
    );
    return {
      locationId: loc[0].location_id,
      dealerGroupId: dg[0].dealer_group_id,
      userId: user[0].user_id,
      enquiryId: enquiry[0].enquiry_id,
      vehicleId: vehicle[0].vehicle_id,
    };
  }

  it('up-migration creates the demo_vehicles table with the expected columns', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'demo_vehicles'`,
    );
    expect(columns.map((c) => c.column_name).sort()).toEqual(
      ['vehicle_id', 'model_id', 'variant', 'location_id', 'is_active', 'created_at'].sort(),
    );
  });

  it('up-migration creates the test_drives table with the expected columns', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'test_drives'`,
    );
    expect(columns.map((c) => c.column_name).sort()).toEqual(
      [
        'test_drive_id',
        'enquiry_id',
        'vehicle_id',
        'slot_start',
        'slot_end',
        'status',
        'remarks',
        'booked_by',
        'location_id',
        'dealer_group_id',
        'created_at',
        'updated_at',
      ].sort(),
    );
  });

  it('allows inserting a Test Drive with status defaulting to Booked', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId, vehicleId } = await seedParents();

    const result = await dataSource.query(
      `INSERT INTO test_drives (enquiry_id, vehicle_id, slot_start, slot_end, booked_by, location_id, dealer_group_id)
       VALUES ($1, $2, '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', $3, $4, $5) RETURNING status`,
      [enquiryId, vehicleId, userId, locationId, dealerGroupId],
    );
    expect(result[0].status).toBe('Booked');
  });

  it('CHECK constraint rejects an out-of-set status value (only "Booked" is legal until issue #39 widens it)', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId, vehicleId } = await seedParents();

    await expect(
      dataSource.query(
        `INSERT INTO test_drives (enquiry_id, vehicle_id, slot_start, slot_end, status, booked_by, location_id, dealer_group_id)
         VALUES ($1, $2, '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', 'Completed', $3, $4, $5)`,
        [enquiryId, vehicleId, userId, locationId, dealerGroupId],
      ),
    ).rejects.toBeTruthy();
  });

  it('FK constraint rejects a non-existent vehicle_id', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    await expect(
      dataSource.query(
        `INSERT INTO test_drives (enquiry_id, vehicle_id, slot_start, slot_end, booked_by, location_id, dealer_group_id)
         VALUES ($1, '00000000-0000-0000-0000-000000000000', '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', $2, $3, $4)`,
        [enquiryId, userId, locationId, dealerGroupId],
      ),
    ).rejects.toBeTruthy();
  });

  it('FK constraint rejects a non-existent enquiry_id', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, vehicleId } = await seedParents();

    await expect(
      dataSource.query(
        `INSERT INTO test_drives (enquiry_id, vehicle_id, slot_start, slot_end, booked_by, location_id, dealer_group_id)
         VALUES ('00000000-0000-0000-0000-000000000000', $1, '2026-08-01T10:00:00Z', '2026-08-01T10:30:00Z', $2, $3, $4)`,
        [vehicleId, userId, locationId, dealerGroupId],
      ),
    ).rejects.toBeTruthy();
  });

  it('SeedDemoVehicles1700000000014 seeds at least 3 demo vehicles at the SeedAdminUser location', async () => {
    dataSource = await createTestDataSource();
    const rows: { vehicle_id: string; model_id: number; variant: string }[] = await dataSource.query(
      `SELECT vehicle_id, model_id, variant FROM demo_vehicles WHERE location_id = '33333333-0000-0000-0000-000000000099'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('down-migration reverses cleanly: SeedDemoVehicles1700000000014 removes only its own seeded rows', async () => {
    dataSource = await createTestDataSource();
    await dataSource.undoLastMigration();

    const rows: { vehicle_id: string }[] = await dataSource.query(
      `SELECT vehicle_id FROM demo_vehicles WHERE location_id = '33333333-0000-0000-0000-000000000099'`,
    );
    expect(rows).toHaveLength(0);

    // demo_vehicles table itself must still exist (only its seeded rows were removed).
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'demo_vehicles'`,
    );
    expect(tables).toHaveLength(1);
  });

  it('down-migration reverses cleanly: drops test_drives and demo_vehicles (CreateTestDrives1700000000013)', async () => {
    dataSource = await createTestDataSource();
    await dataSource.undoLastMigration(); // SeedDemoVehicles1700000000014
    await dataSource.undoLastMigration(); // CreateTestDrives1700000000013

    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('test_drives', 'demo_vehicles')`,
    );
    expect(tables).toEqual([]);
  });
});
