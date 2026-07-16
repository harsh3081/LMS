import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Minimal foundational `lead_sources` master (this Story consumes, does not
 * administer — spec.md Constraints). Plain (non-auto-generated) integer PK:
 * master-data administration/seeding is explicitly out of this Story's
 * scope, so rows are assigned fixed ids by the seed/migration process,
 * matching the frozen eval-criteria fixtures (sourceId 1-5) exactly.
 */
@Entity({ name: 'lead_sources' })
export class LeadSourceEntity {
  @PrimaryColumn({ name: 'source_id', type: 'int' })
  sourceId!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
