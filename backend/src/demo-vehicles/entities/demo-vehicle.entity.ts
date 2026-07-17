import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * `demo_vehicles` table (issue #34, migration 1700000000013-CreateTestDrives
 * — see that file's "Schema decisions" for the full rationale). Location-
 * scoped PHYSICAL demo-fleet inventory — deliberately distinct from the
 * abstract, location-agnostic `vehicle_models` catalog (see
 * vehicle-models/entities/vehicle-model.entity.ts's own comment). uuid PK
 * (operational fleet data, mirrors leads/enquiries/followups' convention,
 * not lead_sources/vehicle_models' small-static-catalog plain-int PK).
 */
@Entity({ name: 'demo_vehicles' })
@Index('idx_demo_vehicles_location', ['locationId'])
export class DemoVehicleEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'vehicle_id' })
  vehicleId!: string;

  /** FK to the abstract `vehicle_models` catalog (which model this physical
   * unit is, e.g. "Sedan GT"). */
  @Column({ name: 'model_id', type: 'int' })
  modelId!: number;

  /** Free text, mirrors `enquiries.variant` exactly. */
  @Column({ type: 'varchar' })
  variant!: string;

  /** NOT NULL — this fleet is location-scoped per tech-design ("Vehicle
   * (demo)": `vehicle_id`, `model`, `variant`, `location_id`, `availability`). */
  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  /** Simple boolean "is this unit currently bookable" flag — a richer
   * availability-calendar concept is #35/#36's territory (issue guidance). */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
