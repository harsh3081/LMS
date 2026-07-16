import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

export const LEAD_STATUS_NEW = 'New';

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

  @Column({ name: 'customer_name', type: 'text' })
  customerName!: string;

  @Column({ type: 'varchar', length: 10 })
  mobile!: string;

  @Column({ name: 'source_id', type: 'int' })
  sourceId!: number;

  @Column({ name: 'model_id', type: 'int' })
  modelId!: number;

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
