/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #35.
 * Validates SchedulerQueryDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring — mirrors create-test-drive.dto.spec.ts's structure
 * exactly.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SchedulerQueryDto } from '../../src/test-drives/dto/scheduler-query.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(SchedulerQueryDto, payload);
  return validate(dto);
}

describe('SchedulerQueryDto', () => {
  const validPayload = {
    vehicleId: '22222222-2222-4222-8222-222222222222',
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-02T00:00:00.000Z',
  };

  it('passes validation with all fields present and valid (AC1/AC5)', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('fails when vehicleId is missing', async () => {
    const errors = await validateDto({ ...validPayload, vehicleId: undefined });
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('fails when vehicleId is not a valid uuid', async () => {
    const errors = await validateDto({ ...validPayload, vehicleId: 'not-a-uuid' });
    expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
  });

  it('fails when from is missing', async () => {
    const errors = await validateDto({ ...validPayload, from: undefined });
    expect(errors.some((e) => e.property === 'from')).toBe(true);
  });

  it('fails when from is not a valid ISO 8601 date', async () => {
    const errors = await validateDto({ ...validPayload, from: 'not-a-date' });
    expect(errors.some((e) => e.property === 'from')).toBe(true);
  });

  it('fails when to is missing', async () => {
    const errors = await validateDto({ ...validPayload, to: undefined });
    expect(errors.some((e) => e.property === 'to')).toBe(true);
  });

  it('fails when to is not a valid ISO 8601 date', async () => {
    const errors = await validateDto({ ...validPayload, to: 'not-a-date' });
    expect(errors.some((e) => e.property === 'to')).toBe(true);
  });

  it('fails when all fields are omitted', async () => {
    const errors = await validateDto({});
    const properties = errors.map((e) => e.property);
    expect(properties).toEqual(expect.arrayContaining(['vehicleId', 'from', 'to']));
  });
});
