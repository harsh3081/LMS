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
});
