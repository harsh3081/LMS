import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

/**
 * Minimal `audit_log` — append-only (ADR-009). Written in the same
 * transaction as the Lead insert (`action = 'LEAD_CREATED'`).
 */
@Entity({ name: 'audit_log' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid' })
  actor!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar' })
  entityId!: string;

  @Column({ type: 'jsonb', nullable: true, transformer: jsonbTransformer })
  before!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, transformer: jsonbTransformer })
  after!: Record<string, unknown> | null;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
