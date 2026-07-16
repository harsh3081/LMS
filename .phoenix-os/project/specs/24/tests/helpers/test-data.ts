/**
 * Shared test-data helpers for issue #24 ("Create a New Lead") Playwright suite.
 *
 * Loads the JSON fixtures in ../fixtures and provides small builders so
 * individual specs don't repeat fixture-shape knowledge. See
 * ../fixtures/README.md for the seed state these fixtures assume.
 */
import usersFixture from '../fixtures/test-users.json';
import sourcesFixture from '../fixtures/lead-sources.json';
import modelsFixture from '../fixtures/vehicle-models.json';

export type TestUser = {
  key: string;
  role: string;
  email: string;
  password: string;
  displayName: string;
  locationId: string;
  dealerGroupId: string;
  capabilities: string[];
  note?: string;
};

export const testUsers = usersFixture.users as TestUser[];

export function getUser(key: 'dseA' | 'dseB' | 'dseC' | 'noCapabilityUser'): TestUser {
  const user = testUsers.find((u) => u.key === key);
  if (!user) {
    throw new Error(`Fixture test user "${key}" not found in test-users.json`);
  }
  return user;
}

export const activeLeadSources = sourcesFixture.sources.filter((s) => s.active);
export const inactiveLeadSources = sourcesFixture.sources.filter((s) => !s.active);
export const nonExistentSourceId = sourcesFixture.nonExistentSourceIdForNegativeTests;

export const vehicleModels = modelsFixture.models;
export const nonExistentModelId = modelsFixture.nonExistentModelIdForNegativeTests;

/** Unique-ish tag so leads created by one test run/spec don't collide with another. */
export function uniqueTag(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Valid India mobile numbers (leading 6-9, 10 digits) — generates distinct numbers per call. */
export function validMobile(): string {
  const leading = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return `${leading}${rest}`;
}

/** A representative set of INVALID India-mobile boundary cases, per spec/tech-design AC4. */
export const invalidMobileCases: { label: string; value: string }[] = [
  { label: '9-digit (too short)', value: '987654321' },
  { label: '11-digit (too long)', value: '98765432101' },
  { label: 'leading 0-5 disallowed', value: '5876543210' },
  { label: 'non-numeric', value: '98765abcde' },
];

export function validCreateLeadPayload(overrides: Partial<Record<string, unknown>> = {}) {
  const source = activeLeadSources[0];
  const model = vehicleModels[0];
  return {
    customerName: `E2E Customer ${uniqueTag()}`,
    mobile: validMobile(),
    sourceId: source.sourceId,
    modelId: model.modelId,
    ...overrides,
  };
}
