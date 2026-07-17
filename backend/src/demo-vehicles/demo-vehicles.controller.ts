import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { DemoVehicleEntity } from './entities/demo-vehicle.entity';

export class DemoVehicleResponseDto {
  vehicleId!: string;
  modelId!: number;
  variant!: string;
  locationId!: string;
}

/**
 * GET /api/v1/demo-vehicles — the caller's own location's active demo fleet,
 * for the "Book a Test Drive" form's vehicle dropdown (issue #34, AC1).
 * Mirrors VehicleModelsController's structure, but location-scoped (ADR-003
 * tenant choke-point) and `isActive` filtered, since `demo_vehicles` — unlike
 * the location-agnostic `vehicle_models` catalog — is per-location fleet
 * data (tech-design.md "Vehicle (demo)": `location_id`).
 */
@ApiTags('demo-vehicles')
@Controller('api/v1/demo-vehicles')
@UseGuards(SessionAuthGuard)
export class DemoVehiclesController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOkResponse({ type: [DemoVehicleResponseDto] })
  async findAll(@CurrentPrincipal() actor: Principal): Promise<DemoVehicleResponseDto[]> {
    const vehicles = await this.dataSource
      .getRepository(DemoVehicleEntity)
      .find({ where: { locationId: actor.locationId, isActive: true } });
    return vehicles.map((v) => ({
      vehicleId: v.vehicleId,
      modelId: v.modelId,
      variant: v.variant,
      locationId: v.locationId,
    }));
  }
}
