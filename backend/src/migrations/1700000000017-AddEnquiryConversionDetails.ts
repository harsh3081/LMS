import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `enquiries` schema for issue #124 ("Rewrite Convert Lead to
 * Enquiry as a sectioned form") — 33 new columns backing the new form's
 * sections 1 (Vehicle Information, partial — `model_id` is REUSED from the
 * existing nullable column added by CreateEnquiries1700000000003, only
 * `fuel_type`/`transmission`/the 4 free-text fields are new here), 2
 * (Qualification), 3 (Commercial), 4 (Finance detail), 5 (Exchange detail),
 * 6 (Test Drive & Engagement), and 7 (Document Checklist). Purely additive —
 * does not edit any frozen prior migration file. Mirrors
 * AddLeadCustomerDetails1700000000016's `ALTER TABLE ... ADD COLUMN` +
 * NULL-safe CHECK + raw-SQL reversible `down()` conventions exactly.
 *
 * Schema decisions (documented here — no separate tech-design for this
 * fast-tracked Story; see .phoenix-os/project/specs/124/NOTES.md for the
 * full field-by-field rationale):
 *
 * 1. Every column below is NULLABLE with no default EXCEPT the 4 Document
 *    Checklist booleans (`pan_card_verified`/`address_proof_verified`/
 *    `income_proof_verified`/`gst_details_verified`), which are NOT NULL
 *    DEFAULT false — every new field is optional (issue #124 AC4), and a
 *    checkbox's natural "unset" state is unchecked/false, not a third
 *    NULL/tri-state (unlike `leads.exchange_interest`, which is nullable
 *    because it GATES a detail group and "not yet stated" must be
 *    distinguishable from "no exchange vehicle" — no such gating exists for
 *    an independent document checkbox). Documented as a deliberate judgment
 *    call, not a pre-decided requirement.
 *
 * 2. `fuel_type`/`transmission` reuse the EXACT SAME closed-set vocabularies
 *    as `leads.fuel_type`/`leads.transmission` (issue #114) — the entity
 *    layer imports `FUEL_TYPES`/`TRANSMISSIONS` directly from
 *    `leads/entities/lead.entity.ts` rather than duplicating the literal
 *    arrays a third time (this is an existing intra-backend cross-module
 *    import — enquiries.service.ts already imports `LeadEntity`/
 *    `LEAD_STATUS_CONVERTED` from that same file — NOT the frontend/backend
 *    "two independent packages" duplication convention, which does not apply
 *    within one backend). The CHECK constraints below use the identical
 *    value lists so DB and DTO cannot drift.
 *
 * 3. Twelve closed-set dropdown columns each carry a NULL-safe CHECK
 *    constraint (`"col" IS NULL OR "col" IN (...)`, mirrors
 *    AddLeadCustomerDetails1700000000016's established pg-mem-safe pattern
 *    exactly — see that migration's own comment for why the `IS NULL OR`
 *    form is used instead of relying on standard three-valued-logic
 *    NULL-passes-a-CHECK semantics): `fuel_type`, `transmission`,
 *    `contact_verified`, `intent_rating`, `showroom_visits`,
 *    `insurance_preference`, `extended_warranty_interest`,
 *    `finance_application_status`, `financier`, `exchange_evaluation_status`,
 *    `test_drive_status`, `quotation_shared_via` — every closed-set column
 *    in this migration gets one.
 *
 * 4. `intent_rating` (Hot/Warm/Cold) is a NEW, DISTINCT vocabulary from
 *    `EnquiryEntity.status`'s existing `ENQUIRY_STATUS_HOT/WARM/COLD`
 *    (issue #33) — those describe the Enquiry's own lifecycle status set via
 *    a Follow-up; `intent_rating` is a standalone descriptive attribute
 *    captured at conversion time. Fresh `INTENT_RATINGS` constant, not a
 *    reuse of `ENQUIRY_ALL_LOGGABLE_STATUSES`, even though the string values
 *    happen to overlap for Hot/Warm/Cold — this is intentional, not an
 *    oversight (see NOTES.md).
 *
 * 5. `quoted_on_road_price`, `loan_amount_sought`, `exchange_evaluated_price`,
 *    `exchange_customer_expectation` are all `bigint` (INR whole rupees),
 *    mirroring `enquiries.budget`'s existing bigint precedent for
 *    large-integer round-tripping; the entity applies the same
 *    string-to-number transformer on read that `EnquiryEntity.budget` uses.
 *
 * 6. `discount_discussed`, `tenure_and_emi_discussed`,
 *    `corporate_discount_eligible` are plain `text` (free text) per issue
 *    #124's explicit instruction — real-world values are compound
 *    (e.g. "60 months, Rs 33,500/mo", "Rs 35,000 + corporate offer") and not
 *    cleanly numeric/enumerable.
 *
 * 7. `showroom_visits` is `varchar` (closed set '0'/'1'/'2'/'3+'), NOT an
 *    `int` — "3+" is not representable as a plain integer, and the field is
 *    a bucketed dropdown, not a raw count entry.
 *
 * 8. `next_action_owner_id` carries a nullable FK to `users(user_id)`
 *    (mirrors `enquiries.owner_id`/`converted_by`'s existing FK precedent,
 *    CreateEnquiries1700000000003) — it points at a User (Consultant), same
 *    referential domain as those two columns. Nullable FK columns permit
 *    NULL without any referenced row (standard SQL FK semantics), so this is
 *    still a fully optional field.
 *
 * 9. `expected_closure_date` is a plain `date` (not `timestamptz`) — the
 *    issue describes it as "Expected closure date", a calendar date with no
 *    time-of-day component, distinct from `test_drive_date_time` (a
 *    `timestamptz`, since a test drive slot has a specific time).
 */
export class AddEnquiryConversionDetails1700000000017 implements MigrationInterface {
  name = 'AddEnquiryConversionDetails1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Vehicle Information (model_id already exists; reused) ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "fuel_type" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "transmission" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "color_first_preference" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "color_second_preference" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "accessories_interest" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "competitor_consideration" text`);

    // ---- 2. Qualification ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "contact_verified" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "intent_rating" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "expected_closure_date" date`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "showroom_visits" varchar`);

    // ---- 3. Commercial ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "quotation_number" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "quoted_on_road_price" bigint`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "discount_discussed" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "insurance_preference" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "extended_warranty_interest" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "corporate_discount_eligible" text`);

    // ---- 4. Finance ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "finance_application_status" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "financier" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "loan_amount_sought" bigint`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "tenure_and_emi_discussed" text`);

    // ---- 5. Exchange Evaluation ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "exchange_evaluation_status" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "exchange_evaluated_by" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "exchange_evaluated_price" bigint`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "exchange_customer_expectation" bigint`);

    // ---- 6. Test Drive & Engagement ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "test_drive_status" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "test_drive_date_time" timestamptz`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "quotation_shared_via" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "next_action_owner_id" uuid`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "test_drive_feedback" text`);

    // ---- 7. Document Checklist (NOT NULL DEFAULT false — see class comment point 1) ----
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD COLUMN "pan_card_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD COLUMN "address_proof_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD COLUMN "income_proof_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD COLUMN "gst_details_verified" boolean NOT NULL DEFAULT false`,
    );

    // ---- next_action_owner_id FK (mirrors owner_id/converted_by precedent) ----
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "FK_enquiries_next_action_owner_id" FOREIGN KEY ("next_action_owner_id") REFERENCES "users" ("user_id")`,
    );

    // ---- Defense-in-depth CHECK constraints (closed-set dropdowns) ----
    // NULL-safe `IS NULL OR ... IN (...)` form — see class comment point 3.
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_fuel_type" CHECK ("fuel_type" IS NULL OR "fuel_type" IN ('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_transmission" CHECK ("transmission" IS NULL OR "transmission" IN ('Manual', 'Automatic'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_contact_verified" CHECK ("contact_verified" IS NULL OR "contact_verified" IN ('Call Connected', 'OTP Verified', 'WhatsApp Confirmed', 'Not Verified'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_intent_rating" CHECK ("intent_rating" IS NULL OR "intent_rating" IN ('Hot', 'Warm', 'Cold'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_showroom_visits" CHECK ("showroom_visits" IS NULL OR "showroom_visits" IN ('0', '1', '2', '3+'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_insurance_preference" CHECK ("insurance_preference" IS NULL OR "insurance_preference" IN ('Dealer In-house', 'Own Arrangement', 'Undecided'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_extended_warranty_interest" CHECK ("extended_warranty_interest" IS NULL OR "extended_warranty_interest" IN ('Interested', 'Not Interested', 'Undecided'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_finance_application_status" CHECK ("finance_application_status" IS NULL OR "finance_application_status" IN ('Not Started', 'Documents Collected', 'Login Done', 'Approved', 'Rejected'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_financier" CHECK ("financier" IS NULL OR "financier" IN ('In-house', 'HDFC Bank', 'SBI', 'ICICI Bank'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_exchange_evaluation_status" CHECK ("exchange_evaluation_status" IS NULL OR "exchange_evaluation_status" IN ('Not Scheduled', 'Scheduled', 'Completed', 'No Exchange'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_test_drive_status" CHECK ("test_drive_status" IS NULL OR "test_drive_status" IN ('Not Scheduled', 'Scheduled', 'Completed', 'Declined'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_quotation_shared_via" CHECK ("quotation_shared_via" IS NULL OR "quotation_shared_via" IN ('WhatsApp', 'Email', 'Printed', 'Not Shared'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_quotation_shared_via"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_test_drive_status"`);
    await queryRunner.query(
      `ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_exchange_evaluation_status"`,
    );
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_financier"`);
    await queryRunner.query(
      `ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_finance_application_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_extended_warranty_interest"`,
    );
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_insurance_preference"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_showroom_visits"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_intent_rating"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_contact_verified"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_transmission"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_fuel_type"`);

    await queryRunner.query(
      `ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "FK_enquiries_next_action_owner_id"`,
    );

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "gst_details_verified"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "income_proof_verified"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "address_proof_verified"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "pan_card_verified"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "test_drive_feedback"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "next_action_owner_id"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "quotation_shared_via"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "test_drive_date_time"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "test_drive_status"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "exchange_customer_expectation"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "exchange_evaluated_price"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "exchange_evaluated_by"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "exchange_evaluation_status"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "tenure_and_emi_discussed"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "loan_amount_sought"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "financier"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "finance_application_status"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "corporate_discount_eligible"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "extended_warranty_interest"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "insurance_preference"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "discount_discussed"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "quoted_on_road_price"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "quotation_number"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "showroom_visits"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "expected_closure_date"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "intent_rating"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "contact_verified"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "competitor_consideration"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "accessories_interest"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "color_second_preference"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "color_first_preference"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "transmission"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "fuel_type"`);
  }
}
