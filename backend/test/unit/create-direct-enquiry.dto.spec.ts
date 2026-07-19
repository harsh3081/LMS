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

  // -------------------------------------------------------------------
  // issue #134 — 5 new Customer Details fields, verbatim-mirrored decorators
  // from CreateLeadDto (see create-lead.dto.spec.ts's equivalent block).
  // -------------------------------------------------------------------
  describe('new Customer Details fields (issue #134)', () => {
    it('passes validation with all 5 Customer Details fields valid', async () => {
      const errors = await validateDto({
        ...validPayload,
        email: 'asha.rao@example.com',
        customerType: 'Individual',
        city: 'Pune',
        pinCode: '411001',
        preferredLanguage: 'Hindi',
      });
      expect(errors).toHaveLength(0);
    });

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

    it('rejects an out-of-vocabulary preferredLanguage', async () => {
      const errors = await validateDto({ ...validPayload, preferredLanguage: 'Klingon' });
      expect(errors.some((e) => e.property === 'preferredLanguage')).toBe(true);
    });

    it('accepts a plain city string with no format constraint', async () => {
      const errors = await validateDto({ ...validPayload, city: 'Pune' });
      expect(errors.some((e) => e.property === 'city')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // issue #134 — Sections 1-7, verbatim-mirrored from ConvertLeadDto's own
  // optional field set (same decorators/imported constants).
  // -------------------------------------------------------------------
  describe('Sections 1-7 fields (issue #134, mirrors ConvertLeadDto)', () => {
    it('passes validation with a full set of optional Section 1-7 fields', async () => {
      const errors = await validateDto({
        ...validPayload,
        fuelType: 'Petrol',
        transmission: 'Manual',
        colorFirstPreference: 'White',
        contactVerified: 'OTP Verified',
        intentRating: 'Hot',
        showroomVisits: '1',
        quotedOnRoadPrice: 550000,
        insurancePreference: 'Dealer In-house',
        extendedWarrantyInterest: 'Interested',
        financeApplicationStatus: 'Login Done',
        financier: 'HDFC Bank',
        loanAmountSought: 400000,
        exchangeEvaluationStatus: 'Completed',
        exchangeEvaluatedPrice: 250000,
        exchangeCustomerExpectation: 280000,
        testDriveStatus: 'Completed',
        quotationSharedVia: 'WhatsApp',
        panCardVerified: true,
        addressProofVerified: true,
        incomeProofVerified: true,
        gstDetailsVerified: true,
      });
      expect(errors).toHaveLength(0);
    });

    it('rejects an out-of-vocabulary fuelType', async () => {
      const errors = await validateDto({ ...validPayload, fuelType: 'Coal' });
      expect(errors.some((e) => e.property === 'fuelType')).toBe(true);
    });

    it('rejects an out-of-vocabulary transmission', async () => {
      const errors = await validateDto({ ...validPayload, transmission: 'Semi-Auto' });
      expect(errors.some((e) => e.property === 'transmission')).toBe(true);
    });

    it('rejects a non-positive quotedOnRoadPrice', async () => {
      const errors = await validateDto({ ...validPayload, quotedOnRoadPrice: 0 });
      expect(errors.some((e) => e.property === 'quotedOnRoadPrice')).toBe(true);
    });

    it('rejects an out-of-vocabulary testDriveStatus', async () => {
      const errors = await validateDto({ ...validPayload, testDriveStatus: 'Postponed' });
      expect(errors.some((e) => e.property === 'testDriveStatus')).toBe(true);
    });

    it('rejects a non-boolean panCardVerified', async () => {
      const errors = await validateDto({ ...validPayload, panCardVerified: 'yes' });
      expect(errors.some((e) => e.property === 'panCardVerified')).toBe(true);
    });
  });
});
