import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `enquiries` schema for Direct Enquiry creation (issue #26,
 * "Create a Direct Enquiry (Walk-in/Referred)"). Does NOT edit the frozen
 * #25 migration (1700000000003-CreateEnquiries) — additive-only, per this
 * Story's constraints.
 *
 * Schema decisions (documented here since there is no separate tech-design
 * for this fast-tracked Story):
 *
 * 1. `lead_id` becomes NULLABLE. AC4 requires a Direct Enquiry to have "no
 *    parent Lead reference" — the existing NOT NULL constraint (#25) made
 *    that impossible. The pre-existing `UNIQUE(lead_id)` constraint is left
 *    in place: Postgres treats every NULL as distinct for a UNIQUE
 *    constraint, so any number of Direct Enquiries (lead_id = NULL) can
 *    coexist without colliding, while the one-Enquiry-per-Lead invariant
 *    (#25, Clarification Q2) still holds for non-null values.
 *
 * 2. `entry_type` (`'DIRECT' | 'CONVERTED'`) is an explicit new column
 *    rather than inferring the distinction from `lead_id IS NULL`. Both
 *    were considered; the explicit column was chosen because it is
 *    self-documenting in ad-hoc reporting queries/lists (AC5 — "distinguishable
 *    in reporting/lists") without every consumer needing to know the
 *    NULL-means-direct convention, at the cost of one extra column. Existing
 *    (#25) rows are backfilled to `'CONVERTED'` via the column DEFAULT so no
 *    data migration/backfill statement is needed.
 *
 * 3. `customer_name` / `mobile` / `source_id` / `model_id` are added as
 *    NULLABLE columns on `enquiries` itself. A Direct Enquiry has no Lead
 *    row to hold these Lead-equivalent mandatory fields (AC2), so they must
 *    live on the Enquiry record directly; they stay NULL for `CONVERTED`
 *    rows, where this data is already reachable via the (non-null) `lead_id`
 *    join to `leads`. `source_id`/`model_id` carry the same FK references
 *    as `leads.source_id`/`leads.model_id` (nullable FKs — Postgres skips
 *    the FK check when the referencing column is NULL).
 */
export class DirectEnquiry1700000000005 implements MigrationInterface {
  name = 'DirectEnquiry1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enquiries" ALTER COLUMN "lead_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "entry_type" varchar NOT NULL DEFAULT 'CONVERTED'`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "customer_name" text`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "mobile" varchar(10)`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "source_id" int`);
    await queryRunner.query(`ALTER TABLE "enquiries" ADD COLUMN "model_id" int`);
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "fk_enquiries_source_id" FOREIGN KEY ("source_id") REFERENCES "lead_sources" ("source_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "enquiries" ADD CONSTRAINT "fk_enquiries_model_id" FOREIGN KEY ("model_id") REFERENCES "vehicle_models" ("model_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "fk_enquiries_model_id"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "fk_enquiries_source_id"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "model_id"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "source_id"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "mobile"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "customer_name"`);
    await queryRunner.query(`ALTER TABLE "enquiries" DROP COLUMN IF EXISTS "entry_type"`);
    await queryRunner.query(`ALTER TABLE "enquiries" ALTER COLUMN "lead_id" SET NOT NULL`);
  }
}
