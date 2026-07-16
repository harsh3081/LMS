/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — Tasks 2.1.1 / 2.1.2 / 2.5.1.
 * Validates CreateLeadDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring (no external dependencies).
 *
 * MODIFIED (issue #27, FR-04): customerName/mobile/sourceId/modelId are no
 * longer required at the DTO level — mandatory-ness is now decided at
 * request time by FieldConfigService.assertMandatoryFieldsPresent (see
 * field-config.service.spec.ts and field-config-enforcement.spec.ts for that
 * coverage). This file now only proves: (a) the DTO accepts omission of
 * these fields (@IsOptional), and (b) format validation (mobile regex,
 * integer type) still runs whenever a value IS supplied.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLeadDto } from '../../src/leads/dto/create-lead.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateLeadDto, payload);
  return validate(dto);
}

describe('CreateLeadDto', () => {
  const validPayload = { customerName: 'Asha Rao', mobile: '9876543210', sourceId: 3, modelId: 12 };

  it('passes validation with all four mandatory fields valid', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('does not fail DTO-level validation when customerName is missing (issue #27: mandatory-ness moved to the service layer)', async () => {
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

  it('does not fail DTO-level validation when sourceId is missing', async () => {
    const errors = await validateDto({ ...validPayload, sourceId: undefined });
    expect(errors.some((e) => e.property === 'sourceId')).toBe(false);
  });

  it('does not fail DTO-level validation when modelId is missing', async () => {
    const errors = await validateDto({ ...validPayload, modelId: undefined });
    expect(errors.some((e) => e.property === 'modelId')).toBe(false);
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
});
