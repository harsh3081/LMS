import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Seeds one real-Postgres admin account carrying the new
 * `manage-field-config` capability (issue #27) — introduced because no
 * "System Administrator" persona/role exists anywhere in this codebase yet
 * (only DSE/TL/SM-GM personas per the BRD, plus the test-only
 * `noCapabilityUser`/`ReadOnlyStaff` fixture). Minimal RBAC decision: rather
 * than build a full role hierarchy, this Story introduces exactly one new
 * capability string and grants it to exactly one seeded account, consistent
 * with the existing deny-by-default capability-list pattern
 * (users.capabilities jsonb, SessionAuthGuard/RequireCapability).
 *
 * SECURITY NOTE: this is a placeholder bootstrap credential for dev/
 * demo/test environments (mirrors the intent of SeedMasterData1700000000004
 * seeding master data for a fresh environment) — a real deployment must
 * rotate this password before go-live. Not used by the frozen #24/#25/#26
 * Playwright/Jest fixtures (those come from test-seed.ts, which additionally
 * defines its OWN admin test user — see seeds/test-seed.ts — so Jest never
 * depends on this migration's fixed password).
 *
 * ON CONFLICT DO NOTHING on every insert keeps this idempotent/safe to re-run
 * (mirrors SeedMasterData1700000000004).
 */
export class SeedAdminUser1700000000008 implements MigrationInterface {
  name = 'SeedAdminUser1700000000008';

  private readonly locationId = '33333333-0000-0000-0000-000000000099';
  private readonly dealerGroupId = '99999999-0000-0000-0000-000000000099';
  private readonly userId = '44444444-0000-0000-0000-000000000099';
  private readonly email = 'admin@lms.local';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "locations" (location_id, name) VALUES ($1, 'HQ (Admin)') ON CONFLICT (location_id) DO NOTHING`,
      [this.locationId],
    );
    await queryRunner.query(
      `INSERT INTO "dealer_groups" (dealer_group_id, name) VALUES ($1, 'Platform Admin') ON CONFLICT (dealer_group_id) DO NOTHING`,
      [this.dealerGroupId],
    );

    const passwordHash = bcrypt.hashSync('ChangeMe#Admin1', 10);
    await queryRunner.query(
      `INSERT INTO "users" (user_id, email, password_hash, role, display_name, location_id, dealer_group_id, capabilities)
       VALUES ($1, $2, $3, 'SystemAdministrator', 'Platform Administrator', $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [this.userId, this.email, passwordHash, this.locationId, this.dealerGroupId, JSON.stringify(['manage-field-config'])],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE email = $1`, [this.email]);
    await queryRunner.query(`DELETE FROM "dealer_groups" WHERE dealer_group_id = $1`, [this.dealerGroupId]);
    await queryRunner.query(`DELETE FROM "locations" WHERE location_id = $1`, [this.locationId]);
  }
}
