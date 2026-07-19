import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `enquiries` schema for issue #134 ("Redesign New Enquiry form
 * to match Convert-to-Enquiry's 8-section structure") — 5 new nullable
 * columns (`email`/`customer_type`/`city`/`pin_code`/`preferred_language`)
 * backing the redesigned Direct Enquiry form's editable Section 0 "Customer
 * Details". These same 5 fields already exist on `leads` (issue #114,
 * migration 1700000000016-AddLeadCustomerDetails) but were never added to
 * `enquiries` — Direct Enquiry (issue #26) predates that Story. Purely
 * additive — does not edit any frozen prior migration file. Mirrors
 * AddLeadCustomerDetails1700000000016 / AddEnquiryConversionDetails1700000000017's
 * `ALTER TABLE ... ADD COLUMN` + NULL-safe CHECK + raw-SQL reversible
 * `down()` conventions exactly.
 *
 * Schema decisions (documented here — no separate tech-design for this
 * fast-tracked Story; see .phoenix-os/project/specs/134/NOTES.md):
 *
 * 1. All 5 columns are NULLABLE with no default — every new field is
 *    optional (issue #134 AC3: only budget/variant/exchangeInterest/
 *    financeInterest and the config-driven 4 keep their existing
 *    required-ness), mirroring both prior Customer-Details-shaped
 *    migrations' nullable-additive-column precedent.
 *
 * 2. `customer_type`/`preferred_language` reuse the EXACT SAME closed-set
 *    vocabularies as `leads.customer_type`/`leads.preferred_language`
 *    (issue #114) — the entity layer imports `CUSTOMER_TYPES`/
 *    `PREFERRED_LANGUAGES` directly from `leads/entities/lead.entity.ts`
 *    rather than duplicating the literal arrays a third time, mirroring
 *    `enquiry.entity.ts`'s existing `FUEL_TYPES`/`TRANSMISSIONS` reuse
 *    precedent (issue #124) exactly. The CHECK constraints below use the
 *    identical value lists so DB and DTO cannot drift.
 *
 * 3. `customer_type`/`preferred_language` each carry a NULL-safe CHECK
 *    constraint (`"col" IS NULL OR "col" IN (...)`), mirroring
 *    AddLeadCustomerDetails1700000000016 / AddEnquiryConversionDetails
 *    1700000000017's established pg-mem-safe pattern exactly.
 *
 * 4. `pin_code` carries a regex CHECK (`^[1-9][0-9]{5}$`, standard India
 *    6-digit PIN) mirroring `leads.pin_code`'s CHECK exactly
 *    (AddLeadCustomerDetails1700000000016) — including the same
 *    `E2E_DB_DRIVER=pgmem` skip, since pg-mem's SQL engine does not
 *    implement the `~` regex operator. The DTO-level `@Matches` decorator
 *    (CreateDirectEnquiryDto.pinCode) is the primary, always-active
 *    enforcement path; this CHECK is a real-Postgres-only backstop.
 *
 * 5. `email` and `city` are plain, unconstrained (`varchar`/`text`
 *    respectively) — mirrors `leads.email`/`leads.city` exactly (no format
 *    validation beyond a basic client/DTO-level check for `email`).
 */
export class AddEnquiryCustomerDetails1700000000018 implements MigrationInterface {
  name = 'AddEnquiryCustomerDetails1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Skipped only against the pg-mem test substitute — see class comment
    // point 4 (mirrors AddLeadCustomerDetails1700000000016's pin_code-CHECK
    // skip exactly).
    const includePinCodeCheck = process.env.E2E_DB_DRIVER !== 'pgmem';

    // ---- Customer Details ----
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "email" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "customer_type" varchar`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "city" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "pin_code" varchar(6)`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "preferred_language" varchar`);

    // ---- Defense-in-depth CHECK constraints (closed-set dropdowns) ----
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_customer_type" CHECK ("customer_type" IS NULL OR "customer_type" IN ('Individual', 'Corporate', 'Government', 'Fleet'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_preferred_language" CHECK ("preferred_language" IS NULL OR "preferred_language" IN ('English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'))`,
    );

    if (includePinCodeCheck) {
      await queryRunner.query(
        `ALTER TABLE "enquiries" ADD CONSTRAINT "CHK_enquiries_pin_code" CHECK ("pin_code" ~ '^[1-9][0-9]{5}$')`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_pin_code"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_preferred_language"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "CHK_enquiries_customer_type"`);

    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "preferred_language"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "pin_code"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "customer_type"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "email"`);
  }
}
