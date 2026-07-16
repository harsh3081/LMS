import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

export const ENQUIRY_STATUS_NEW = 'New';

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

  @Column({ name: 'lead_id', type: 'uuid', unique: true })
  leadId!: string;

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
