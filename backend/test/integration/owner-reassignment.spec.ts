/**
 * RED->GREEN (Inside-Out, Infrastructure + Service Layer) — issue #28 Task
 * 2.1 (AC4: "Owner field updates are tracked with a timestamp when
 * ownership is reassigned").
 *
 * No controller/endpoint exists yet for owner reassignment in this Story —
 * Feature #7 (this Story's parent) covers Lead/Enquiry CREATION, not
 * TL/SM-GM ownership management (a separate, later Epic/Feature owns that
 * UI/endpoint). These tests exercise LeadsRepository.reassignOwner /
 * LeadsService.reassignOwner and their Enquiry mirrors DIRECTLY, against the
 * real (pg-mem-backed) TypeORM DataSource, to prove the underlying
 * ownership-audit mechanism itself is correct and ready for that future
 * Story to wire an HTTP surface onto without any further schema/service
 * change.
 */
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-data-source';
import { seedTestFixtures, SeedResult } from '../../src/seeds/test-seed';
import { LeadsRepository } from '../../src/leads/leads.repository';
import { LeadsService } from '../../src/leads/leads.service';
import { LeadReassignTargetNotFoundError } from '../../src/leads/leads.errors';
import { EnquiriesRepository } from '../../src/enquiries/enquiries.repository';
import { EnquiriesService } from '../../src/enquiries/enquiries.service';
import { EnquiryReassignTargetNotFoundError } from '../../src/enquiries/enquiries.errors';
import { AuditLogRepository } from '../../src/audit-log/audit-log.repository';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { FieldConfigRepository } from '../../src/field-config/field-config.repository';
import { DuplicatesService } from '../../src/duplicates/duplicates.service';
import { DuplicatesRepository } from '../../src/duplicates/duplicates.repository';
import { Principal } from '../../src/common/principal';

describe('Owner reassignment (issue #28 Task 2.1, AC4)', () => {
  let dataSource: DataSource;
  let seed: SeedResult;
  let leadsRepository: LeadsRepository;
  let enquiriesRepository: EnquiriesRepository;
  let leadsService: LeadsService;
  let enquiriesService: EnquiriesService;
  let auditLogRepository: AuditLogRepository;
  let dseA: Principal;
  let dseBUserId: string;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    seed = await seedTestFixtures(dataSource);
    leadsRepository = new LeadsRepository(dataSource);
    enquiriesRepository = new EnquiriesRepository(dataSource);
    auditLogRepository = new AuditLogRepository(dataSource);
    const fieldConfigService = new FieldConfigService(
      dataSource,
      new FieldConfigRepository(dataSource),
      auditLogRepository,
    );
    const duplicatesService = new DuplicatesService(new DuplicatesRepository(dataSource));
    leadsService = new LeadsService(dataSource, leadsRepository, auditLogRepository, fieldConfigService, duplicatesService);
    enquiriesService = new EnquiriesService(
      dataSource,
      enquiriesRepository,
      leadsRepository,
      auditLogRepository,
      fieldConfigService,
      duplicatesService,
    );

    const dseAUser = seed.users['dseA'];
    const dseBUser = seed.users['dseB'];
    dseBUserId = dseBUser.userId;
    dseA = {
      userId: dseAUser.userId,
      role: 'DSE',
      locationId: Object.keys(seed.locationIds)[0],
      dealerGroupId: Object.keys(seed.dealerGroupIds)[0],
      capabilities: ['create-lead'],
    };
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function createLead() {
    return leadsRepository.insert({
      customerName: 'Reassign Target',
      mobile: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      ownerId: dseA.userId,
      locationId: dseA.locationId,
      dealerGroupId: dseA.dealerGroupId,
      createdBy: dseA.userId,
    });
  }

  async function createEnquiry() {
    return enquiriesRepository.insert({
      leadId: null,
      entryType: 'DIRECT',
      customerName: 'Reassign Target Enquiry',
      mobile: `97${Math.floor(10000000 + Math.random() * 89999999)}`,
      sourceId: seed.sourceIds[0],
      modelId: seed.modelIds[0],
      budget: 500000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: false,
      convertedBy: dseA.userId,
      ownerId: dseA.userId,
      locationId: dseA.locationId,
      dealerGroupId: dseA.dealerGroupId,
      status: 'New',
      customFields: {},
    });
  }

  // -----------------------------------------------------------------------
  // LeadsRepository.reassignOwner
  // -----------------------------------------------------------------------
  describe('LeadsRepository.reassignOwner', () => {
    it('updates ownerId and stamps ownerUpdatedAt (was null before reassignment)', async () => {
      const lead = await createLead();
      expect(lead.ownerUpdatedAt).toBeNull();

      const before = Date.now();
      const updated = await leadsRepository.reassignOwner(lead.leadId, dseBUserId);
      const after = Date.now();

      expect(updated).not.toBeNull();
      expect(updated!.ownerId).toBe(dseBUserId);
      expect(updated!.ownerUpdatedAt).not.toBeNull();
      const stampMs = new Date(updated!.ownerUpdatedAt as Date).getTime();
      expect(stampMs).toBeGreaterThanOrEqual(before - 5000);
      expect(stampMs).toBeLessThanOrEqual(after + 5000);
    });

    it('returns null for a non-existent leadId', async () => {
      const result = await leadsRepository.reassignOwner('00000000-0000-0000-0000-000000000000', dseBUserId);
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // LeadsService.reassignOwner
  // -----------------------------------------------------------------------
  describe('LeadsService.reassignOwner', () => {
    it('reassigns ownerId, stamps ownerUpdatedAt, and writes an audit_log row (LEAD_OWNER_REASSIGNED)', async () => {
      const lead = await createLead();

      const updated = await leadsService.reassignOwner(lead.leadId, dseBUserId, dseA);

      expect(updated.ownerId).toBe(dseBUserId);
      expect(updated.ownerUpdatedAt).not.toBeNull();

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [lead.leadId, 'LEAD_OWNER_REASSIGNED'],
      );
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].actor).toBe(dseA.userId);
      const before =
        typeof auditRows[0].before === 'string' ? JSON.parse(auditRows[0].before) : auditRows[0].before;
      const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
      expect(before.ownerId).toBe(dseA.userId);
      expect(after.ownerId).toBe(dseBUserId);
    });

    it('uses a single DataSource transaction spanning both the owner update and the audit_log write', async () => {
      const lead = await createLead();
      const transactionSpy = jest.spyOn(dataSource, 'transaction');

      await leadsService.reassignOwner(lead.leadId, dseBUserId, dseA);

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      transactionSpy.mockRestore();
    });

    it('rejects reassignment of a non-existent leadId with LeadReassignTargetNotFoundError', async () => {
      await expect(
        leadsService.reassignOwner('00000000-0000-0000-0000-000000000000', dseBUserId, dseA),
      ).rejects.toBeInstanceOf(LeadReassignTargetNotFoundError);
    });

    it('a second reassignment updates ownerUpdatedAt to a later timestamp than the first', async () => {
      const lead = await createLead();
      const first = await leadsService.reassignOwner(lead.leadId, dseBUserId, dseA);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await leadsService.reassignOwner(lead.leadId, dseA.userId, dseA);

      expect(second.ownerId).toBe(dseA.userId);
      expect(new Date(second.ownerUpdatedAt as Date).getTime()).toBeGreaterThanOrEqual(
        new Date(first.ownerUpdatedAt as Date).getTime(),
      );
    });
  });

  // -----------------------------------------------------------------------
  // EnquiriesRepository.reassignOwner
  // -----------------------------------------------------------------------
  describe('EnquiriesRepository.reassignOwner', () => {
    it('updates ownerId and stamps ownerUpdatedAt (was null before reassignment)', async () => {
      const enquiry = await createEnquiry();
      expect(enquiry.ownerUpdatedAt).toBeNull();

      const updated = await enquiriesRepository.reassignOwner(enquiry.enquiryId, dseBUserId);

      expect(updated).not.toBeNull();
      expect(updated!.ownerId).toBe(dseBUserId);
      expect(updated!.ownerUpdatedAt).not.toBeNull();
    });

    it('returns null for a non-existent enquiryId', async () => {
      const result = await enquiriesRepository.reassignOwner('00000000-0000-0000-0000-000000000000', dseBUserId);
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // EnquiriesService.reassignOwner
  // -----------------------------------------------------------------------
  describe('EnquiriesService.reassignOwner', () => {
    it('reassigns ownerId, stamps ownerUpdatedAt, and writes an audit_log row (ENQUIRY_OWNER_REASSIGNED)', async () => {
      const enquiry = await createEnquiry();

      const updated = await enquiriesService.reassignOwner(enquiry.enquiryId, dseBUserId, dseA);

      expect(updated.ownerId).toBe(dseBUserId);
      expect(updated.ownerUpdatedAt).not.toBeNull();

      const auditRows = await dataSource.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 AND action = $2',
        [enquiry.enquiryId, 'ENQUIRY_OWNER_REASSIGNED'],
      );
      expect(auditRows).toHaveLength(1);
      const before =
        typeof auditRows[0].before === 'string' ? JSON.parse(auditRows[0].before) : auditRows[0].before;
      const after = typeof auditRows[0].after === 'string' ? JSON.parse(auditRows[0].after) : auditRows[0].after;
      expect(before.ownerId).toBe(dseA.userId);
      expect(after.ownerId).toBe(dseBUserId);
    });

    it('rejects reassignment of a non-existent enquiryId with EnquiryReassignTargetNotFoundError', async () => {
      await expect(
        enquiriesService.reassignOwner('00000000-0000-0000-0000-000000000000', dseBUserId, dseA),
      ).rejects.toBeInstanceOf(EnquiryReassignTargetNotFoundError);
    });
  });
});
