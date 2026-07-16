import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Minimal foundational, location-agnostic `vehicle_models` master
 * (deliberately NOT the location-scoped demo-fleet Vehicle table — resolved).
 * Plain (non-auto-generated) integer PK — see LeadSourceEntity for rationale.
 */
@Entity({ name: 'vehicle_models' })
export class VehicleModelEntity {
  @PrimaryColumn({ name: 'model_id', type: 'int' })
  modelId!: number;

  @Column({ type: 'varchar' })
  name!: string;
}
