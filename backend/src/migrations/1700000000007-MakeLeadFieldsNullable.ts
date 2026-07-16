import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes `leads.customer_name` / `mobile` / `source_id` / `model_id`
 * NULLABLE (issue #27, FR-04). Root need: once field-config allows an admin
 * to mark one of these fields optional (AC2/AC3), a Lead created while that
 * field is optional-and-omitted must be storable — the #24 schema (all four
 * implicitly NOT NULL) made that impossible. Mirrors the exact precedent set
 * by 1700000000005-DirectEnquiry.ts, which already made these same four
 * columns nullable on `enquiries` for the same reason (a Direct Enquiry with
 * no parent Lead). The pre-existing mobile-format CHECK constraint
 * (1700000000002-CreateLeads) is unaffected: Postgres CHECK constraints
 * treat NULL as satisfying the check, so a NULL mobile still passes it.
 * Does not touch the frozen #24 migration file itself (additive-only).
 */
export class MakeLeadFieldsNullable1700000000007 implements MigrationInterface {
  name = 'MakeLeadFieldsNullable1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "customer_name" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "mobile" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "source_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "model_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "model_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "source_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "mobile" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "customer_name" SET NOT NULL`);
  }
}
