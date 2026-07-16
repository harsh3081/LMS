import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * `field_config` table (issue #27, FR-04). One row per configurable field on
 * the Lead/Enquiry intake forms; `mandatory` governs whether
 * FieldConfigService.assertMandatoryFieldsPresent blocks a Create-Lead /
 * Create-Direct-Enquiry submission that omits it (AC3/AC4). `fieldName` is a
 * plain varchar PK (not a generated id) — this is a small, admin-curated
 * fixed set of known field keys (see field-config.constants.ts
 * CONFIGURABLE_FIELD_KEYS), not a growing user-created collection, so a
 * natural key keeps reads/writes simple (no join needed to resolve a name).
 * `updatedBy`/`updatedAt` are a lightweight "last change" pointer for the
 * admin screen; the full change history (who/what/when for every change,
 * AC5) lives in the existing `audit_log` table via AuditLogRepository —
 * this table is not the audit trail itself.
 */
@Entity({ name: 'field_config' })
export class FieldConfigEntity {
  @PrimaryColumn({ name: 'field_name', type: 'varchar' })
  fieldName!: string;

  @Column({ type: 'boolean' })
  mandatory!: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
