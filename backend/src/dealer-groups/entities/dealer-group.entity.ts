import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Minimal foundational `dealer_groups` table (tenant scope, ADR-003). */
@Entity({ name: 'dealer_groups' })
export class DealerGroupEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'dealer_group_id' })
  dealerGroupId!: string;

  @Column({ type: 'varchar' })
  name!: string;
}
