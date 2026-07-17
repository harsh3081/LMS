/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #31 Task 1.1.
 * Asserts the up-migration (1700000000011-AddNextFollowUpAt) adds the
 * nullable `next_follow_up_at` column to `followups` (AC1-AC4), and that the
 * down-migration reverses cleanly. Mirrors owner-updated-at-migration.spec.ts's
 * conventions (kept in its own file for isolation, does not edit #30's
 * frozen-adjacent followups-migration.spec.ts beyond the one undo-count fix
 * documented in that file's own comment).
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('next-follow-up-at migration (issue #31 Task 1.1)', () => {
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
       VALUES ('next-followup@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
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

  it('up-migration adds a nullable next_follow_up_at column to followups', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups'`,
    );
    expect(columns.map((c) => c.column_name)).toContain('next_follow_up_at');
  });

  it('next_follow_up_at defaults to NULL on a bare Follow-up insert', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    const followup = await dataSource.query(
      `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id)
       VALUES ($1, 'Call', 'No next follow-up set', $2, $3, $4) RETURNING next_follow_up_at`,
      [enquiryId, userId, locationId, dealerGroupId],
    );
    expect(followup[0].next_follow_up_at).toBeNull();
  });

  it('allows inserting a Follow-up with an explicit next_follow_up_at value', async () => {
    dataSource = await createTestDataSource();
    const { locationId, dealerGroupId, userId, enquiryId } = await seedParents();

    const followup = await dataSource.query(
      `INSERT INTO followups (enquiry_id, type, remarks, logged_by, location_id, dealer_group_id, next_follow_up_at)
       VALUES ($1, 'Call', 'Scheduled next call', $2, $3, $4, '2026-08-01T00:00:00Z') RETURNING next_follow_up_at`,
      [enquiryId, userId, locationId, dealerGroupId],
    );
    expect(new Date(followup[0].next_follow_up_at).toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('down-migration reverses cleanly: drops next_follow_up_at from followups', async () => {
    dataSource = await createTestDataSource();
    // issue #32 added AddResultingStatusToFollowups1700000000012 after this
    // one; undo that first, then undo this migration itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'followups'`,
    );
    expect(columns.map((c) => c.column_name)).not.toContain('next_follow_up_at');

    // Sanity: undoing ONLY this migration must not also drop the followups table itself.
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'followups'`,
    );
    expect(tables).toHaveLength(1);
  });
});
