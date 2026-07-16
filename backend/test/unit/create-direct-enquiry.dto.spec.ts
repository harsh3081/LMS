/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #26 Task 2.1.
 * Validates CreateDirectEnquiryDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring — mirrors create-lead.dto.spec.ts and
 * convert-lead.dto.spec.ts's structure exactly (this DTO merges both sets of
 * fields into one step, AC2).
 *
 * MODIFIED (issue #27, FR-04): customerName/mobile/sourceId/modelId
 * mandatory-ness moved to FieldConfigService (config-driven, see
 * field-config.service.spec.ts / field-config-enforcement.spec.ts) —
 * mirrors create-lead.dto.spec.ts's same modification exactly. The
 * qualifying-details fields (budget/variant/exchangeInterest/
 * financeInterest) are NOT configurable and remain statically required,
 * unchanged.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDirectEnquiryDto } from '../../src/enquiries/dto/create-direct-enquiry.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateDirectEnquiryDto, payload);
  return validate(dto);
}

describe('CreateDirectEnquiryDto', () => {
  const validPayload = {
    customerName: 'Asha Rao',
    mobile: '9876543210',
    sourceId: 3,
    modelId: 12,
    budget: 500000,
    variant: 'VXi (O) CVT',
    exchangeInterest: true,
    financeInterest: false,
  };

  it('passes validation with all Lead-equivalent + qualifying fields valid', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  // ---- Lead-equivalent fields (AC2/AC3) — mandatory-ness is config-driven (issue #27) ----
  it('does not fail DTO-level validation when customerName is missing (mandatory-ness moved to FieldConfigService)', async () => {
    const errors = await validateDto({ ...validPayload, customerName: undefined });
    expect(errors.some((e) => e.property === 'customerName')).toBe(false);
  });

  it('does not fail DTO-level validation when customerName is empty string (still a string)', async () => {
    const errors = await validateDto({ ...validPayload, customerName: '' });
    expect(errors.some((e) => e.property === 'customerName')).toBe(false);
  });

  it('does not fail DTO-level validation when mobile is missing', async () => {
    const errors = await validateDto({ ...validPayload, mobile: undefined });
    expect(errors.some((e) => e.property === 'mobile')).toBe(false);
  });

  const invalidMobileCases: { label: string; value: string }[] = [
    { label: '9-digit (too short)', value: '987654321' },
    { label: '11-digit (too long)', value: '98765432101' },
    { label: 'leading 0-5 disallowed', value: '5876543210' },
    { label: 'non-numeric', value: '98765abcde' },
  ];
  for (const { label, value } of invalidMobileCases) {
    it(`fails mobile format — ${label}`, async () => {
      const errors = await validateDto({ ...validPayload, mobile: value });
      expect(errors.some((e) => e.property === 'mobile')).toBe(true);
    });
  }

  it('does not fail DTO-level validation when sourceId is missing', async () => {
    const errors = await validateDto({ ...validPayload, sourceId: undefined });
    expect(errors.some((e) => e.property === 'sourceId')).toBe(false);
  });

  it('does not fail DTO-level validation when modelId is missing', async () => {
    const errors = await validateDto({ ...validPayload, modelId: undefined });
    expect(errors.some((e) => e.property === 'modelId')).toBe(false);
  });

  // ---- Qualifying fields (AC2, mirrors ConvertLeadDto) ----
  it('fails when budget is missing', async () => {
    const errors = await validateDto({ ...validPayload, budget: undefined });
    expect(errors.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when budget is zero or negative', async () => {
    const zero = await validateDto({ ...validPayload, budget: 0 });
    const negative = await validateDto({ ...validPayload, budget: -50000 });
    expect(zero.some((e) => e.property === 'budget')).toBe(true);
    expect(negative.some((e) => e.property === 'budget')).toBe(true);
  });

  it('fails when variant is missing', async () => {
    const errors = await validateDto({ ...validPayload, variant: undefined });
    expect(errors.some((e) => e.property === 'variant')).toBe(true);
  });

  it('fails when exchangeInterest is missing (not defaulted to false)', async () => {
    const errors = await validateDto({ ...validPayload, exchangeInterest: undefined });
    expect(errors.some((e) => e.property === 'exchangeInterest')).toBe(true);
  });

  it('fails when financeInterest is missing (not defaulted to false)', async () => {
    const errors = await validateDto({ ...validPayload, financeInterest: undefined });
    expect(errors.some((e) => e.property === 'financeInterest')).toBe(true);
  });

  it('does not declare server-derived properties (ownerId, status, convertedBy, leadId, entryType) on the class', () => {
    const instance = new CreateDirectEnquiryDto();
    const declaredKeys = new Set(Object.keys(instance));
    for (const forbidden of ['ownerId', 'locationId', 'dealerGroupId', 'convertedBy', 'status', 'leadId', 'entryType']) {
      expect(declaredKeys.has(forbidden)).toBe(false);
    }
  });
});
