import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { VehicleModelEntity } from './entities/vehicle-model.entity';

export class VehicleModelResponseDto {
  modelId!: number;
  name!: string;
}

/** GET /api/v1/vehicle-models — model master for the form dropdown. */
@ApiTags('vehicle-models')
@Controller('api/v1/vehicle-models')
@UseGuards(SessionAuthGuard)
export class VehicleModelsController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async findAll(): Promise<VehicleModelResponseDto[]> {
    const models = await this.dataSource.getRepository(VehicleModelEntity).find();
    return models.map((m) => ({ modelId: m.modelId, name: m.name }));
  }
}
