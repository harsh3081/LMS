import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../users/entities/user.entity';
import { LocationEntity } from '../locations/entities/location.entity';
import { DealerGroupEntity } from '../dealer-groups/entities/dealer-group.entity';
import { LeadSourceEntity } from '../lead-sources/entities/lead-source.entity';
import { VehicleModelEntity } from '../vehicle-models/entities/vehicle-model.entity';

/**
 * Seeds the fixtures that the frozen Playwright suite
 * (.phoenix-os/project/specs/24/tests/) and the backend Jest/Supertest
 * integration suite both depend on (spec/tech-design Test Strategy: "Seeded/
 * available source-list and model-master fixtures"; fixtures/README.md
 * "Required seed state"). Reads the SAME JSON fixture files the Playwright
 * suite reads, so both test layers assert against one source of truth —
 * this file is generated code, not a frozen artifact, and is safe to import
 * fixtures from (read-only import, never mutates them).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const usersFixture = require('../../../.phoenix-os/project/specs/24/tests/fixtures/test-users.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sourcesFixture = require('../../../.phoenix-os/project/specs/24/tests/fixtures/lead-sources.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const modelsFixture = require('../../../.phoenix-os/project/specs/24/tests/fixtures/vehicle-models.json');

export interface SeedResult {
  locationIds: Record<string, string>;
  dealerGroupIds: Record<string, string>;
  users: Record<string, { userId: string; email: string; password: string }>;
  sourceIds: number[];
  modelIds: number[];
}

/** Distinct location_id/dealer_group_id values referenced by test-users.json. */
function distinctBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

export async function seedTestFixtures(dataSource: DataSource): Promise<SeedResult> {
  const locationRepo = dataSource.getRepository(LocationEntity);
  const dealerGroupRepo = dataSource.getRepository(DealerGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const sourceRepo = dataSource.getRepository(LeadSourceEntity);
  const modelRepo = dataSource.getRepository(VehicleModelEntity);

  type FixtureUser = {
    key: string;
    role: string;
    email: string;
    password: string;
    displayName: string;
    locationId: string;
    dealerGroupId: string;
    capabilities: string[];
  };
  // ADDED (issue #27): a test-only admin account carrying the new
  // `manage-field-config` capability, needed to exercise PUT
  // /api/v1/field-config's capability gate (AC1/AC2) and audit trail (AC5)
  // in the Jest/Supertest suite. Deliberately NOT added to the frozen
  // .phoenix-os/project/specs/24/tests/fixtures/test-users.json (that file
  // backs #24/#25/#26's frozen Playwright suite and must not change) —
  // this array literal is generated code, safe to extend for this Story.
  const adminUser: FixtureUser = {
    key: 'admin',
    role: 'SystemAdministrator',
    email: 'admin@issue27.test',
    password: 'Issue27!TestAdmin1',
    displayName: 'Platform Administrator',
    locationId: '55555555-0000-0000-0000-000000000027',
    dealerGroupId: '99999999-0000-0000-0000-000000000027',
    capabilities: ['manage-field-config'],
  };
  const fixtureUsers: FixtureUser[] = [...usersFixture.users, adminUser];

  const locationIds: Record<string, string> = {};
  for (const loc of distinctBy(fixtureUsers, (u) => u.locationId)) {
    await locationRepo
      .createQueryBuilder()
      .insert()
      .values({ locationId: loc.locationId, name: `Location ${loc.locationId.slice(0, 8)}` })
      .orIgnore()
      .execute();
    locationIds[loc.locationId] = loc.locationId;
  }

  const dealerGroupIds: Record<string, string> = {};
  for (const dg of distinctBy(fixtureUsers, (u) => u.dealerGroupId)) {
    await dealerGroupRepo
      .createQueryBuilder()
      .insert()
      .values({ dealerGroupId: dg.dealerGroupId, name: `Dealer Group ${dg.dealerGroupId.slice(0, 8)}` })
      .orIgnore()
      .execute();
    dealerGroupIds[dg.dealerGroupId] = dg.dealerGroupId;
  }

  const users: SeedResult['users'] = {};
  for (const u of fixtureUsers) {
    const passwordHash = await bcrypt.hash(u.password, 4);
    const saved = await userRepo.save(
      userRepo.create({
        email: u.email,
        passwordHash,
        role: u.role,
        displayName: u.displayName,
        locationId: u.locationId,
        dealerGroupId: u.dealerGroupId,
        capabilities: u.capabilities,
      }),
    );
    users[u.key] = { userId: saved.userId, email: u.email, password: u.password };
  }

  const sourceIds: number[] = [];
  for (const s of sourcesFixture.sources as { sourceId: number; name: string; active: boolean }[]) {
    await sourceRepo
      .createQueryBuilder()
      .insert()
      .values({ sourceId: s.sourceId, name: s.name, active: s.active })
      .orIgnore()
      .execute();
    sourceIds.push(s.sourceId);
  }

  const modelIds: number[] = [];
  for (const m of modelsFixture.models as { modelId: number; name: string }[]) {
    await modelRepo.createQueryBuilder().insert().values({ modelId: m.modelId, name: m.name }).orIgnore().execute();
    modelIds.push(m.modelId);
  }

  return { locationIds, dealerGroupIds, users, sourceIds, modelIds };
}

/* istanbul ignore next -- CLI entry point, not exercised by unit/integration tests */
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: AppDataSource } = require('../data-source');
  AppDataSource.initialize()
    .then(async (ds: DataSource) => {
      await seedTestFixtures(ds);
      // eslint-disable-next-line no-console
      console.log('Test fixtures seeded.');
      await ds.destroy();
    })
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
