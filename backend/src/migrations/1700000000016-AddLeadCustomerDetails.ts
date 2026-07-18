import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `leads` schema for issue #114 ("Capture additional Customer
 * Details on the New Lead form") — 22 new nullable columns across five new
 * logical groups (Customer Details/Vehicle Interest/Exchange Vehicle/
 * Finance/Source & Assignment/Follow-up) plus one NOT NULL compliance
 * column (`communication_consent_verified`). Purely additive — does not
 * edit any frozen prior migration file. Mirrors
 * DirectEnquiry1700000000005/AddResultingStatusToFollowups1700000000012's
 * `ALTER TABLE ... ADD COLUMN` + raw-SQL reversible `down()` conventions
 * exactly.
 *
 * Schema decisions (documented here — no separate tech-design for this
 * fast-tracked Story; see .phoenix-os/project/specs/114/NOTES.md for the
 * full field-by-field rationale):
 *
 * 1. All 22 non-consent columns are NULLABLE with no default — every new
 *    field is optional (issue #114 AC2), and every pre-existing Lead row
 *    remains valid with no backfill statement, mirroring
 *    MakeLeadFieldsNullable1700000000007 / AddOwnerUpdatedAt1700000000009's
 *    nullable-additive-column precedent.
 *
 * 2. `communication_consent_verified` is the sole exception: NOT NULL,
 *    DEFAULT false. The DEFAULT exists only so this ADD COLUMN statement
 *    itself succeeds against any pre-existing row (there are none in a
 *    fresh migration history, but the column must still declare a default
 *    to be added as NOT NULL). The DTO/service layer (CreateLeadDto /
 *    LeadsService.create) is the actual compliance gate — it REJECTS any
 *    create request where this is not explicitly `true` (400), so `false`
 *    is never actually persisted via the normal create path; the DB
 *    default is defense-in-depth only, matching this codebase's established
 *    "app-layer is primary, DB CHECK/default is a backstop" convention.
 *
 * 3. Six closed-set dropdown columns each carry a defense-in-depth CHECK
 *    constraint (mirrors `followups.type`'s IN-list CHECK precedent,
 *    CreateFollowups1700000000010) backing each DTO's `@IsIn()`:
 *    `customer_type`, `preferred_language`, `fuel_type`, `transmission`,
 *    `buying_timeline`, `payment_mode`. Postgres CHECK constraints treat
 *    NULL as satisfying the check, so an omitted (NULL) value on any of
 *    these optional columns passes. Simple IN-list CHECKs, not gated behind
 *    the `E2E_DB_DRIVER=pgmem` skip (pg-mem supports them, per
 *    CreateFollowups1700000000010's comment) — unlike the regex-based
 *    `pin_code` CHECK below.
 *
 * 4. `pin_code` carries a regex CHECK (`^[1-9][0-9]{5}$`, standard India
 *    6-digit PIN) mirroring `leads.mobile`'s CHECK exactly
 *    (CreateLeads1700000000002) — including the same
 *    `E2E_DB_DRIVER=pgmem` skip, since pg-mem's SQL engine does not
 *    implement the `~` regex operator. The DTO-level `@Matches` decorator
 *    (CreateLeadDto.pinCode) is the primary, always-active enforcement
 *    path; this CHECK is a real-Postgres-only backstop.
 *
 * 5. `budget_min`/`budget_max`/`expected_value`/`down_payment_capacity` are
 *    `bigint` (INR whole rupees), mirroring `enquiries.budget`'s bigint
 *    precedent (CreateEnquiries1700000000003) for large-integer
 *    round-tripping; `lead.entity.ts` applies the same
 *    string-to-number transformer on read that `EnquiryEntity.budget` uses.
 *    `kms_driven` is a plain `int` (an odometer reading realistically never
 *    approaches bigint range).
 *
 * 6. `exchange_interest` is a nullable boolean (unlike
 *    `enquiries.exchange_interest`, which is NOT NULL) — it is the
 *    Lead-level gating flag for the four Exchange Vehicle detail columns,
 *    and per issue #114 AC2 the entire Exchange Vehicle group (including
 *    this flag) is optional at Lead-creation time, so NULL ("not yet
 *    stated") must be distinguishable from an explicit `false` ("no
 *    exchange vehicle"). This is a NEW Lead-side column, not a reuse of
 *    `enquiries.exchange_interest` — a Lead has no `enquiries` row yet.
 *
 * 7. `first_follow_up_at` is a plain nullable `timestamptz`, deliberately
 *    NOT wired to the existing `followups` table (issue #30/#31) — it is
 *    only a DSE's own planned-next-action date captured at Lead-creation
 *    time, with no reminder/scheduling infrastructure attached (see
 *    NOTES.md "Known gaps").
 */
export class AddLeadCustomerDetails1700000000016 implements MigrationInterface {
  name = 'AddLeadCustomerDetails1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skipped only against the pg-mem test substitute — see class comment
    // point 4 (mirrors CreateLeads1700000000002's mobile-CHECK skip exactly).
    const includePinCodeCheck = process.env.E2E_DB_DRIVER !== 'pgmem';

    // ---- 1. Customer Details ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "email" varchar`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "customer_type" varchar`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "city" text`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "pin_code" varchar(6)`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "preferred_language" varchar`);

    // ---- 2. Vehicle Interest ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "variant" text`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "fuel_type" varchar`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "transmission" varchar`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "budget_min" bigint`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "budget_max" bigint`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "buying_timeline" varchar`);

    // ---- 3. Exchange Vehicle (optional group, gated by exchange_interest) ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "exchange_interest" boolean`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "current_vehicle" text`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "kms_driven" int`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "registration_number" text`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "expected_value" bigint`);

    // ---- 4. Finance ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "payment_mode" varchar`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "preferred_financer" text`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "down_payment_capacity" bigint`);

    // ---- 5. Source & Assignment ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "referrer_name" text`);

    // ---- 6. Follow-up & Consent ----
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "first_follow_up_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "remarks" text`);
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN "communication_consent_verified" boolean NOT NULL DEFAULT false`,
    );

    // ---- Defense-in-depth CHECK constraints (closed-set dropdowns) ----
    // NOTE: written as `"col" IS NULL OR "col" IN (...)` rather than a bare
    // `"col" IN (...)`, deliberately NOT relying on standard SQL three-valued
    // logic (where `NULL IN (...)` evaluates to NULL/unknown, which a CHECK
    // constraint treats as passing on real Postgres) — empirically, pg-mem's
    // CHECK evaluator does NOT implement that NULL-passes semantic correctly
    // for IN-lists (verified via a throwaway test: inserting a row with one
    // of these columns NULL was incorrectly rejected as if it violated an
    // unrelated column's already-added CHECK). The explicit `IS NULL OR`
    // form sidesteps the ambiguity entirely and is correct on both engines.
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_customer_type" CHECK ("customer_type" IS NULL OR "customer_type" IN ('Individual', 'Corporate', 'Government', 'Fleet'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_preferred_language" CHECK ("preferred_language" IS NULL OR "preferred_language" IN ('English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_fuel_type" CHECK ("fuel_type" IS NULL OR "fuel_type" IN ('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_transmission" CHECK ("transmission" IS NULL OR "transmission" IN ('Manual', 'Automatic'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_buying_timeline" CHECK ("buying_timeline" IS NULL OR "buying_timeline" IN ('Immediate', 'Within 1 Month', '1-3 Months', '3-6 Months', '6+ Months'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_payment_mode" CHECK ("payment_mode" IS NULL OR "payment_mode" IN ('Cash', 'Loan', 'Lease'))`,
    );

    if (includePinCodeCheck) {
      await queryRunner.query(
        `ALTER TABLE "leads" ADD CONSTRAINT "CHK_leads_pin_code" CHECK ("pin_code" ~ '^[1-9][0-9]{5}$')`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_pin_code"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_payment_mode"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_buying_timeline"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_transmission"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_fuel_type"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_preferred_language"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "CHK_leads_customer_type"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "communication_consent_verified"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "remarks"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "first_follow_up_at"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "referrer_name"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "down_payment_capacity"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "preferred_financer"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "payment_mode"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "expected_value"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "registration_number"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "kms_driven"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "current_vehicle"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "exchange_interest"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "buying_timeline"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "budget_max"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "budget_min"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "transmission"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "fuel_type"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "variant"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "preferred_language"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "pin_code"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "customer_type"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "email"`);
  }
}
