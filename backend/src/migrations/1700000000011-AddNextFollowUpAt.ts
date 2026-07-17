import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `next_follow_up_at` (nullable timestamptz) to `followups` (issue #31,
 * "Schedule Next Follow-up and Auto-Generate Reminder", AC1-AC4). Purely
 * additive — does not edit the frozen #30 migration
 * (1700000000010-CreateFollowups.ts), which explicitly anticipated this
 * exact column in its "Schema decisions" comment ("Deliberately NOT added
 * this Story: `next_follow_up_at` (#31, schedule a reminder)... would be a
 * nullable additive column, addable later exactly the way
 * 1700000000009-AddOwnerUpdatedAt.ts added a nullable column to two existing
 * tables, with no breaking change"). NULLABLE with no default: every
 * pre-existing row is backfilled implicitly to NULL, meaning "no next
 * follow-up scheduled" — e.g. a Follow-up logged before this Story shipped,
 * or one logged against an Enquiry closed to a terminal status in the same
 * request (AC2's exception, see FollowupsService). Mirrors
 * 1700000000009-AddOwnerUpdatedAt.ts's nullable-column precedent exactly
 * (raw ALTER TABLE, reversible DROP COLUMN).
 *
 * This column's value IS the reminder (AC3) — no separate `reminders`
 * table/entity is introduced. See .phoenix-os/project/specs/31/NOTES.md for
 * the AC5 ("shared scheduled job/notification service") deferral reasoning:
 * no such infrastructure exists anywhere in this codebase to integrate with.
 */
export class AddNextFollowUpAt1700000000011 implements MigrationInterface {
  name = 'AddNextFollowUpAt1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "followups" ADD COLUMN "next_follow_up_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "followups" DROP COLUMN IF EXISTS "next_follow_up_at"`);
  }
}
