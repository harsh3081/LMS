/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — Tasks 2.1.1 / 2.1.2 (issue #25).
 * Validates ConvertLeadDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring (no external dependencies) — mirrors
 * create-lead.dto.spec.ts's structure exactly.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConvertLeadDto } from '../../src/enquiries/dto/convert-lead.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(ConvertLeadDto, payload);
  return validate(dto);
}

describe('ConvertLeadDto', () => {
  const validPayload = { budget: 500000, variant: 'VXi (O) CVT', exchangeInterest: true, financeInterest: false };

  it('passes validation with all four qualifying fields valid', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('fails when budget is missing', async () => {
    const errors = await validateDto({ ...validPayload, budget: undefined });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when budget is zero', async () => {
    const errors = await validateDto({ ...validPayload, budget: 0 });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when budget is negative', async () => {
    const errors = await validateDto({ ...validPayload, budget: -50000 });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when budget is a non-integer decimal', async () => {
    const errors = await validateDto({ ...validPayload, budget: 500000.5 });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when budget is a non-numeric string', async () => {
    const errors = await validateDto({ ...validPayload, budget: 'five-lakh' });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('accepts a large-but-valid budget (no artificial upper bound)', async () => {
    const errors = await validateDto({ ...validPayload, budget: 999999999 });
    expect(errors).toHaveLength(0);
  });

  it('fails when variant is missing', async () => {
    const errors = await validateDto({ ...validPayload, variant: undefined });
    expect(errors.some((e) => e.property === 'variant')).toBe(true);
  });

  it('fails when variant is an empty string', async () => {
    const errors = await validateDto({ ...validPayload, variant: '' });
    expect(errors.some((e) => e.property === 'variant')).toBe(true);
  });

  it('fails when exchangeInterest is missing (not defaulted to false)', async () => {
    const errors = await validateDto({ ...validPayload, exchangeInterest: undefined });
    expect(errors.some((e) => e.property === 'exchangeInterest')).toBe(true);
  });

  it('fails when exchangeInterest is not a boolean', async () => {
    const errors = await validateDto({ ...validPayload, exchangeInterest: 'yes' });
    expect(errors.some((e) => e.property === 'exchangeInterest')).toBe(true);
  });

  it('fails when financeInterest is missing (not defaulted to false)', async () => {
    const errors = await validateDto({ ...validPayload, financeInterest: undefined });
    expect(errors.some((e) => e.property === 'financeInterest')).toBe(true);
  });

  it('fails when financeInterest is not a boolean', async () => {
    const errors = await validateDto({ ...validPayload, financeInterest: 'no' });
    expect(errors.some((e) => e.property === 'financeInterest')).toBe(true);
  });

  it('does not declare server-derived properties (ownerId, status, convertedBy, leadId) on the class', () => {
    // Actual request-body stripping is enforced by the global ValidationPipe's
    // `whitelist: true` at the HTTP boundary (asserted end-to-end by
    // EVAL-CC-01 in convert-lead-api.spec.ts / create-lead.controller.spec.ts
    // precedent) — plainToInstance alone does not strip unknown keys. This
    // test only guards that the DTO's own declared shape never grows those
    // fields (structural regression guard), matching CreateLeadDto's
    // equivalent absence.
    const instance = new ConvertLeadDto();
    const declaredKeys = new Set(Object.keys(instance));
    for (const forbidden of ['ownerId', 'locationId', 'dealerGroupId', 'convertedBy', 'status', 'leadId']) {
      expect(declaredKeys.has(forbidden)).toBe(false);
    }
  });
});
