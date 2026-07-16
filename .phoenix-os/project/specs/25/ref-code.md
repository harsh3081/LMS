# Reference Code Samples

**Issue**: #25
**Title**: [Story] Convert a Lead into an Enquiry
**Created**: 2026-07-16

---

## Purpose

Illustrate the load-bearing patterns where exact conformance to the merged #24 conventions matters: (1) the eligibility-check + single-transaction convert in the service, (2) the pg-mem-safe `enquiries` migration, and (3) the owner-queue exclusion + scoped single-Lead load. These mirror existing files verbatim in style. All other files (DTOs, controller, filter, entity, frontend) are mechanical mirrors of their `leads/` counterparts and need no sample.

---

## Code Samples

### Sample 1: EnquiriesService.convert — eligibility + transactional convert

**Purpose**: 404/409 eligibility gating, then atomic Enquiry-insert + Lead-flip + audit (mirrors `leads.service.ts` `create`).

**File**: `backend/src/enquiries/enquiries.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EnquiriesRepository } from './enquiries.repository';
import { LeadsRepository } from '../leads/leads.repository';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { EnquiryEntity, ENQUIRY_STATUS_NEW } from './entities/enquiry.entity';
import { LEAD_STATUS_CONVERTED } from '../leads/entities/lead.entity';
import { LeadNotFoundError, LeadAlreadyConvertedError } from './enquiries.errors';
import { Principal } from '../common/principal';

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly enquiriesRepository: EnquiriesRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async convert(leadId: string, dto: ConvertLeadDto, actor: Principal): Promise<EnquiryEntity> {
    // Tenant/owner-scoped load — returns ALL statuses (incl. Converted) so we
    // can tell 409 (already converted) apart from 404 (absent/out-of-scope).
    const lead = await this.leadsRepository.findOwnedById(leadId, actor);
    if (!lead) {
      throw new LeadNotFoundError([{ field: 'leadId', message: `Lead ${leadId} not found` }]);
    }
    if (lead.status === LEAD_STATUS_CONVERTED) {
      throw new LeadAlreadyConvertedError([{ field: 'leadId', message: `Lead ${leadId} is already converted` }]);
    }

    return this.dataSource.transaction(async (manager) => {
      const previousStatus = lead.status;

      const enquiry = await this.enquiriesRepository.insert(
        {
          leadId: lead.leadId,
          budget: dto.budget,
          variant: dto.variant,
          exchangeInterest: dto.exchangeInterest,
          financeInterest: dto.financeInterest,
          // ---- server-derived, never from the client DTO ----
          convertedBy: actor.userId,
          ownerId: actor.userId,
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
          status: ENQUIRY_STATUS_NEW,
          customFields: {},
        },
        manager,
      );

      lead.status = LEAD_STATUS_CONVERTED;
      await manager.getRepository(lead.constructor).save(lead);

      await this.auditLogRepository.record(
        {
          actor: actor.userId,
          action: 'LEAD_CONVERTED',
          entityType: 'lead',
          entityId: String(lead.leadId),
          before: { status: previousStatus },
          after: { status: LEAD_STATUS_CONVERTED, enquiryId: enquiry.enquiryId },
          locationId: actor.locationId,
          dealerGroupId: actor.dealerGroupId,
        },
        manager,
      );

      return enquiry;
    });
  }
}
```

**Explanation**:
- Eligibility is checked BEFORE opening the transaction (fail fast), exactly as `create` checks referential validity first.
- The Lead flip uses the transactional `manager` so Enquiry + Lead + audit commit/rollback together (atomicity assertion).
- `before/after` follows the resolved audit shape (Clarification Q6).

---

### Sample 2: LeadsRepository — scoped single-Lead load + queue exclusion

**Purpose**: New `findOwnedById` (all statuses, owner/tenant scoped) and the AC5 queue exclusion.

**File**: `backend/src/leads/leads.repository.ts`

```typescript
import { Not } from 'typeorm';
import { LEAD_STATUS_CONVERTED } from './entities/lead.entity';

// NEW — backs the convert action; returns Converted leads too (409 vs 404).
async findOwnedById(leadId: string, actor: Principal, manager?: EntityManager): Promise<LeadEntity | null> {
  return this.repo(manager).findOne({
    where: {
      leadId,
      ownerId: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
    },
  });
}

// MODIFIED — exclude Converted leads from the open queue (AC5).
async findOwnQueue(actor: Principal, manager?: EntityManager): Promise<LeadEntity[]> {
  return this.repo(manager).find({
    where: {
      ownerId: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
      status: Not(LEAD_STATUS_CONVERTED),
    },
    order: { createdAt: 'DESC' },
  });
}
```

**Explanation**:
- `findOwnedById` deliberately does NOT filter `status`, so an already-Converted Lead is found and yields 409 (not 404).
- `Not(LEAD_STATUS_CONVERTED)` is the only change to the existing queue read — guard with the existing queue spec for regression.

---

## Migration Scripts

### Migration: CreateEnquiries1700000000003

**Purpose**: New `enquiries` table, FKs + embedded index + unique(lead_id), pg-mem-safe. Follows `1700000000002-CreateLeads.ts` exactly.

**File**: `backend/src/migrations/1700000000003-CreateEnquiries.ts`

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateEnquiries1700000000003 implements MigrationInterface {
  name = 'CreateEnquiries1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enquiries',
        columns: [
          { name: 'enquiry_id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'lead_id', type: 'uuid', isUnique: true }, // Q2: one Enquiry per Lead
          { name: 'budget', type: 'int' },                   // Q1: int vs bigint — confirm
          { name: 'variant', type: 'text' },
          { name: 'exchange_interest', type: 'boolean' },
          { name: 'finance_interest', type: 'boolean' },
          { name: 'converted_by', type: 'uuid' },
          { name: 'owner_id', type: 'uuid' },
          { name: 'location_id', type: 'uuid' },
          { name: 'dealer_group_id', type: 'uuid' },
          { name: 'status', type: 'varchar', default: "'New'" },
          { name: 'custom_fields', type: 'jsonb', default: "'{}'" },
          { name: 'converted_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          { columnNames: ['lead_id'], referencedTableName: 'leads', referencedColumnNames: ['lead_id'] },
          { columnNames: ['converted_by'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['owner_id'], referencedTableName: 'users', referencedColumnNames: ['user_id'] },
          { columnNames: ['location_id'], referencedTableName: 'locations', referencedColumnNames: ['location_id'] },
          { columnNames: ['dealer_group_id'], referencedTableName: 'dealer_groups', referencedColumnNames: ['dealer_group_id'] },
        ],
        // Embedded in CREATE TABLE (not a follow-up createIndex) so it travels
        // through both the real-Postgres and pg-mem drivers — see #24 migration.
        indices: [
          { name: 'idx_enquiries_owner_location_created', columnNames: ['owner_id', 'location_id', 'converted_at'] },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Raw SQL (not dropTable()) so it also runs against pg-mem — see #24 migration.
    await queryRunner.query('DROP TABLE IF EXISTS "enquiries" CASCADE');
  }
}
```

**Rollback**: `down()` drops the table with its index/FK/unique constraints via `CASCADE`. The `Converted` Lead status is additive/data-only and needs no down step.

---

## Warnings

- Do NOT add the `Converted` value via migration — it is a runtime data value on the existing `status` column, not a schema/enum change.
- `findOwnedById` must remain status-agnostic; filtering out Converted there would wrongly turn a re-convert (409) into a 404.
- Keep owner/tenant/`convertedBy`/`status` out of `ConvertLeadDto` — `whitelist:true` strips them, but the type must not declare them either (matches `CreateLeadDto`).
- The two boolean fields need explicit `@IsBoolean` and a required inline error on the form (Q3) — an unselected Yes/No must fail validation, not default to `false`.

---

**Status**: ❄️ Frozen (Source of Truth)

*These reference code samples supplement tech-design.md. Actual implementation may vary based on specifics discovered during Phase 4.*
