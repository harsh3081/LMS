/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #114 Task 1.
 * Asserts the up-migration (1700000000016-AddLeadCustomerDetails) adds the
 * expected 22 nullable + 1 NOT NULL columns to `leads`, that the closed-set
 * CHECK constraints reject out-of-vocabulary values (and accept in-vocabulary
 * ones), that the pin-code CHECK is skipped under pg-mem exactly like the
 * mobile CHECK precedent, and that the down-migration reverses cleanly.
 * Mirrors test-drives-migration.spec.ts's structure/conventions.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('lead customer-details migration (issue #114 Task 1)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  async function seedParents() {
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L114') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D114') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('lead114@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    return { locationId: loc[0].location_id, dealerGroupId: dg[0].dealer_group_id, userId: user[0].user_id };
  }

  async function insertMinimalLead(overrides: Record<string, unknown> = {}) {
    const { locationId, dealerGroupId, userId } = await seedParents();
    const columns = ['owner_id', 'location_id', 'dealer_group_id', 'created_by', ...Object.keys(overrides)];
    const values = [userId, locationId, dealerGroupId, userId, ...Object.values(overrides)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const quotedColumns = columns.map((c) => `"${c}"`).join(', ');
    return dataSource.query(
      `INSERT INTO leads (${quotedColumns}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
  }

  it('up-migration adds the expected columns to leads', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`,
    );
    const names = columns.map((c) => c.column_name);
    const expectedNew = [
      'email',
      'customer_type',
      'city',
      'pin_code',
      'preferred_language',
      'variant',
      'fuel_type',
      'transmission',
      'budget_min',
      'budget_max',
      'buying_timeline',
      'exchange_interest',
      'current_vehicle',
      'kms_driven',
      'registration_number',
      'expected_value',
      'payment_mode',
      'preferred_financer',
      'down_payment_capacity',
      'referrer_name',
      'first_follow_up_at',
      'remarks',
      'communication_consent_verified',
    ];
    for (const col of expectedNew) {
      expect(names).toContain(col);
    }
    expect(expectedNew).toHaveLength(23);
  });

  it('communication_consent_verified defaults to false at the DB layer', async () => {
    dataSource = await createTestDataSource();
    const rows = await insertMinimalLead();
    expect(rows[0].communication_consent_verified).toBe(false);
  });

  it('all 22 non-consent columns are nullable', async () => {
    dataSource = await createTestDataSource();
    const rows = await insertMinimalLead();
    const nullableCols = [
      'email',
      'customer_type',
      'city',
      'pin_code',
      'preferred_language',
      'variant',
      'fuel_type',
      'transmission',
      'budget_min',
      'budget_max',
      'buying_timeline',
      'exchange_interest',
      'current_vehicle',
      'kms_driven',
      'registration_number',
      'expected_value',
      'payment_mode',
      'preferred_financer',
      'down_payment_capacity',
      'referrer_name',
      'first_follow_up_at',
      'remarks',
    ];
    for (const col of nullableCols) {
      expect(rows[0][col]).toBeNull();
    }
  });

  describe('closed-set CHECK constraints', () => {
    const cases: { column: string; valid: string; invalid: string }[] = [
      { column: 'customer_type', valid: 'Individual', invalid: 'Bogus' },
      { column: 'preferred_language', valid: 'Hindi', invalid: 'Klingon' },
      { column: 'fuel_type', valid: 'Petrol', invalid: 'Coal' },
      { column: 'transmission', valid: 'Manual', invalid: 'Semi-Auto' },
      { column: 'buying_timeline', valid: 'Immediate', invalid: 'Someday' },
      { column: 'payment_mode', valid: 'Cash', invalid: 'Barter' },
    ];

    for (const { column, valid, invalid } of cases) {
      it(`accepts an in-vocabulary value for ${column}`, async () => {
        dataSource = await createTestDataSource();
        const rows = await insertMinimalLead({ [column]: valid });
        expect(rows[0][column]).toBe(valid);
      });

      it(`rejects an out-of-vocabulary value for ${column}`, async () => {
        dataSource = await createTestDataSource();
        await expect(insertMinimalLead({ [column]: invalid })).rejects.toBeTruthy();
      });
    }
  });

  it('rejects an invalid pin_code against real-Postgres-style CHECK (skipped under pg-mem)', async () => {
    dataSource = await createTestDataSource();
    // NOTE: mirrors CreateLeads1700000000002's mobile-regex-CHECK precedent —
    // this migration skips the pin_code regex CHECK under E2E_DB_DRIVER=pgmem
    // (pg-mem's SQL engine does not implement the `~` operator), so this
    // assertion documents that the CHECK is absent in THIS test environment
    // rather than asserting a false-negative rejection. The DTO-level
    // @Matches validation (create-lead.controller.spec.ts) is the
    // always-active enforcement path proven end-to-end.
    const rows = await insertMinimalLead({ pin_code: '00000' });
    expect(rows[0].pin_code).toBe('00000');
  });

  it('down-migration reverses cleanly: drops all new columns', async () => {
    dataSource = await createTestDataSource();
    // issue #124 added AddEnquiryConversionDetails1700000000017 after this
    // one; undo that first, then undo this migration itself.
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'`,
    );
    const names = columns.map((c) => c.column_name);
    expect(names).not.toContain('email');
    expect(names).not.toContain('communication_consent_verified');
    expect(names).not.toContain('first_follow_up_at');

    // leads table itself must still exist.
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads'`,
    );
    expect(tables).toHaveLength(1);
  });
});
