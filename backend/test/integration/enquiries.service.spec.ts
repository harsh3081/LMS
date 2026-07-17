/**
 * RED->GREEN (Inside-Out, Service Layer) — Task 2.4.1 (issue #25).
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource — no
 * mocking of the DB, mirroring leads.service.spec.ts's structure/pattern.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { EnquiriesService } from '../../src/enquiries/enquiries.service';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { LeadNotFoundError, LeadAlreadyConvertedError } from '../../src/enquiries/enquiries.errors';
import { ENQUIRY_STATUS_NEW } from '../../src/enquiries/entities/enquiry.entity';
import { LEAD_STATUS_CONVERTED } from '../../src/leads/entities/lead.entity';
import { Principal } from '../../src/common/principal';

describe('EnquiriesService (Task 2.4)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: EnquiriesService;
  let leadsRepository: LeadsRepository;
  let auditLogRepository: AuditLogRepository;
  let actor: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    leadsRepository = new LeadsRepository(dataSource);
    auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(dataSource, new FieldConfigRepository(dataSource), auditLogRepository);
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    service = new EnquiriesService(
      dataSource,
      new EnquiriesRepository(dataSource),
      leadsRepository,
      auditLogRepository,
      fieldConfigService,
      duplicatesService,
    );

    const dseA = seed.users['dseA'];
    actor = {
      userId: dseA.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      capabilities: ['convert-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const validDto = () => ({ budget: 500000, variant: 'VXi (O) CVT', exchangeInterest: true, financeInterest: false });

  async function createLead(overrides: Partial<Record<string, unknown>> = {}) {
    return leadsRepository.insert({
      customerName: 'Asha Rao',
      mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
      createdBy: actor.userId,
      ...overrides,
    });
  }

  it('creates an Enquiry linked to the source Lead with server-derived owner/tenant/convertedBy/status', async () => {
    const lead = await createLead();
    const enquiry = await service.convert(lead.leadId, validDto(), actor);

    expect(enquiry.leadId).toBe(lead.leadId);
    expect(enquiry.ownerId).toBe(actor.userId);
    expect(enquiry.locationId).toBe(actor.locationId);
    expect(enquiry.dealerGroupId).toBe(actor.dealerGroupId);
    expect(enquiry.convertedBy).toBe(actor.userId);
    expect(enquiry.status).toBe(ENQUIRY_STATUS_NEW);
    expect(enquiry.budget).toBe(500000);
    expect(enquiry.variant).toBe('VXi (O) CVT');
    expect(enquiry.exchangeInterest).toBe(true);
    expect(enquiry.financeInterest).toBe(false);
    expect(enquiry.convertedAt).toBeDefined();
  });

  it('flips the source Lead status to Converted', async () => {
    const lead = await createLead();
    await service.convert(lead.leadId, validDto(), actor);

    const reloaded = await leadsRepository.findOwnedById(lead.leadId, actor);
    expect(reloaded?.status).toBe(LEAD_STATUS_CONVERTED);
  });

  it('throws LeadNotFoundError for a non-existent leadId', async () => {
    await expect(
      service.convert('00000000-0000-0000-0000-000000000000', validDto(), actor),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('throws LeadNotFoundError for an out-of-scope (other owner) leadId', async () => {
    const dseC = seed.users['dseC'];
    const otherActor: Principal = {
      userId: dseC.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[1] ?? actor.locationId,
      dealerGroupId: Object.keys(seed.dealerGroupIds)[1] ?? actor.dealerGroupId,
      capabilities: ['convert-lead'],
    };
    const lead = await createLead();
    await expect(service.convert(lead.leadId, validDto(), otherActor)).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it('throws LeadAlreadyConvertedError on re-conversion of an already-Converted Lead', async () => {
    const lead = await createLead();
    await service.convert(lead.leadId, validDto(), actor);
    await expect(service.convert(lead.leadId, validDto(), actor)).rejects.toBeInstanceOf(LeadAlreadyConvertedError);
  });

  it('writes an audit_log row (action=LEAD_CONVERTED) with before/after status + enquiryId', async () => {
    const lead = await createLead();
    const enquiry = await service.convert(lead.leadId, validDto(), actor);

    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1', [lead.leadId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('LEAD_CONVERTED');
    const before = typeof auditRows[0].before === 'string' ? JSON.parse(auditRows[0].before) : auditRows[0].before;
    const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
    expect(before.status).toBe('New');
    expect(after.status).toBe(LEAD_STATUS_CONVERTED);
    expect(after.enquiryId).toBe(enquiry.enquiryId);
  });

  it('uses a single DataSource transaction spanning the Enquiry insert, Lead flip, and audit write', async () => {
    const lead = await createLead();
    const transactionSpy = jest.spyOn(dataSource, 'transaction');
    await service.convert(lead.leadId, validDto(), actor);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    transactionSpy.mockRestore();
  });

  it('does not persist an Enquiry when the eligibility check fails (fail fast, before any transaction)', async () => {
    const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    await expect(
      service.convert('00000000-0000-0000-0000-000000000000', validDto(), actor),
    ).rejects.toBeInstanceOf(LeadNotFoundError);
    const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM enquiries');
    expect(after[0].count).toBe(before[0].count);
  });
});
