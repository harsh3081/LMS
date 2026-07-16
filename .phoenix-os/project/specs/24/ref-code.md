# Reference Code Samples

**Issue**: #24
**Title**: [Story] Create a New Lead
**Created**: 2026-07-16

---

## Purpose

Illustrative patterns only — not final code. Three areas benefit from a concrete reference: (1) boundary validation of the India mobile + mandatory fields, (2) the transactional persist-plus-audit write, and (3) the tenant-scope choke-point that keeps the create/queue paths from leaking across locations. ORM is shown as TypeORM (swap if Prisma is chosen — see tech-design Clarifications).

---

## Code Samples

### Sample 1: CreateLeadDto — client-supplied fields only, validated at the boundary

**Purpose**: Presence + India 10-digit mobile enforced by `class-validator`; owner/tenant/status/audit are intentionally absent so the client can never set them.

**File**: `src/leads/dto/create-lead.dto.ts`

```ts
import { IsNotEmpty, IsString, Matches, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  customerName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'mobile must be a valid India 10-digit number' })
  mobile!: string;

  @ApiProperty()
  @IsInt()
  sourceId!: number;

  @ApiProperty()
  @IsInt()
  modelId!: number;
}
```

**Explanation**:
- `whitelist: true` + `forbidNonWhitelisted: true` on the global `ValidationPipe` strips/rejects any extra field (e.g. a client trying to send `ownerId`, `status`, `locationId`).
- Regex `^[6-9]\d{9}$` = 10 digits, leading 6–9 — the frozen India rule. Mirror the identical regex on the React form for AC4 inline parity.

---

### Sample 2: Transactional persist + audit in one transaction

**Purpose**: Lead row and its `audit_log` row commit atomically (ADR-009); server derives owner/tenant/status.

**File**: `src/leads/leads.service.ts`

```ts
async create(dto: CreateLeadDto, actor: Principal): Promise<Lead> {
  // referential validity — fail fast at the boundary (AC5 + model master)
  await this.assertSourceExists(dto.sourceId);
  await this.assertModelExists(dto.modelId);

  return this.dataSource.transaction(async (tx) => {
    const lead = tx.getRepository(Lead).create({
      customerName: dto.customerName,
      mobile: dto.mobile,
      sourceId: dto.sourceId,
      modelId: dto.modelId,
      // ---- server-derived, never from client ----
      ownerId: actor.userId,
      createdBy: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
      status: 'New',
      customFields: {}, // reserved for FR-04
    });
    const saved = await tx.getRepository(Lead).save(lead);

    await tx.getRepository(AuditLog).insert({
      actor: actor.userId,
      action: 'LEAD_CREATED',
      entityType: 'lead',
      entityId: String(saved.leadId),
      before: null,
      after: { leadId: saved.leadId, status: saved.status, sourceId: saved.sourceId, modelId: saved.modelId },
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
    });

    return saved;
  });
}
```

**Explanation**:
- Both inserts share one `tx`; a failure on either rolls back both — no orphan lead without audit, no audit without lead.
- No duplicate/mobile check here — deferred to FR-06 (do not add).
- `after` deliberately omits raw PII beyond what audit requires; confirm exact `audit_log` contract (Clarifications).

---

### Sample 3: Tenant-scope choke-point for the owner queue

**Purpose**: The owner-scoped `GET /api/v1/leads` (AC6) filters by session-derived owner + location at one place, not ad hoc per endpoint (ADR-003).

**File**: `src/leads/leads.repository.ts`

```ts
// Every read routes through here; the scope is applied from the Principal,
// never from a client-supplied query param.
findOwnQueue(actor: Principal): Promise<Lead[]> {
  return this.repo.find({
    where: {
      ownerId: actor.userId,
      locationId: actor.locationId,
      dealerGroupId: actor.dealerGroupId,
    },
    order: { createdAt: 'DESC' }, // uses idx_leads_owner_location_created
  });
}
```

**Explanation**:
- Owner + tenant come from `actor` (the authenticated principal), so a DSE can only ever see their own leads in their own location.
- Cross-location isolation must be asserted by an integration test: DSE-A (location 1) must not see DSE-B's (location 2) leads.

---

## API Examples

### Endpoint: POST /api/v1/leads

**Request**:
```json
{ "customerName": "Asha Rao", "mobile": "9876543210", "sourceId": 3, "modelId": 12 }
```

**Response** (`201`):
```json
{
  "leadId": 1042,
  "customerName": "Asha Rao",
  "mobile": "9876543210",
  "sourceId": 3,
  "modelId": 12,
  "status": "New",
  "ownerId": 55,
  "locationId": 2,
  "createdAt": "2026-07-16T09:12:03.114Z"
}
```

**Notes**:
- `400` on missing field / bad mobile / unknown `sourceId` or `modelId`; `401` unauthenticated; `403` non-DSE-capability.
- `mobile` masking on the response is an open question (see tech-design Clarifications).

---

## Migration Scripts

### Migration: create `leads`

**Purpose**: Introduce the Lead schema + owner-queue index (reversible).

```sql
CREATE TABLE leads (
  lead_id          BIGSERIAL PRIMARY KEY,          -- or UUID (Clarification)
  customer_name    TEXT        NOT NULL,
  mobile           VARCHAR(10) NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  source_id        INT         NOT NULL REFERENCES lead_sources(source_id),
  model_id         INT         NOT NULL REFERENCES vehicle_models(model_id),
  owner_id         INT         NOT NULL REFERENCES users(user_id),
  location_id      INT         NOT NULL REFERENCES locations(location_id),
  dealer_group_id  INT         NOT NULL REFERENCES dealer_groups(dealer_group_id),
  status           VARCHAR(20) NOT NULL DEFAULT 'New',
  custom_fields    JSONB       NOT NULL DEFAULT '{}',
  created_by       INT         NOT NULL REFERENCES users(user_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_owner_location_created
  ON leads (owner_id, location_id, created_at DESC);
-- NO unique constraint on mobile — FR-06 owns duplicate handling.
```

**Rollback**:
```sql
DROP INDEX IF EXISTS idx_leads_owner_location_created;
DROP TABLE IF EXISTS leads;
```

---

## Warnings

- Do **not** add a `UNIQUE`/duplicate check on `mobile` — deferred to FR-06; adding it now causes rework and premature coupling.
- Owner/tenant/status/audit must be server-derived; reject client attempts to set them (`forbidNonWhitelisted`).
- FK targets (`lead_sources`, `vehicle_models`, `users`, `locations`, `dealer_groups`, `audit_log`) must exist before this migration runs — none are present in the repo yet.

---

**Status**: ❄️ Frozen (Source of Truth)

*These reference code samples supplement tech-design.md. They are illustrative; final implementation may vary as Clarifications resolve.*
