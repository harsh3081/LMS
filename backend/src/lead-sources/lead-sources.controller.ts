import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { LeadSourceEntity } from './entities/lead-source.entity';

export class LeadSourceResponseDto {
  sourceId!: number;
  name!: string;
}

/** GET /api/v1/lead-sources — active source list for the form dropdown (AC5). */
@ApiTags('lead-sources')
@Controller('api/v1/lead-sources')
@UseGuards(SessionAuthGuard)
export class LeadSourcesController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async findActive(): Promise<LeadSourceResponseDto[]> {
    const sources = await this.dataSource.getRepository(LeadSourceEntity).find({ where: { active: true } });
    return sources.map((s) => ({ sourceId: s.sourceId, name: s.name }));
  }
}
