/**
 * RED->GREEN (Inside-Out, Infrastructure Layer) — issue #124 Task 1.
 * Asserts the up-migration (1700000000017-AddEnquiryConversionDetails) adds
 * the expected 33 new columns to `enquiries` (29 nullable + 4 NOT NULL
 * DEFAULT false Document Checklist booleans), that the 12 closed-set CHECK
 * constraints reject out-of-vocabulary values (and accept in-vocabulary
 * ones), and that the down-migration reverses cleanly. Mirrors
 * lead-customer-details-migration.spec.ts's structure/conventions exactly.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';

describe('enquiry conversion-details migration (issue #124 Task 1)', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  async function seedParents() {
    const loc = await dataSource.query("INSERT INTO locations (name) VALUES ('L124') RETURNING location_id");
    const dg = await dataSource.query("INSERT INTO dealer_groups (name) VALUES ('D124') RETURNING dealer_group_id");
    const user = await dataSource.query(
      `INSERT INTO users (email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ('enq124@x.com','h','DSE','M',$1,$2,'[]') RETURNING user_id`,
      [loc[0].location_id, dg[0].dealer_group_id],
    );
    const lead = await dataSource.query(
      `INSERT INTO leads (owner_id, location_id, dealer_group_id, created_by) VALUES ($1,$2,$3,$1) RETURNING lead_id`,
      [user[0].user_id, loc[0].location_id, dg[0].dealer_group_id],
    );
    return {
      locationId: loc[0].location_id,
      dealerGroupId: dg[0].dealer_group_id,
      userId: user[0].user_id,
      leadId: lead[0].lead_id,
    };
  }

  async function insertMinimalEnquiry(overrides: Record<string, unknown> = {}) {
    const { locationId, dealerGroupId, userId, leadId } = await seedParents();
    const base: Record<string, unknown> = {
      lead_id: leadId,
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchange_interest: true,
      finance_interest: false,
      converted_by: userId,
      owner_id: userId,
      location_id: locationId,
      dealer_group_id: dealerGroupId,
      ...overrides,
    };
    const columns = Object.keys(base);
    const values = Object.values(base);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const quotedColumns = columns.map((c) => `"${c}"`).join(', ');
    return dataSource.query(`INSERT INTO enquiries (${quotedColumns}) VALUES (${placeholders}) RETURNING *`, values);
  }

  it('up-migration adds the expected 34 columns to enquiries', async () => {
    dataSource = await createTestDataSource();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const names = columns.map((c) => c.column_name);
    const expectedNew = [
      'fuel_type',
      'transmission',
      'color_first_preference',
      'color_second_preference',
      'accessories_interest',
      'competitor_consideration',
      'contact_verified',
      'intent_rating',
      'expected_closure_date',
      'showroom_visits',
      'quotation_number',
      'quoted_on_road_price',
      'discount_discussed',
      'insurance_preference',
      'extended_warranty_interest',
      'corporate_discount_eligible',
      'finance_application_status',
      'financier',
      'loan_amount_sought',
      'tenure_and_emi_discussed',
      'exchange_evaluation_status',
      'exchange_evaluated_by',
      'exchange_evaluated_price',
      'exchange_customer_expectation',
      'test_drive_status',
      'test_drive_date_time',
      'quotation_shared_via',
      'next_action_owner_id',
      'test_drive_feedback',
      'pan_card_verified',
      'address_proof_verified',
      'income_proof_verified',
      'gst_details_verified',
    ];
    for (const col of expectedNew) {
      expect(names).toContain(col);
    }
    expect(expectedNew).toHaveLength(33);
  });

  it('the 28 non-checklist new columns are nullable', async () => {
    dataSource = await createTestDataSource();
    const rows = await insertMinimalEnquiry();
    const nullableCols = [
      'fuel_type',
      'transmission',
      'color_first_preference',
      'color_second_preference',
      'accessories_interest',
      'competitor_consideration',
      'contact_verified',
      'intent_rating',
      'expected_closure_date',
      'showroom_visits',
      'quotation_number',
      'quoted_on_road_price',
      'discount_discussed',
      'insurance_preference',
      'extended_warranty_interest',
      'corporate_discount_eligible',
      'finance_application_status',
      'financier',
      'loan_amount_sought',
      'tenure_and_emi_discussed',
      'exchange_evaluation_status',
      'exchange_evaluated_by',
      'exchange_evaluated_price',
      'exchange_customer_expectation',
      'test_drive_status',
      'test_drive_date_time',
      'quotation_shared_via',
      'next_action_owner_id',
      'test_drive_feedback',
    ];
    for (const col of nullableCols) {
      expect(rows[0][col]).toBeNull();
    }
  });

  it('the 4 Document Checklist booleans default to false at the DB layer', async () => {
    dataSource = await createTestDataSource();
    const rows = await insertMinimalEnquiry();
    expect(rows[0].pan_card_verified).toBe(false);
    expect(rows[0].address_proof_verified).toBe(false);
    expect(rows[0].income_proof_verified).toBe(false);
    expect(rows[0].gst_details_verified).toBe(false);
  });

  describe('closed-set CHECK constraints', () => {
    const cases: { column: string; valid: string; invalid: string }[] = [
      { column: 'fuel_type', valid: 'Petrol', invalid: 'Coal' },
      { column: 'transmission', valid: 'Manual', invalid: 'Semi-Auto' },
      { column: 'contact_verified', valid: 'OTP Verified', invalid: 'Carrier Pigeon' },
      { column: 'intent_rating', valid: 'Hot', invalid: 'Lukewarm' },
      { column: 'showroom_visits', valid: '3+', invalid: '5' },
      { column: 'insurance_preference', valid: 'Dealer In-house', invalid: 'Bogus' },
      { column: 'extended_warranty_interest', valid: 'Interested', invalid: 'Maybe' },
      { column: 'finance_application_status', valid: 'Login Done', invalid: 'Pending Review' },
      { column: 'financier', valid: 'HDFC Bank', invalid: 'Bank of Nowhere' },
      { column: 'exchange_evaluation_status', valid: 'Completed', invalid: 'In Progress' },
      { column: 'test_drive_status', valid: 'Declined', invalid: 'Postponed' },
      { column: 'quotation_shared_via', valid: 'WhatsApp', invalid: 'Carrier Pigeon' },
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

  it('down-migration reverses cleanly: drops all new columns and constraints', async () => {
    dataSource = await createTestDataSource();
    await dataSource.undoLastMigration();

    const columns: { column_name: string }[] = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'enquiries'`,
    );
    const names = columns.map((c) => c.column_name);
    expect(names).not.toContain('fuel_type');
    expect(names).not.toContain('pan_card_verified');
    expect(names).not.toContain('next_action_owner_id');

    // enquiries table itself must still exist.
    const tables: { table_name: string }[] = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'enquiries'`,
    );
    expect(tables).toHaveLength(1);
  });
});
