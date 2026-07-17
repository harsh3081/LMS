/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #34.
 * Validates CreateTestDriveDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring — mirrors log-followup.dto.spec.ts's structure
 * exactly.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTestDriveDto } from '../../src/test-drives/dto/create-test-drive.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateTestDriveDto, payload);
  return validate(dto);
}

describe('CreateTestDriveDto', () => {
  const validPayload = {
    enquiryId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    slotStart: '2026-08-01T10:00:00.000Z',
    slotEnd: '2026-08-01T10:30:00.000Z',
  };

  it('passes validation with all fields present and valid (AC1)', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  // ---- AC6: missing required fields ----
  it('fails when enquiryId is missing', async () => {
    const errors = await validateDto({ ...validPayload, enquiryId: undefined });
    expect(errors.some((e) => e.property === 'enquiryId')).toBe(true);
  });

  it('fails when enquiryId is not a valid uuid', async () => {
    const errors = await validateDto({ ...validPayload, enquiryId: 'not-a-uuid' });
    expect(errors.some((e) => e.property === 'enquiryId')).toBe(true);
  });

  it('fails when vehicleId is missing', async () => {
    const errors = await validateDto({ ...validPayload, vehicleId: undefined });
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('fails when vehicleId is not a valid uuid', async () => {
    const errors = await validateDto({ ...validPayload, vehicleId: 'not-a-uuid' });
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('fails when slotStart is missing', async () => {
    const errors = await validateDto({ ...validPayload, slotStart: undefined });
    expect(errors.some((e) => e.property === 'slotStart')).toBe(true);
  });

  it('fails when slotStart is not a valid ISO 8601 date', async () => {
    const errors = await validateDto({ ...validPayload, slotStart: 'not-a-date' });
    expect(errors.some((e) => e.property === 'slotStart')).toBe(true);
  });

  it('fails when slotEnd is missing', async () => {
    const errors = await validateDto({ ...validPayload, slotEnd: undefined });
    expect(errors.some((e) => e.property === 'slotEnd')).toBe(true);
  });

  it('fails when slotEnd is not a valid ISO 8601 date', async () => {
    const errors = await validateDto({ ...validPayload, slotEnd: 'not-a-date' });
    expect(errors.some((e) => e.property === 'slotEnd')).toBe(true);
  });

  it('fails when all fields are omitted (AC6)', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['enquiryId', 'vehicleId', 'slotStart', 'slotEnd']));
  });

  it('does not declare server-derived properties (status, bookedBy, locationId, dealerGroupId) on the class', () => {
    const instance = new CreateTestDriveDto();
    const declaredKeys = new Set(Object.keys(instance));
    for (const forbidden of ['status', 'bookedBy', 'locationId', 'dealerGroupId']) {
      expect(declaredKeys.has(forbidden)).toBe(false);
    }
  });
});
