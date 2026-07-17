/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #30.
 * Validates LogFollowupDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring — mirrors create-direct-enquiry.dto.spec.ts's
 * structure exactly.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LogFollowupDto } from '../../src/followups/dto/log-followup.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(LogFollowupDto, payload);
  return validate(dto);
}

describe('LogFollowupDto', () => {
  const validPayload = { type: 'Home Visit', remarks: 'Discussed financing options.' };

  it('passes validation with a valid type and remarks', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  // ---- type (AC1/AC4) ----
  it('fails when type is missing', async () => {
    const errors = await validateDto({ ...validPayload, type: undefined });
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('fails when type is an empty string', async () => {
    const errors = await validateDto({ ...validPayload, type: '' });
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('fails when type is not one of the closed set', async () => {
    const errors = await validateDto({ ...validPayload, type: 'Carrier Pigeon' });
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  for (const type of ['Home Visit', 'Showroom Visit', 'Call']) {
    it(`passes for type "${type}"`, async () => {
      const errors = await validateDto({ ...validPayload, type });
      expect(errors.some((e) => e.property === 'type')).toBe(false);
    });
  }

  // ---- remarks (AC2/AC3) ----
  it('fails when remarks is missing', async () => {
    const errors = await validateDto({ ...validPayload, remarks: undefined });
    expect(errors.some((e) => e.property === 'remarks')).toBe(true);
  });

  it('fails when remarks is an empty string', async () => {
    const errors = await validateDto({ ...validPayload, remarks: '' });
    expect(errors.some((e) => e.property === 'remarks')).toBe(true);
  });

  it('fails when remarks is whitespace-only', async () => {
    const errors = await validateDto({ ...validPayload, remarks: '   ' });
    expect(errors.some((e) => e.property === 'remarks')).toBe(true);
  });

  it('does not declare server-derived properties (enquiryId, loggedBy, locationId, dealerGroupId) on the class', () => {
    const instance = new LogFollowupDto();
    const declaredKeys = new Set(Object.keys(instance));
    for (const forbidden of ['enquiryId', 'loggedBy', 'locationId', 'dealerGroupId']) {
      expect(declaredKeys.has(forbidden)).toBe(false);
    }
  });

  // ---- nextFollowUpAt / enquiryStatus (issue #31, AC1-AC4) ----
  // Presence/mandatory-ness of nextFollowUpAt relative to enquiryStatus is a
  // cross-field business rule enforced by FollowupsService, NOT by this DTO
  // — these tests only cover the DTO's own format-level checks.
  describe('nextFollowUpAt (format only — the AC2 cross-field mandatory rule lives in FollowupsService)', () => {
    it('passes when nextFollowUpAt is omitted (mandatory-ness is a service-layer concern)', async () => {
      const errors = await validateDto(validPayload);
      expect(errors.some((e) => e.property === 'nextFollowUpAt')).toBe(false);
    });

    it('passes when nextFollowUpAt is a valid ISO date', async () => {
      const errors = await validateDto({ ...validPayload, nextFollowUpAt: '2026-08-01' });
      expect(errors.some((e) => e.property === 'nextFollowUpAt')).toBe(false);
    });

    it('passes when nextFollowUpAt is a valid ISO date-time', async () => {
      const errors = await validateDto({ ...validPayload, nextFollowUpAt: '2026-08-01T10:00:00Z' });
      expect(errors.some((e) => e.property === 'nextFollowUpAt')).toBe(false);
    });

    it('fails when nextFollowUpAt is not a valid ISO 8601 date', async () => {
      const errors = await validateDto({ ...validPayload, nextFollowUpAt: 'not-a-date' });
      expect(errors.some((e) => e.property === 'nextFollowUpAt')).toBe(true);
    });

    it('does not run the ISO-format check when nextFollowUpAt is an empty string (treated as "not provided")', async () => {
      const errors = await validateDto({ ...validPayload, nextFollowUpAt: '' });
      expect(errors.some((e) => e.property === 'nextFollowUpAt')).toBe(false);
    });
  });

  describe('enquiryStatus (AC2)', () => {
    it('passes when enquiryStatus is omitted', async () => {
      const errors = await validateDto(validPayload);
      expect(errors.some((e) => e.property === 'enquiryStatus')).toBe(false);
    });

    for (const status of ['Lost', 'Booked']) {
      it(`passes for enquiryStatus "${status}"`, async () => {
        const errors = await validateDto({ ...validPayload, enquiryStatus: status });
        expect(errors.some((e) => e.property === 'enquiryStatus')).toBe(false);
      });
    }

    it('fails for an enquiryStatus outside the terminal set (e.g. "New") — not a general status-update surface', async () => {
      const errors = await validateDto({ ...validPayload, enquiryStatus: 'New' });
      expect(errors.some((e) => e.property === 'enquiryStatus')).toBe(true);
    });

    it('fails for an unrecognized enquiryStatus value', async () => {
      const errors = await validateDto({ ...validPayload, enquiryStatus: 'Won' });
      expect(errors.some((e) => e.property === 'enquiryStatus')).toBe(true);
    });
  });
});
