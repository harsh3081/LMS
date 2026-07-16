import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Minimal foundational `locations` table (tenant scope, ADR-003). */
@Entity({ name: 'locations' })
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'location_id' })
  locationId!: string;

  @Column({ type: 'varchar' })
  name!: string;
}
