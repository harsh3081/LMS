import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

export const ENQUIRY_STATUS_NEW = 'New';

/** NEW (issue #31, AC2): the minimal terminal-state subset needed for this
 * Story's "closing a Follow-up without a Next Follow-up Date" exception.
 * Issue #33 ("Update Enquiry Status as Part of a Follow-up") owns the FULL
 * status vocabulary/transition workflow (reasons, permissions nuance,
 * audit) — this Story only needs to recognize these two values as
 * "terminal" for FollowupsService's AC2 check, and allows the SAME
 * follow-up-logging request to optionally set one of them (see
 * LogFollowupDto.enquiryStatus). See
 * .phoenix-os/project/specs/31/NOTES.md for the full boundary reasoning. */
export const ENQUIRY_STATUS_LOST = 'Lost';
export const ENQUIRY_STATUS_BOOKED = 'Booked';
export const ENQUIRY_TERMINAL_STATUSES = [ENQUIRY_STATUS_LOST, ENQUIRY_STATUS_BOOKED] as const;

/** Distinguishes a Direct Enquiry (issue #26, no parent Lead) from one
 * converted from an existing Lead (issue #25). See migration
 * 1700000000005-DirectEnquiry.ts "Schema decisions" for why this is an
 * explicit column rather than inferred from `leadId === null`. */
export const ENQUIRY_ENTRY_TYPE_DIRECT = 'DIRECT';
export const ENQUIRY_ENTRY_TYPE_CONVERTED = 'CONVERTED';

/**
 * `bigint` columns round-trip as JS strings by default (both real Postgres
 * and pg-mem) to avoid precision loss for values beyond Number.MAX_SAFE_INTEGER.
 * `budget` (INR whole rupees, resolved Clarification Q1) is NOT NULL and
 * never approaches that range in practice, so this transformer normalizes it
 * back to a JS number on read for a clean EnquiryResponseDto/API surface,
 * mirroring the `jsonbTransformer` cross-driver-normalization pattern above.
 */
const bigintTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number): number => Number(value),
};

/**
 * `enquiries` table (tech-design Data Design, issue #25). Mirrors LeadEntity
 * conventions exactly (uuid PK, snake_case columns, `jsonbTransformer`).
 * Owner/tenant/convertedBy/status are server-derived only — never accepted
 * from the client (ADR-003/009), enforced in EnquiriesService.convert.
 * `leadId` carries a DB-level UNIQUE constraint (see migration
 * 1700000000003) — defense-in-depth behind the app-level 409 check.
 */
@Entity({ name: 'enquiries' })
@Index('idx_enquiries_owner_location_created', ['ownerId', 'locationId', 'convertedAt'])
export class EnquiryEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'enquiry_id' })
  enquiryId!: string;

  /** MODIFIED (issue #26, migration 1700000000005): nullable — a Direct
   * Enquiry (entryType DIRECT) has no parent Lead (AC4). Still carries a
   * DB-level UNIQUE constraint for non-null values (one Enquiry per
   * converted Lead, #25 Q2); Postgres treats every NULL as distinct so any
   * number of Direct Enquiries can coexist. */
  @Column({ name: 'lead_id', type: 'uuid', unique: true, nullable: true })
  leadId!: string | null;

  /** NEW (issue #26). Defaults to CONVERTED so pre-existing (#25) rows are
   * backfilled without a data migration statement. */
  @Column({ name: 'entry_type', type: 'varchar', default: ENQUIRY_ENTRY_TYPE_CONVERTED })
  entryType!: string;

  /** NEW (issue #26) — Lead-equivalent mandatory fields (AC2), populated
   * only for Direct Enquiries (entryType DIRECT). NULL for Converted
   * Enquiries, where this data is reachable via the (non-null) `leadId`
   * join to `leads` instead of being duplicated here. */
  @Column({ name: 'customer_name', type: 'text', nullable: true })
  customerName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mobile!: string | null;

  @Column({ name: 'source_id', type: 'int', nullable: true })
  sourceId!: number | null;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId!: number | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  budget!: number;

  @Column({ type: 'text' })
  variant!: string;

  @Column({ name: 'exchange_interest', type: 'boolean' })
  exchangeInterest!: boolean;

  @Column({ name: 'finance_interest', type: 'boolean' })
  financeInterest!: boolean;

  @Column({ name: 'converted_by', type: 'uuid' })
  convertedBy!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  /** NEW (issue #28, AC4): set whenever `ownerId` is reassigned (see
   * EnquiriesRepository.reassignOwner / EnquiriesService.reassignOwner).
   * NULL means "never reassigned since creation" — additive nullable column,
   * migration 1700000000009-AddOwnerUpdatedAt, mirrors LeadEntity.ownerUpdatedAt
   * exactly. No controller/endpoint calls the reassignment path yet in this
   * Story (deferred to a future TL-reassignment Story). */
  @Column({ name: 'owner_updated_at', type: 'timestamptz', nullable: true })
  ownerUpdatedAt!: Date | null;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @Column({ type: 'varchar', default: ENQUIRY_STATUS_NEW })
  status!: string;

  /** Reserved for FR-04 configurable fields; provisioned, unused this Story. */
  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'", transformer: jsonbTransformer })
  customFields!: Record<string, unknown>;

  @CreateDateColumn({ name: 'converted_at', type: 'timestamptz' })
  convertedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
