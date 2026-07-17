import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `resulting_status` (nullable varchar) to `followups` (issue #32,
 * "Role-Scoped Follow-up History Timeline", AC2: "Each entry shows type,
 * remarks, next follow-up date, and any status change"). Purely additive —
 * does not edit the frozen #30/#31 migrations
 * (1700000000010-CreateFollowups.ts, 1700000000011-AddNextFollowUpAt.ts).
 *
 * Why this column is needed: issue #31 added `LogFollowupDto.enquiryStatus`
 * and `FollowupsService.logFollowup` DOES apply it to `Enquiry.status` (plus
 * an `ENQUIRY_STATUS_UPDATED` audit_log row), but never persisted the value
 * onto the Follow-up row itself — so a Follow-up entry listed later had no
 * way to show "this entry is the one that changed status to Lost/Booked".
 * This column closes that gap: `FollowupsService.logFollowup` now stores
 * `dto.enquiryStatus` (or null) onto `resultingStatus` at write time, in the
 * SAME transaction as the Follow-up insert — no new transaction/side-effect
 * logic beyond persisting a value that was already being validated/applied.
 * See .phoenix-os/project/specs/32/NOTES.md.
 *
 * NULLABLE with no default, mirrors 1700000000011-AddNextFollowUpAt.ts's
 * nullable-column precedent exactly (raw ALTER TABLE, reversible DROP
 * COLUMN): every pre-existing row (and every future Follow-up logged
 * without a terminal enquiryStatus) is NULL, meaning "this Follow-up did not
 * change the Enquiry's status".
 */
export class AddResultingStatusToFollowups1700000000012 implements MigrationInterface {
  name = 'AddResultingStatusToFollowups1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "followups" ADD COLUMN "resulting_status" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "followups" DROP COLUMN IF EXISTS "resulting_status"`);
  }
}
