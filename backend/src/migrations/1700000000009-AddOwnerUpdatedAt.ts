import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `owner_updated_at` (nullable timestamptz) to both `leads` and
 * `enquiries` (issue #28, "Auto-Capture Ownership and Audit Metadata", AC4:
 * "Owner field updates are tracked with a timestamp when ownership is
 * reassigned"). Purely additive — does not edit the frozen #24/#25/#26/#27
 * migration files. NULLABLE with no default: every pre-existing row is
 * backfilled implicitly to NULL, meaning "never reassigned since creation";
 * no data-migration/backfill statement is needed (mirrors the nullable-
 * column precedent set by 1700000000005-DirectEnquiry.ts and
 * 1700000000007-MakeLeadFieldsNullable.ts).
 *
 * No controller/endpoint sets this column yet in this Story — Feature #7
 * (this Story's parent) is about Lead/Enquiry CREATION, not TL/SM-GM team
 * ownership management (a separate, later Epic/Feature owns the
 * reassignment UI). This migration + LeadsRepository.reassignOwner /
 * EnquiriesRepository.reassignOwner (and their Service wrappers) exist so
 * the underlying ownership-audit mechanism is proven correct now, ready for
 * that future Story to wire an HTTP surface onto without any further schema
 * change.
 */
export class AddOwnerUpdatedAt1700000000009 implements MigrationInterface {
  name = 'AddOwnerUpdatedAt1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN "owner_updated_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "owner_updated_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "owner_updated_at"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "owner_updated_at"`);
  }
}
