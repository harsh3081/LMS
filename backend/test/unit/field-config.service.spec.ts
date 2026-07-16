/**
 * RED->GREEN (Inside-Out, Core Domain Layer) — issue #27 Task 2.1.
 * Unit tests for FieldConfigService with DataSource/FieldConfigRepository/
 * AuditLogRepository mocked (mirrors the "prefer integration, mock only
 * infrastructure boundaries" convention — this is the pure decision logic:
 * getMandatoryMap defaulting, assertMandatoryFieldsPresent, updateMany's
 * unknown-key rejection + audit-on-change-only behavior).
 */
import 'reflect-metadata';
import { FieldConfigService } from '../../src/field-config/field-config.service';
import { MandatoryFieldValidationError, UnknownFieldConfigError } from '../../src/field-config/field-config.errors';
import { FieldConfigEntity } from '../../src/field-config/entities/field-config.entity';

function makeRow(fieldName: string, mandatory: boolean): FieldConfigEntity {
  return { fieldName, mandatory, updatedBy: null, updatedAt: new Date('2026-01-01T00:00:00Z') } as FieldConfigEntity;
}

describe('FieldConfigService', () => {
  let repo: { findAll: jest.Mock; findByName: jest.Mock; upsert: jest.Mock };
  let auditLogRepository: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let service: FieldConfigService;

  const actor = {
    userId: 'user-1',
    role: 'SystemAdministrator',
    locationId: 'loc-1',
    dealerGroupId: 'dg-1',
    capabilities: ['manage-field-config'],
  };

  beforeEach(() => {
    repo = { findAll: jest.fn(), findByName: jest.fn(), upsert: jest.fn() };
    auditLogRepository = { record: jest.fn() };
    dataSource = { transaction: jest.fn((cb: (manager: unknown) => Promise<void>) => cb({})) };
    service = new FieldConfigService(dataSource as never, repo as never, auditLogRepository as never);
  });

  describe('getMandatoryMap', () => {
    it('reflects stored rows', async () => {
      repo.findAll.mockResolvedValue([
        makeRow('customerName', true),
        makeRow('mobile', false),
        makeRow('sourceId', true),
        makeRow('modelId', true),
      ]);
      const map = await service.getMandatoryMap();
      expect(map).toEqual({ customerName: true, mobile: false, sourceId: true, modelId: true });
    });

    it('defaults a missing row to mandatory=true (AC6 fail-safe)', async () => {
      repo.findAll.mockResolvedValue([]);
      const map = await service.getMandatoryMap();
      expect(map).toEqual({ customerName: true, mobile: true, sourceId: true, modelId: true });
    });
  });

  describe('getAll', () => {
    it('returns every configurable field with its label, even if unseeded', async () => {
      repo.findAll.mockResolvedValue([makeRow('customerName', false)]);
      const all = await service.getAll();
      expect(all).toHaveLength(4);
      const customerName = all.find((f) => f.fieldName === 'customerName');
      expect(customerName).toMatchObject({ fieldName: 'customerName', label: 'Customer Name', mandatory: false });
      const mobile = all.find((f) => f.fieldName === 'mobile');
      expect(mobile).toMatchObject({ mandatory: true, updatedBy: null, updatedAt: null });
    });
  });

  describe('assertMandatoryFieldsPresent', () => {
    it('passes when every mandatory field is present', async () => {
      repo.findAll.mockResolvedValue([
        makeRow('customerName', true),
        makeRow('mobile', true),
        makeRow('sourceId', true),
        makeRow('modelId', true),
      ]);
      await expect(
        service.assertMandatoryFieldsPresent({ customerName: 'Asha', mobile: '9876543210', sourceId: 1, modelId: 101 }),
      ).resolves.toBeUndefined();
    });

    it('throws MandatoryFieldValidationError listing every missing mandatory field', async () => {
      repo.findAll.mockResolvedValue([
        makeRow('customerName', true),
        makeRow('mobile', true),
        makeRow('sourceId', true),
        makeRow('modelId', true),
      ]);
      await expect(
        service.assertMandatoryFieldsPresent({ customerName: undefined, mobile: '', sourceId: 1, modelId: undefined }),
      ).rejects.toMatchObject({
        errors: expect.arrayContaining([
          { field: 'customerName', message: 'customerName is required' },
          { field: 'mobile', message: 'mobile is required' },
          { field: 'modelId', message: 'modelId is required' },
        ]),
      });
    });

    it('does not flag a field configured optional even when missing', async () => {
      repo.findAll.mockResolvedValue([
        makeRow('customerName', true),
        makeRow('mobile', true),
        makeRow('sourceId', false),
        makeRow('modelId', true),
      ]);
      await expect(
        service.assertMandatoryFieldsPresent({
          customerName: 'Asha',
          mobile: '9876543210',
          sourceId: undefined,
          modelId: 101,
        }),
      ).resolves.toBeUndefined();
    });

    it('rejects via MandatoryFieldValidationError instance', async () => {
      repo.findAll.mockResolvedValue([makeRow('customerName', true)]);
      const promise = service.assertMandatoryFieldsPresent({ customerName: undefined });
      await expect(promise).rejects.toBeInstanceOf(MandatoryFieldValidationError);
    });
  });

  describe('updateMany', () => {
    it('rejects an unknown field name with UnknownFieldConfigError and does not open a transaction', async () => {
      await expect(
        service.updateMany([{ fieldName: 'notAField', mandatory: true }], actor),
      ).rejects.toBeInstanceOf(UnknownFieldConfigError);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('upserts each field and writes one audit entry per changed field only (AC5)', async () => {
      repo.findAll
        .mockResolvedValueOnce([makeRow('customerName', true), makeRow('mobile', true)]) // inside transaction (existing)
        .mockResolvedValue([makeRow('customerName', false), makeRow('mobile', true), makeRow('sourceId', true), makeRow('modelId', true)]); // getAll() at the end

      await service.updateMany(
        [
          { fieldName: 'customerName', mandatory: false }, // changed
          { fieldName: 'mobile', mandatory: true }, // unchanged (no-op)
        ],
        actor,
      );

      expect(repo.upsert).toHaveBeenCalledWith('customerName', false, actor.userId, {});
      expect(repo.upsert).toHaveBeenCalledWith('mobile', true, actor.userId, {});
      expect(auditLogRepository.record).toHaveBeenCalledTimes(1);
      expect(auditLogRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: actor.userId,
          action: 'FIELD_CONFIG_UPDATED',
          entityType: 'field_config',
          entityId: 'customerName',
          before: { mandatory: true },
          after: { mandatory: false },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        }),
        {},
      );
    });

    it('returns the fresh getAll() snapshot after applying updates', async () => {
      repo.findAll
        .mockResolvedValueOnce([makeRow('sourceId', true)])
        .mockResolvedValue([makeRow('sourceId', false)]);

      const result = await service.updateMany([{ fieldName: 'sourceId', mandatory: false }], actor);
      const sourceId = result.find((f) => f.fieldName === 'sourceId');
      expect(sourceId?.mandatory).toBe(false);
    });
  });
});
