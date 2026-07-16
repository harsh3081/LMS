import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

/**
 * Minimal foundational `users` table — scoped to what Create-Lead needs
 * (session principal fields + a minimal capability list for RBAC).
 * Not a full user-management feature (tech-design Clarifications, resolved).
 */
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'varchar' })
  role!: string;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  /** Minimal deny-by-default capability list (e.g. ["create-lead"]). */
  @Column({ type: 'jsonb', default: () => "'[]'", transformer: jsonbTransformer })
  capabilities!: string[];
}
