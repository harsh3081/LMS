/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #26 Task 1.1.
 * Asserts the up-migration (1700000000005-DirectEnquiry) makes `lead_id`
 * nullable and adds the Direct-Enquiry columns (`entry_type` +
 * Lead-equivalent fields), and that the down-migration reverses cleanly.
 * Mirrors migration.spec.ts's structure/conventions (does NOT edit that
 * frozen-adjacent #24/#25 file — kept in its own file for isolation).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('direct-enquiry migration (issue #26 Task 1.1)', () => {
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
       VALUES ('direct@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    return { locationId: loc[0].location_id, dealerGroupId: dg[0].dealer_group_id, userId: user[0].user_id };
  }

  it('up-migration adds entry_type and the Lead-equivalent columns to enquiries', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string; is_nullable: string }[] = await dataSource.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const byName = new Map(columns.map((c) => [c.column_name, c.is_nullable]));

    expect(byName.has('entry_type')).toBe(true);
    expect(byName.has('customer_name')).toBe(true);
    expect(byName.has('mobile')).toBe(true);
    expect(byName.has('source_id')).toBe(true);
    expect(byName.has('model_id')).toBe(true);
  });

  it('lead_id is nullable (a Direct Enquiry has no parent Lead, AC4): a bare INSERT with lead_id omitted succeeds', async () => {
    // NOTE: information_schema.columns.is_nullable does not reflect an
    // ALTER COLUMN DROP NOT NULL in pg-mem's metadata layer (a known pg-mem
    // fidelity gap — verified separately against this sandbox's pg-mem
    // version; pg_attribute/regclass introspection isn't supported either),
    // so nullability is asserted functionally instead: an INSERT that omits
    // lead_id entirely (column defaults to SQL NULL) must succeed, which
    // would raise a NOT NULL violation if the constraint were still active.
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();

    const result = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in Nullability Check', '9876543210', 250000, 'LX', false, false, $1, $1, $2, $3) RETURNING lead_id`,
      [userId, locationId, dealerGroupId],
    );
    expect(result[0].lead_id).toBeNull();
  });

  it('entry_type defaults to CONVERTED for pre-existing-shape inserts (backward compatible with #25 rows)', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();
    const src = await dataSource.query(
      "INSERT INTO lead_sources (source_id, name, active) VALUES (910, 'Walk-in-Direct', true) RETURNING source_id",
    );
    const model = await dataSource.query(
      "INSERT INTO vehicle_models (model_id, name) VALUES (910, 'HatchDirect') RETURNING model_id",
    );
    const lead = await dataSource.query(
      `INSERT INTO leads (customer_name, mobile, source_id, model_id, owner_id, location_id, dealer_group_id, created_by)
       VALUES ('Asha','9876543210',$1,$2,$3,$4,$5,$3) RETURNING lead_id`,
      [src[0].source_id, model[0].model_id, userId, locationId, dealerGroupId],
    );

    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (lead_id, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ($1, 500000, 'VXi', true, false, $2, $2, $3, $4) RETURNING entry_type`,
      [lead[0].lead_id, userId, locationId, dealerGroupId],
    );
    expect(enquiry[0].entry_type).toBe('CONVERTED');
  });

  it('allows inserting a Direct Enquiry with a NULL lead_id and entry_type=DIRECT', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();

    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (lead_id, entry_type, customer_name, mobile, source_id, model_id, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES (NULL, 'DIRECT', 'Walk-in Customer', '9876543210', NULL, NULL, 300000, 'LX', false, true, $1, $1, $2, $3) RETURNING enquiry_id, lead_id, entry_type`,
      [userId, locationId, dealerGroupId],
    );
    expect(enquiry[0].lead_id).toBeNull();
    expect(enquiry[0].entry_type).toBe('DIRECT');
  });

  it('permits two Direct Enquiries with NULL lead_id (UNIQUE(lead_id) does not collide on NULL)', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();

    const insertDirect = () =>
      dataSource.query(
        `INSERT INTO enquiries (lead_id, entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
         VALUES (NULL, 'DIRECT', 'Walk-in', '9876543210', 300000, 'LX', false, true, $1, $1, $2, $3)`,
        [userId, locationId, dealerGroupId],
      );

    await expect(insertDirect()).resolves.toBeTruthy();
    await expect(insertDirect()).resolves.toBeTruthy();
  });

  it('down-migration reverses cleanly: drops the new columns and restores lead_id NOT NULL', async () => {
    dataSource = await createTestDataSource();
    // issue #27 added three migrations after this one
    // (CreateFieldConfig/MakeLeadFieldsNullable/SeedAdminUser), issue #28
    // added a fourth (AddOwnerUpdatedAt), issue #30 added a fifth
    // (CreateFollowups), issue #31 added a sixth (AddNextFollowUpAt), and
    // issue #32 added a seventh (AddResultingStatusToFollowups); undo those
    // first, in reverse order, then undo this migration itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const columnNames = columns.map((c) => c.column_name);
    expect(columnNames).not.toContain('entry_type');
    expect(columnNames).not.toContain('customer_name');

    const leadIdCol: { is_nullable: string }[] = await dataSource.query(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'enquiries' AND column_name = 'lead_id'`,
    );
    expect(leadIdCol[0].is_nullable).toBe('NO');
  });
});
