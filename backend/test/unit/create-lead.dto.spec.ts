/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — Tasks 2.1.1 / 2.1.2 / 2.5.1.
 * Validates CreateLeadDto directly via class-validator, without any
 * NestJS/HTTP/DB wiring (no external dependencies).
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

  it('fails when customerName is missing', async () => {
    const errors = await validateDto({ ...validPayload, customerName: undefined });
    expect(errors.some((e) => e.property === 'customerName')).toBe(true);
  });

  it('fails when customerName is empty string', async () => {
    const errors = await validateDto({ ...validPayload, customerName: '' });
    expect(errors.some((e) => e.property === 'customerName')).toBe(true);
  });

  it('fails when mobile is missing', async () => {
    const errors = await validateDto({ ...validPayload, mobile: undefined });
    expect(errors.some((e) => e.property === 'mobile')).toBe(true);
  });

  it('fails when sourceId is missing', async () => {
    const errors = await validateDto({ ...validPayload, sourceId: undefined });
    expect(errors.some((e) => e.property === 'sourceId')).toBe(true);
  });

  it('fails when modelId is missing', async () => {
    const errors = await validateDto({ ...validPayload, modelId: undefined });
    expect(errors.some((e) => e.property === 'modelId')).toBe(true);
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
