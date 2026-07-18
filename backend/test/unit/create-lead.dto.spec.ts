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
  // NEW (issue #114, AC2): communicationConsentVerified is a hard,
  // always-required compliance gate — added here so this file's shared
  // validPayload keeps validating cleanly; see the dedicated "consent
  // compliance gate" describe block below for its own coverage.
  const validPayload = {
    customerName: 'Asha Rao',
    mobile: '9876543210',
    sourceId: 3,
    modelId: 12,
    communicationConsentVerified: true,
  };

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

  // -------------------------------------------------------------------
  // issue #114, AC2 — communicationConsentVerified compliance gate.
  // Unlike the 4 config-driven fields above, this one IS a static,
  // always-required DTO-level concern (@Equals(true), not @IsOptional()).
  // -------------------------------------------------------------------
  describe('communicationConsentVerified compliance gate', () => {
    it('fails DTO-level validation when omitted', async () => {
      const payload = { ...validPayload } as Record<string, unknown>;
      delete payload.communicationConsentVerified;
      const errors = await validateDto(payload);
      expect(errors.some((e) => e.property === 'communicationConsentVerified')).toBe(true);
    });

    it('fails DTO-level validation when explicitly false', async () => {
      const errors = await validateDto({ ...validPayload, communicationConsentVerified: false });
      expect(errors.some((e) => e.property === 'communicationConsentVerified')).toBe(true);
    });

    it('fails DTO-level validation for a non-boolean value', async () => {
      const errors = await validateDto({ ...validPayload, communicationConsentVerified: 'true' });
      expect(errors.some((e) => e.property === 'communicationConsentVerified')).toBe(true);
    });

    it('passes DTO-level validation when explicitly true', async () => {
      const errors = await validateDto({ ...validPayload, communicationConsentVerified: true });
      expect(errors.some((e) => e.property === 'communicationConsentVerified')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // issue #114, AC3/AC4 — new field format/closed-set validation (DTO layer).
  // -------------------------------------------------------------------
  describe('new fields (issue #114)', () => {
    it('accepts a well-formed email', async () => {
      const errors = await validateDto({ ...validPayload, email: 'asha.rao@example.com' });
      expect(errors.some((e) => e.property === 'email')).toBe(false);
    });

    it('rejects a malformed email', async () => {
      const errors = await validateDto({ ...validPayload, email: 'not-an-email' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('accepts a valid 6-digit India pin code', async () => {
      const errors = await validateDto({ ...validPayload, pinCode: '411001' });
      expect(errors.some((e) => e.property === 'pinCode')).toBe(false);
    });

    const invalidPinCases = ['0000', '12345', '1234567', 'ABCDEF', '012345'];
    for (const value of invalidPinCases) {
      it(`rejects an invalid pin code — "${value}"`, async () => {
        const errors = await validateDto({ ...validPayload, pinCode: value });
        expect(errors.some((e) => e.property === 'pinCode')).toBe(true);
      });
    }

    it('rejects an out-of-vocabulary customerType', async () => {
      const errors = await validateDto({ ...validPayload, customerType: 'Bogus' });
      expect(errors.some((e) => e.property === 'customerType')).toBe(true);
    });

    it('accepts every CUSTOMER_TYPES option', async () => {
      for (const value of ['Individual', 'Corporate', 'Government', 'Fleet']) {
        const errors = await validateDto({ ...validPayload, customerType: value });
        expect(errors.some((e) => e.property === 'customerType')).toBe(false);
      }
    });

    it('rejects a negative numeric field (e.g. kmsDriven)', async () => {
      const errors = await validateDto({ ...validPayload, kmsDriven: -5 });
      expect(errors.some((e) => e.property === 'kmsDriven')).toBe(true);
    });

    it('accepts a UUID assignedOwnerId', async () => {
      const errors = await validateDto({ ...validPayload, assignedOwnerId: '11111111-1111-4111-8111-111111111111' });
      expect(errors.some((e) => e.property === 'assignedOwnerId')).toBe(false);
    });

    it('rejects a non-UUID assignedOwnerId', async () => {
      const errors = await validateDto({ ...validPayload, assignedOwnerId: 'not-a-uuid' });
      expect(errors.some((e) => e.property === 'assignedOwnerId')).toBe(true);
    });
  });
});
