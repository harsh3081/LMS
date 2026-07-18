import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal, ROLE_DSE } from '../common/principal';
import { UserEntity } from './entities/user.entity';

export class ConsultantResponseDto {
  userId!: string;
  displayName!: string;
}

/**
 * GET /api/v1/consultants — the caller's own location's DSE roster, for the
 * New Lead form's "Assign to Consultant" dropdown (issue #114, AC5). Mirrors
 * DemoVehiclesController's minimal-controller structure exactly (issue #34):
 * location-scoped (ADR-003 tenant choke-point), role-filtered (`ROLE_DSE`
 * only). This is deliberately NOT a general user-management API — it exists
 * only to populate this one dropdown, mirroring that file's own comment.
 */
@ApiTags('consultants')
@Controller('api/v1/consultants')
@UseGuards(SessionAuthGuard)
export class ConsultantsController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOkResponse({ type: [ConsultantResponseDto] })
  async findAll(@CurrentPrincipal() actor: Principal): Promise<ConsultantResponseDto[]> {
    const users = await this.dataSource
      .getRepository(UserEntity)
      .find({ where: { locationId: actor.locationId, role: ROLE_DSE } });
    return users.map((u) => ({ userId: u.userId, displayName: u.displayName }));
  }
}
