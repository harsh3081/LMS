import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FieldConfigRepository } from './field-config.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { FieldConfigEntryDto } from './dto/field-config-response.dto';
import { UpdateFieldConfigItemDto } from './dto/update-field-config.dto';
import { MandatoryFieldValidationError, UnknownFieldConfigError } from './field-config.errors';
import { CONFIGURABLE_FIELD_KEYS, ConfigurableFieldKey, FIELD_LABELS, isConfigurableFieldKey } from './field-config.constants';
import { FieldError } from '../leads/leads.errors';
import { Principal } from '../common/principal';

/**
 * Configuration-driven mandatory-field enforcement (issue #27, FR-04).
 * Single source of truth both the admin screen (GET/PUT) and the Create-Lead
 * / Create-Direct-Enquiry use cases (assertMandatoryFieldsPresent) read —
 * changing the config here immediately changes what LeadsService/
 * EnquiriesService accept, with no separate wiring per DTO (AC3).
 */
@Injectable()
export class FieldConfigService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fieldConfigRepository: FieldConfigRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async getAll(): Promise<FieldConfigEntryDto[]> {
    const rows = await this.fieldConfigRepository.findAll();
    const byName = new Map(rows.map((r) => [r.fieldName, r]));
    return CONFIGURABLE_FIELD_KEYS.map((key) => {
      const row = byName.get(key);
      return {
        fieldName: key,
        label: FIELD_LABELS[key],
        mandatory: row ? row.mandatory : true,
        updatedBy: row?.updatedBy ?? null,
        updatedAt: row?.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt) : null,
      };
    });
  }

  /** `{ customerName: true, mobile: true, ... }` — consulted at request time
   * by assertMandatoryFieldsPresent (AC3: "enforced ... at next load" means
   * every request re-reads current config, no caching/staleness). */
  async getMandatoryMap(): Promise<Record<ConfigurableFieldKey, boolean>> {
    const rows = await this.fieldConfigRepository.findAll();
    const byName = new Map(rows.map((r) => [r.fieldName, r.mandatory]));
    const map = {} as Record<ConfigurableFieldKey, boolean>;
    for (const key of CONFIGURABLE_FIELD_KEYS) {
      map[key] = byName.get(key) ?? true;
    }
    return map;
  }

  /**
   * AC3/AC4: throws MandatoryFieldValidationError listing every
   * configured-mandatory field that is missing/blank in `values`. Shared by
   * LeadsService.create and EnquiriesService.createDirect so both DTOs are
   * enforced identically from one place.
   */
  async assertMandatoryFieldsPresent(values: Partial<Record<ConfigurableFieldKey, unknown>>): Promise<void> {
    const mandatoryMap = await this.getMandatoryMap();
    const errors: FieldError[] = [];
    for (const key of CONFIGURABLE_FIELD_KEYS) {
      if (!mandatoryMap[key]) continue;
      const value = values[key];
      const missing = value === undefined || value === null || value === '';
      if (missing) {
        errors.push({ field: key, message: `${key} is required` });
      }
    }
    if (errors.length) {
      throw new MandatoryFieldValidationError(errors);
    }
  }

  /** AC2/AC5: applies every toggle in one transaction, writing one
   * FIELD_CONFIG_UPDATED audit_log entry per field whose mandatory value
   * actually changed (no-op toggles — same value re-submitted — are not
   * audited, mirroring "who changed WHAT" rather than "who touched save"). */
  async updateMany(items: UpdateFieldConfigItemDto[], actor: Principal): Promise<FieldConfigEntryDto[]> {
    const unknown = items.filter((item) => !isConfigurableFieldKey(item.fieldName));
    if (unknown.length) {
      throw new UnknownFieldConfigError(
        unknown.map((item) => ({ field: item.fieldName, message: `${item.fieldName} is not a configurable field` })),
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const existingRows = await this.fieldConfigRepository.findAll(manager);
      const existingByName = new Map(existingRows.map((r) => [r.fieldName, r.mandatory]));

      for (const item of items) {
        const previous = existingByName.get(item.fieldName) ?? true;
        await this.fieldConfigRepository.upsert(item.fieldName, item.mandatory, actor.userId, manager);

        if (previous !== item.mandatory) {
          await this.auditLogRepository.record(
            {
              actor: actor.userId,
              action: 'FIELD_CONFIG_UPDATED',
              entityType: 'field_config',
              entityId: item.fieldName,
              before: { mandatory: previous },
              after: { mandatory: item.mandatory },
              locationId: actor.locationId,
              dealerGroupId: actor.dealerGroupId,
            },
            manager,
          );
        }
      }
    });

    return this.getAll();
  }
}
