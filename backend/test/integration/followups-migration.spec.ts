/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #30 Task 1.1.
 * Asserts the up-migration (1700000000010-CreateFollowups) creates the
 * `followups` table with the expected columns/FKs/CHECK/index, and that the
 * down-migration reverses cleanly. Mirrors direct-enquiry-migration.spec.ts's
 * structure/conventions.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('followups migration (issue #30 Task 1.1)', () => {
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
       VALUES ('followup@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in', '9876543210', 300000, 'LX', false, false, $1, $1, $2, $3) RETURNING enquiry_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );
    return {
      locationId: loc[0].location_id,
      dealerGroupId: dg[0].dealer_group_id,
      userId: user[0].user_id,
      enquiryId: enquiry[0].enquiry_id,
    };
  }

  it('up-migration creates the followups table with the expected columns', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups'`,
    );
    const columnNames = columns.map((c) => c.column_name);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'followup_id',
        'enquiry_id',
        'type',
        'remarks',
        'logged_by',
        'location_id',
        'dealer_group_id',
        'logged_at',
      ]),
    );
  });

  it('allows inserting a Follow-up with a valid type against a real Enquiry', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    const result = await dataSource.query(
      `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id)
       VALUES ($1, 'Home Visit', 'Discussed financing options.', $2, $3, $4) RETURNING followup_id, type`,
      [enquiryId, userId, locationId, dealerGroupId],
    );
    expect(result[0].type).toBe('Home Visit');
  });

  it('CHECK constraint rejects an out-of-set type value', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    await expect(
      dataSource.query(
        `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id)
         VALUES ($1, 'Carrier Pigeon', 'Not a real type', $2, $3, $4)`,
        [enquiryId, userId, locationId, dealerGroupId],
      ),
    ).rejects.toBeTruthy();
  });

  it('FK constraint rejects a non-existent enquiry_id', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId } = await seedParents();

    await expect(
      dataSource.query(
        `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id)
         VALUES ('00000000-0000-0000-0000-000000000000', 'Call', 'Orphan follow-up', $1, $2, $3)`,
        [userId, locationId, dealerGroupId],
      ),
    ).rejects.toBeTruthy();
  });

  it('down-migration reverses cleanly: drops the followups table', async () => {
    dataSource = await createTestDataSource();
    // issue #31 added AddNextFollowUpAt1700000000011, issue #32 added
    // AddResultingStatusToFollowups1700000000012, and issue #34 added
    // CreateTestDrives1700000000013 / SeedDemoVehicles1700000000014, all
    // after this migration; undo those first, then undo this migration
    // itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups'`,
    );
    expect(columns).toHaveLength(0);
  });
});

/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #32 (AC2: a
 * Follow-up entry must be able to show "this entry is the one that changed
 * status to Lost/Booked"). Mirrors next-follow-up-at-migration.spec.ts's
 * structure for the sibling additive nullable column.
 */
describe('followups migration: resulting_status column (issue #32, AC2)', () => {
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
       VALUES ('followup-status2@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in', '9876543212', 300000, 'LX', false, false, $1, $1, $2, $3) RETURNING enquiry_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );
    return {
      locationId: loc[0].location_id,
      dealerGroupId: dg[0].dealer_group_id,
      userId: user[0].user_id,
      enquiryId: enquiry[0].enquiry_id,
    };
  }

  it('up-migration adds a resulting_status column to followups', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups'`,
    );
    expect(columns.map((c) => c.column_name)).toContain('resulting_status');
  });

  // NOTE: `information_schema.columns.is_nullable` is not reliably reported
  // by pg-mem for a bare `ALTER TABLE ADD COLUMN` (no NOT NULL clause is
  // ever emitted by this migration) — mirrors
  // next-follow-up-at-migration.spec.ts's convention of proving
  // nullability behaviorally (a bare insert omitting the column) rather
  // than via the information_schema flag.
  it('resulting_status defaults to NULL on a bare Follow-up insert (no enquiryStatus set)', async () => {
    dataSource = await createTestDataSource();
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('followup-status@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    const enquiry = await dataSource.query(
      `INSERT INTO enquiries (entry_type, customer_name, mobile, budget, variant, exchange_interest, finance_interest, converted_by, owner_id, location_id, dealer_group_id)
       VALUES ('DIRECT', 'Walk-in', '9876543211', 300000, 'LX', false, false, $1, $1, $2, $3) RETURNING enquiry_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );

    const followup = await dataSource.query(
      `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id)
       VALUES ($1, 'Call', 'No status change', $2, $3, $4) RETURNING resulting_status`,
      [enquiry[0].enquiry_id, user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );
    expect(followup[0].resulting_status).toBeNull();
  });

  it('allows inserting a Follow-up with an explicit resulting_status value', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    const followup = await dataSource.query(
      `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id, resulting_status)
       VALUES ($1, 'Call', 'Closing out.', $2, $3, $4, 'Lost') RETURNING resulting_status`,
      [enquiryId, userId, locationId, dealerGroupId],
    );
    expect(followup[0].resulting_status).toBe('Lost');
  });

  it('down-migration reverses cleanly: drops the resulting_status column only', async () => {
    dataSource = await createTestDataSource();
    // issue #34 added CreateTestDrives1700000000013 /
    // SeedDemoVehicles1700000000014 after this migration; undo those first,
    // then undo this migration itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups' AND column_name = 'resulting_status'`,
    );
    expect(columns).toHaveLength(0);

    // The rest of the table (including the sibling next_follow_up_at column
    // from #31) is untouched.
    const remaining: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups' AND column_name = 'next_follow_up_at'`,
    );
    expect(remaining).toHaveLength(1);
  });
});
