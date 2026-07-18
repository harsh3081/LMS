/**
 * RED->GREEN (Inside-Out, Service Layer) — Tasks 2.2.1/2.2.2/2.3.1-2.3.4.
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource —
 * no mocking of the DB, per tech-design.md "prefer integration tests".
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { LeadsService } from '../../src/leads/leads.service';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { ReferentialValidationError } from '../../src/leads/leads.errors';
import { LEAD_STATUS_NEW } from '../../src/leads/entities/lead.entity';
import { Principal } from '../../src/common/principal';

describe('LeadsService (Task 2.2 / 2.3)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: LeadsService;
  let auditLogRepository: AuditLogRepository;
  let actor: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(dataSource, new FieldConfigRepository(dataSource), auditLogRepository);
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    service = new LeadsService(dataSource, new LeadsRepository(dataSource), auditLogRepository, fieldConfigService, duplicatesService);

    const dseA = seed.users['dseA'];
    actor = {
      userId: dseA.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      capabilities: ['create-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  // NEW (issue #114, AC2): communicationConsentVerified is now a hard,
  // always-required compliance gate — added here so this frozen-in-spirit
  // #24/#27/#29 suite's shared validDto() helper keeps compiling/passing;
  // no other field on this DTO changed for those Stories' own assertions.
  const validDto = () => ({
    customerName: 'Asha Rao',
    mobile: '9876543210',
    sourceId: 1,
    modelId: 101,
    communicationConsentVerified: true as const,
  });

  // -------------------------------------------------------------------
  // Task 2.3.1 — server-derived fields
  // -------------------------------------------------------------------
  it('derives owner/location/dealerGroup/status/createdBy from the actor, never from the DTO', async () => {
    const saved = await service.create(validDto(), actor);
    expect(saved.ownerId).toBe(actor.userId);
    expect(saved.locationId).toBe(actor.locationId);
    expect(saved.dealerGroupId).toBe(actor.dealerGroupId);
    expect(saved.createdBy).toBe(actor.userId);
    expect(saved.status).toBe(LEAD_STATUS_NEW);
  });

  // -------------------------------------------------------------------
  // Task 2.3.2 — unique lead_id
  // -------------------------------------------------------------------
  it('generates a unique leadId on every create', async () => {
    const first = await service.create(validDto(), actor);
    const second = await service.create(validDto(), actor);
    expect(first.leadId).not.toBe(second.leadId);
    expect(first.leadId).toBeDefined();
    expect(second.leadId).toBeDefined();
  });

  // -------------------------------------------------------------------
  // Task 2.3.3 — transactional persist + audit atomicity
  // -------------------------------------------------------------------
  it('uses a single DataSource transaction spanning both the lead insert and the audit_log write', async () => {
    const transactionSpy = jest.spyOn(dataSource, 'transaction');
    await service.create({ ...validDto(), mobile: '9111100099' }, actor);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    transactionSpy.mockRestore();
  });

  it('propagates (does not swallow) an audit_log write failure — both-or-neither intent', async () => {
    // NOTE (see evidence.md "Blockers"): this sandbox has no real PostgreSQL/
    // Docker available, so the backend integration harness runs against
    // pg-mem (an in-memory Postgres-wire-compatible substitute — see
    // test/support/test-data-source.ts). pg-mem accepts BEGIN/COMMIT/ROLLBACK
    // syntactically but does not implement real MVCC rollback semantics, so
    // asserting "no orphan lead row after a forced audit failure" cannot be
    // verified through pg-mem — it is a test-harness ceiling, not evidence
    // the product code is wrong (the code path is a single
    // `dataSource.transaction(...)` call per ref-code.md Sample 2, which DOES
    // roll back atomically on real Postgres). What IS verified here, without
    // that ceiling: the transactional callback throws/propagates the audit
    // failure rather than swallowing it (a prerequisite for the DB to ever
    // roll back). Full atomic-rollback verification must be re-run against
    // real Postgres (docker-compose.yml) in CI/dev before this Story ships.
    const recordSpy = jest.spyOn(auditLogRepository, 'record').mockRejectedValueOnce(new Error('simulated audit failure'));

    await expect(service.create({ ...validDto(), mobile: '9111100001' }, actor)).rejects.toThrow(
      'simulated audit failure',
    );

    recordSpy.mockRestore();
  });

  it('writes an audit_log row (action=LEAD_CREATED) in the same transaction as the lead insert (EVAL-CC-11)', async () => {
    const saved = await service.create(validDto(), actor);
    // NOTE (issue #29): filtered by action, not just entity_id — this
    // file's shared validDto() mobile ('9876543210') is reused across many
    // tests in this same beforeAll-scoped DataSource, so by this point in
    // the suite a DUPLICATE_OVERRIDE_UNACKNOWLEDGED row (issue #29 FR-06)
    // may ALSO exist for this entity_id; that is expected/correct new
    // behavior, not a regression — this assertion only cares that exactly
    // one LEAD_CREATED row exists, which is what EVAL-CC-11 tests.
    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2', [
      saved.leadId,
      'LEAD_CREATED',
    ]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('LEAD_CREATED');
  });

  // -------------------------------------------------------------------
  // Task 2.3.4 — duplicate mobile permitted (no dedupe this Story)
  // -------------------------------------------------------------------
  it('permits a second lead with a duplicate mobile number (FR-06 deferred)', async () => {
    const sharedMobile = '9222200002';
    const first = await service.create({ ...validDto(), mobile: sharedMobile }, actor);
    const second = await service.create({ ...validDto(), mobile: sharedMobile }, actor);
    expect(first.leadId).not.toBe(second.leadId);
  });

  // -------------------------------------------------------------------
  // Task 2.2.1 / 2.2.2 — referential validation
  // -------------------------------------------------------------------
  it('rejects a sourceId not present in lead_sources', async () => {
    await expect(service.create({ ...validDto(), sourceId: 999999 }, actor)).rejects.toBeInstanceOf(
      ReferentialValidationError,
    );
  });

  it('rejects a modelId not present in vehicle_models', async () => {
    await expect(service.create({ ...validDto(), modelId: 999999 }, actor)).rejects.toBeInstanceOf(
      ReferentialValidationError,
    );
  });

  // -------------------------------------------------------------------
  // AC6 — findOwnQueue delegates to the tenant-scope choke-point
  // -------------------------------------------------------------------
  it('findOwnQueue returns leads scoped to the given actor', async () => {
    const saved = await service.create(validDto(), actor);
    const queue = await service.findOwnQueue(actor);
    expect(queue.some((l) => l.leadId === saved.leadId)).toBe(true);
  });

  // -------------------------------------------------------------------
  // issue #29 (FR-06, AC3) — duplicate-mobile audit note. Creation is NEVER
  // blocked either way (asserted first, mirroring the pre-existing "permits
  // a second lead with a duplicate mobile" test above).
  // -------------------------------------------------------------------
  describe('duplicate-mobile audit note (issue #29)', () => {
    it('still creates the Lead when a duplicate mobile exists and acknowledgeDuplicate is NOT set (advisory only, never blocks)', async () => {
      const sharedMobile = '9333300001';
      const first = await service.create({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.create({ ...validDto(), mobile: sharedMobile }, actor);
      expect(second.leadId).not.toBe(first.leadId);
    });

    it('writes DUPLICATE_OVERRIDE_UNACKNOWLEDGED when a duplicate exists and acknowledgeDuplicate is absent', async () => {
      const sharedMobile = '9333300002';
      await service.create({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.create({ ...validDto(), mobile: sharedMobile }, actor);

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [second.leadId, 'DUPLICATE_OVERRIDE_UNACKNOWLEDGED'],
      );
      expect(auditRows).toHaveLength(1);
    });

    it('writes DUPLICATE_OVERRIDE_ACKNOWLEDGED when a duplicate exists and acknowledgeDuplicate is true', async () => {
      const sharedMobile = '9333300003';
      const first = await service.create({ ...validDto(), mobile: sharedMobile }, actor);
      const second = await service.create({ ...validDto(), mobile: sharedMobile, acknowledgeDuplicate: true }, actor);

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [second.leadId, 'DUPLICATE_OVERRIDE_ACKNOWLEDGED'],
      );
      expect(auditRows).toHaveLength(1);
      const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
      expect(after.matchedIds).toContain(first.leadId);
    });

    it('writes no duplicate-audit row when the mobile is not a duplicate', async () => {
      const uniqueMobile = '9333300004';
      const saved = await service.create({ ...validDto(), mobile: uniqueMobile, acknowledgeDuplicate: true }, actor);

      const auditRows = await dataSource.query(
        "SELECT * FROM audit_log WHERE entity_id = $1 AND action LIKE 'DUPLICATE_OVERRIDE%'",
        [saved.leadId],
      );
      expect(auditRows).toHaveLength(0);
    });
  });
});
