/**
 * RED->GREEN (Inside-Out, Service Layer) — issue #30 Task 2.
 * Integration tests against the real (pg-mem-backed) TypeORM DataSource — no
 * mocking of the DB, mirroring direct-enquiry.service.spec.ts's structure.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { FollowupsService } from '../../src/followups/followups.service';
import { FollowupsRepository } from '../../src/followups/followups.repository';
import { EnquiriesService } from '../../src/enquiries/enquiries.service';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { FollowupEnquiryNotFoundError } from '../../src/followups/followups.errors';
import { FOLLOWUP_TYPE_CALL, FOLLOWUP_TYPE_HOME_VISIT } from '../../src/followups/entities/followup.entity';
import { Principal } from '../../src/common/principal';

describe('FollowupsService.logFollowup (issue #30)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let service: FollowupsService;
  let enquiriesService: EnquiriesService;
  let actorA: Principal;
  let actorC: Principal;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);

    const auditLogRepository = new AuditLogRepository(dataSource);
    const enquiriesRepository = new EnquiriesRepository(dataSource);
    const fieldConfigService = new FieldConfigService(
      dataSource,
      new FieldConfigRepository(dataSource),
      auditLogRepository,
    );
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    enquiriesService = new EnquiriesService(
      dataSource,
      enquiriesRepository,
      new LeadsRepository(dataSource),
      auditLogRepository,
      fieldConfigService,
      duplicatesService,
    );
    service = new FollowupsService(
      dataSource,
      new FollowupsRepository(dataSource),
      enquiriesRepository,
      auditLogRepository,
    );

    const dseA = seed.users['dseA'];
    const dseC = seed.users['dseC'];
    actorA = {
      userId: dseA.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      capabilities: ['create-lead'],
    };
    actorC = {
      userId: dseC.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[1],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[1],
      capabilities: ['create-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const validEnquiryDto = () => ({
    customerName: 'Walk-in Customer',
    mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    sourceId: seed.sourceIds[0],
    modelId: seed.modelIds[0],
    budget: 300000,
    variant: 'LX',
    exchangeInterest: false,
    financeInterest: true,
  });

  const validFollowupDto = () => ({ type: FOLLOWUP_TYPE_HOME_VISIT, remarks: 'Discussed financing options.' });

  it('logs a Follow-up against an owned Enquiry (AC1/AC2)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const followup = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);

    expect(followup.enquiryId).toBe(enquiry.enquiryId);
    expect(followup.type).toBe(FOLLOWUP_TYPE_HOME_VISIT);
    expect(followup.remarks).toBe('Discussed financing options.');
  });

  it('derives loggedBy/locationId/dealerGroupId fully server-side from the Principal (AC5)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const followup = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);

    expect(followup.loggedBy).toBe(actorA.userId);
    expect(followup.locationId).toBe(actorA.locationId);
    expect(followup.dealerGroupId).toBe(actorA.dealerGroupId);
  });

  it('stamps loggedAt (AC5)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const before = new Date();
    const followup = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);

    expect(followup.loggedAt).toBeInstanceOf(Date);
    expect(followup.loggedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it('accepts each of the three follow-up types', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    for (const type of ['Home Visit', 'Showroom Visit', 'Call']) {
      const followup = await service.logFollowup(enquiry.enquiryId, { type, remarks: `Logged as ${type}` }, actorA);
      expect(followup.type).toBe(type);
    }
  });

  it('throws FollowupEnquiryNotFoundError for a non-existent enquiryId', async () => {
    await expect(
      service.logFollowup('00000000-0000-0000-0000-000000000000', validFollowupDto(), actorA),
    ).rejects.toBeInstanceOf(FollowupEnquiryNotFoundError);
  });

  it('throws FollowupEnquiryNotFoundError when the Enquiry belongs to a different owner/tenant (no cross-tenant leakage)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    await expect(service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorC)).rejects.toBeInstanceOf(
      FollowupEnquiryNotFoundError,
    );
  });

  it('does not persist a Follow-up when the Enquiry is not owned by the actor (fail fast, before any transaction)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM followups');
    await expect(service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorC)).rejects.toBeInstanceOf(
      FollowupEnquiryNotFoundError,
    );
    const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM followups');
    expect(after[0].count).toBe(before[0].count);
  });

  it('writes an audit_log row (action=FOLLOWUP_LOGGED)', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const followup = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);

    const auditRows = await dataSource.query('SELECT * FROM audit_log WHERE entity_id = $1', [followup.followupId]);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('FOLLOWUP_LOGGED');
    expect(auditRows[0].entity_type).toBe('followup');
  });

  it('multiple Follow-ups can be logged against the same Enquiry', async () => {
    const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
    const first = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);
    const second = await service.logFollowup(enquiry.enquiryId, { type: FOLLOWUP_TYPE_CALL, remarks: 'Follow-up call.' }, actorA);
    expect(first.followupId).not.toBe(second.followupId);
  });

  describe('findByEnquiry (AC5)', () => {
    it('returns the Enquiry-scoped Follow-up history, newest first', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const first = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);
      const second = await service.logFollowup(
        enquiry.enquiryId,
        { type: FOLLOWUP_TYPE_CALL, remarks: 'Follow-up call.' },
        actorA,
      );

      const history = await service.findByEnquiry(enquiry.enquiryId, actorA);
      const ids = history.map((f) => f.followupId);
      expect(ids).toContain(first.followupId);
      expect(ids).toContain(second.followupId);
      expect(ids.indexOf(second.followupId)).toBeLessThan(ids.indexOf(first.followupId));
    });

    it('throws FollowupEnquiryNotFoundError for a different owner/tenant', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(service.findByEnquiry(enquiry.enquiryId, actorC)).rejects.toBeInstanceOf(
        FollowupEnquiryNotFoundError,
      );
    });
  });
});
