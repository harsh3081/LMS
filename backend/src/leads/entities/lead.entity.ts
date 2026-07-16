import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

export const LEAD_STATUS_NEW = 'New';
/** Additive, data-only status value (issue #25) — no schema change; see
 * migrations 1700000000003-CreateEnquiries.ts "Warnings". Set by
 * EnquiriesService.convert() when a Lead is converted into an Enquiry. */
export const LEAD_STATUS_CONVERTED = 'Converted';

/**
 * `leads` table (tech-design Data Design). Owner/tenant/status/audit are
 * server-derived only — never accepted from the client (ADR-003/009).
 * No mobile uniqueness constraint — duplicate handling deferred to FR-06.
 */
@Entity({ name: 'leads' })
@Index('idx_leads_owner_location_created', ['ownerId', 'locationId', 'createdAt'])
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'lead_id' })
  leadId!: string;

  /** MODIFIED (issue #27, migration 1700000000007): nullable — field-config
   * (FR-04) may mark this field optional, and a Lead created while it is
   * optional-and-omitted must be storable (mirrors EnquiryEntity.customerName,
   * made nullable for the same reason in #26). */
  @Column({ name: 'customer_name', type: 'text', nullable: true })
  customerName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mobile!: string | null;

  @Column({ name: 'source_id', type: 'int', nullable: true })
  sourceId!: number | null;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId!: number | null;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @Column({ type: 'varchar', default: LEAD_STATUS_NEW })
  status!: string;

  /** Reserved for FR-04 configurable fields; provisioned, unused this Story. */
  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'", transformer: jsonbTransformer })
  customFields!: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
