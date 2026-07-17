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
import { FollowupEnquiryNotFoundError, NextFollowUpRequiredError } from '../../src/followups/followups.errors';
import { FOLLOWUP_TYPE_CALL, FOLLOWUP_TYPE_HOME_VISIT } from '../../src/followups/entities/followup.entity';
import { ENQUIRY_STATUS_BOOKED, ENQUIRY_STATUS_LOST, ENQUIRY_STATUS_NEW } from '../../src/enquiries/entities/enquiry.entity';
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

  // MODIFIED (issue #31 AC2): a Follow-up now requires nextFollowUpAt (or a
  // terminal enquiryStatus) to close — the default valid payload includes it
  // so every pre-existing #30 happy-path test keeps exercising a valid
  // submission unrelated to #31's own new assertions below.
  const validFollowupDto = () => ({
    type: FOLLOWUP_TYPE_HOME_VISIT,
    remarks: 'Discussed financing options.',
    nextFollowUpAt: '2026-08-01',
  });

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
      const followup = await service.logFollowup(
        enquiry.enquiryId,
        { type, remarks: `Logged as ${type}`, nextFollowUpAt: '2026-08-01' },
        actorA,
      );
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
    const second = await service.logFollowup(
      enquiry.enquiryId,
      { type: FOLLOWUP_TYPE_CALL, remarks: 'Follow-up call.', nextFollowUpAt: '2026-08-02' },
      actorA,
    );
    expect(first.followupId).not.toBe(second.followupId);
  });

  describe('findByEnquiry (AC5)', () => {
    it('returns the Enquiry-scoped Follow-up history, newest first', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const first = await service.logFollowup(enquiry.enquiryId, validFollowupDto(), actorA);
      const second = await service.logFollowup(
        enquiry.enquiryId,
        { type: FOLLOWUP_TYPE_CALL, remarks: 'Follow-up call.', nextFollowUpAt: '2026-08-02' },
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

  describe('issue #31: Schedule Next Follow-up and Auto-Generate Reminder', () => {
    it('AC1/AC3: persists nextFollowUpAt on the created Follow-up', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const followup = await service.logFollowup(
        enquiry.enquiryId,
        { type: FOLLOWUP_TYPE_HOME_VISIT, remarks: 'Scheduling next visit.', nextFollowUpAt: '2026-09-01' },
        actorA,
      );
      expect(followup.nextFollowUpAt).toBeInstanceOf(Date);
      expect(followup.nextFollowUpAt?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    });

    it('AC2: throws NextFollowUpRequiredError when neither nextFollowUpAt nor a terminal enquiryStatus is given', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.logFollowup(enquiry.enquiryId, { type: FOLLOWUP_TYPE_CALL, remarks: 'No next date given.' }, actorA),
      ).rejects.toBeInstanceOf(NextFollowUpRequiredError);
    });

    it('AC2: an empty-string nextFollowUpAt without a terminal enquiryStatus also throws NextFollowUpRequiredError', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await expect(
        service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Blank date.', nextFollowUpAt: '' },
          actorA,
        ),
      ).rejects.toBeInstanceOf(NextFollowUpRequiredError);
    });

    it('AC2: does not persist a Follow-up when the NextFollowUpRequiredError check fails (fail fast, before any transaction)', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const before = await dataSource.query('SELECT COUNT(*)::int AS count FROM followups');
      await expect(
        service.logFollowup(enquiry.enquiryId, { type: FOLLOWUP_TYPE_CALL, remarks: 'No next date.' }, actorA),
      ).rejects.toBeInstanceOf(NextFollowUpRequiredError);
      const after = await dataSource.query('SELECT COUNT(*)::int AS count FROM followups');
      expect(after[0].count).toBe(before[0].count);
    });

    it.each([ENQUIRY_STATUS_LOST, ENQUIRY_STATUS_BOOKED])(
      'AC2: allows omitting nextFollowUpAt when enquiryStatus is "%s"',
      async (terminalStatus) => {
        const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
        const followup = await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Closing this out.', enquiryStatus: terminalStatus },
          actorA,
        );
        expect(followup.nextFollowUpAt).toBeNull();
      },
    );

    it.each([ENQUIRY_STATUS_LOST, ENQUIRY_STATUS_BOOKED])(
      'AC2: updates the Enquiry status to "%s" in the same transaction as the Follow-up insert',
      async (terminalStatus) => {
        const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
        expect(enquiry.status).toBe(ENQUIRY_STATUS_NEW);

        await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Closing this out.', enquiryStatus: terminalStatus },
          actorA,
        );

        const rows = await dataSource.query('SELECT status FROM enquiries WHERE enquiry_id = $1', [
          enquiry.enquiryId,
        ]);
        expect(rows[0].status).toBe(terminalStatus);
      },
    );

    it('AC2: writes an audit_log row (action=ENQUIRY_STATUS_UPDATED) when enquiryStatus is set', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      await service.logFollowup(
        enquiry.enquiryId,
        { type: FOLLOWUP_TYPE_CALL, remarks: 'Closing this out.', enquiryStatus: ENQUIRY_STATUS_LOST },
        actorA,
      );

      const auditRows = await dataSource.query(
        "SELECT * FROM audit_log WHERE entity_id = $1 AND action = 'ENQUIRY_STATUS_UPDATED'",
        [enquiry.enquiryId],
      );
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].entity_type).toBe('enquiry');
    });

    it('AC2: does NOT write an ENQUIRY_STATUS_UPDATED audit row when enquiryStatus is not set', async () => {
      const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
      const followup = await service.logFollowup(
        enquiry.enquiryId,
        { type: FOLLOWUP_TYPE_CALL, remarks: 'Just scheduling.', nextFollowUpAt: '2026-09-10' },
        actorA,
      );

      const auditRows = await dataSource.query(
        "SELECT * FROM audit_log WHERE entity_id = $1 AND action = 'ENQUIRY_STATUS_UPDATED'",
        [enquiry.enquiryId],
      );
      expect(auditRows).toHaveLength(0);
      expect(followup.nextFollowUpAt).not.toBeNull();
    });

    describe('findUpcoming (AC4)', () => {
      it('returns only the actor\'s own Follow-ups that carry a nextFollowUpAt, most-overdue-first', async () => {
        const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
        const later = await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Later reminder.', nextFollowUpAt: '2026-12-01' },
          actorA,
        );
        const sooner = await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Sooner reminder.', nextFollowUpAt: '2026-08-01' },
          actorA,
        );
        // Closed with a terminal status -> no nextFollowUpAt -> must not appear.
        await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Closed out.', enquiryStatus: ENQUIRY_STATUS_BOOKED },
          actorA,
        );

        const upcoming = await service.findUpcoming(actorA);
        const ids = upcoming.map((f) => f.followupId);
        expect(ids).toContain(sooner.followupId);
        expect(ids).toContain(later.followupId);
        expect(ids.indexOf(sooner.followupId)).toBeLessThan(ids.indexOf(later.followupId));
        expect(upcoming.every((f) => f.nextFollowUpAt !== null)).toBe(true);
      });

      it('does not return another DSE\'s Follow-ups (tenant/loggedBy scoped)', async () => {
        const enquiry = await enquiriesService.createDirect(validEnquiryDto(), actorA);
        await service.logFollowup(
          enquiry.enquiryId,
          { type: FOLLOWUP_TYPE_CALL, remarks: 'Mine.', nextFollowUpAt: '2026-08-05' },
          actorA,
        );

        const upcomingForC = await service.findUpcoming(actorC);
        expect(upcomingForC.some((f) => f.enquiryId === enquiry.enquiryId)).toBe(false);
      });
    });
  });
});
