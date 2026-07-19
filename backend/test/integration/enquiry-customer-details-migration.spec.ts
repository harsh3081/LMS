/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #134 Task 1.
 * Asserts the up-migration (1700000000018-AddEnquiryCustomerDetails) adds
 * the expected 5 nullable columns to `enquiries`, that the two closed-set
 * CHECK constraints reject out-of-vocabulary values (and accept
 * in-vocabulary ones), that the pin-code CHECK is skipped under pg-mem
 * exactly like the mobile/leads.pin_code CHECK precedents, and that the
 * down-migration reverses cleanly. Mirrors
 * lead-customer-details-migration.spec.ts / enquiry-conversion-details-
 * migration.spec.ts's structure/conventions exactly.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('enquiry customer-details migration (issue #134 Task 1)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  async function seedParents() {
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L134') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D134') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('enq134@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    return { locationId: loc[0].location_id, dealerGroupId: dg[0].dealer_group_id, userId: user[0].user_id };
  }

  async function insertMinimalEnquiry(overrides: Record<string, unknown> = {}) {
    const { locationId, dealerGroupId, userId } = await seedParents();
    const base: Record<string, unknown> = {
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchange_interest: true,
      finance_interest: false,
      converted_by: userId,
      owner_id: userId,
      location_id: locationId,
      dealer_group_id: dealerGroupId,
      entry_type: 'DIRECT',
      ...overrides,
    };
    const columns = Object.keys(base);
    const values = Object.values(base);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const quotedColumns = columns.map((c) => `"${c}"`).join(', ');
    return dataSource.query(`INSERT INTO enquiries (${quotedColumns}) VALUES (${placeholders}) RETURNING *`, values);
  }

  it('up-migration adds the expected 5 columns to enquiries', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const names = columns.map((c) => c.column_name);
    const expectedNew = ['email', 'customer_type', 'city', 'pin_code', 'preferred_language'];
    for (const col of expectedNew) {
      expect(names).toContain(col);
    }
    expect(expectedNew).toHaveLength(5);
  });

  it('all 5 new columns are nullable', async () => {
    dataSource = await createTestDataSource();
    const rows = await insertMinimalEnquiry();
    expect(rows[0].email).toBeNull();
    expect(rows[0].customer_type).toBeNull();
    expect(rows[0].city).toBeNull();
    expect(rows[0].pin_code).toBeNull();
    expect(rows[0].preferred_language).toBeNull();
  });

  describe('closed-set CHECK constraints', () => {
    const cases: { column: string; valid: string; invalid: string }[] = [
      { column: 'customer_type', valid: 'Individual', invalid: 'Bogus' },
      { column: 'preferred_language', valid: 'Hindi', invalid: 'Klingon' },
    ];

    for (const { column, valid, invalid } of cases) {
      it(`accepts an in-vocabulary value for ${column}`, async () => {
        dataSource = await createTestDataSource();
        const rows = await insertMinimalEnquiry({ [column]: valid });
        expect(rows[0][column]).toBe(valid);
      });

      it(`rejects an out-of-vocabulary value for ${column}`, async () => {
        dataSource = await createTestDataSource();
        await expect(insertMinimalEnquiry({ [column]: invalid })).rejects.toBeTruthy();
      });
    }
  });

  it('rejects an invalid pin_code against real-Postgres-style CHECK (skipped under pg-mem)', async () => {
    dataSource = await createTestDataSource();
    // NOTE: mirrors AddLeadCustomerDetails1700000000016's pin_code-regex-CHECK
    // precedent — this migration skips the pin_code regex CHECK under
    // E2E_DB_DRIVER=pgmem (pg-mem's SQL engine does not implement the `~`
    // operator), so this assertion documents that the CHECK is absent in
    // THIS test environment rather than asserting a false-negative rejection.
    // The DTO-level @Matches validation is the always-active enforcement path.
    const rows = await insertMinimalEnquiry({ pin_code: '00000' });
    expect(rows[0].pin_code).toBe('00000');
  });

  it('down-migration reverses cleanly: drops all 5 new columns', async () => {
    dataSource = await createTestDataSource();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const names = columns.map((c) => c.column_name);
    expect(names).not.toContain('email');
    expect(names).not.toContain('customer_type');
    expect(names).not.toContain('city');
    expect(names).not.toContain('pin_code');
    expect(names).not.toContain('preferred_language');

    // enquiries table itself must still exist.
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enquiries'`,
    );
    expect(tables).toHaveLength(1);
  });
});
