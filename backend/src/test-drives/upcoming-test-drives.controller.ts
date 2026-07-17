import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { TestDrivesService } from './test-drives.service';
import { TestDriveResponseDto } from './dto/test-drive-response.dto';
import { toTestDriveResponse as toResponse } from './test-drives.mapper';

/**
 * "My upcoming Test Drive bookings" contract (issue #34, AC5) — mirrors
 * UpcomingFollowupsController's naming/shape/RBAC convention exactly
 * (`api/v1/test-drives/upcoming`, `SessionAuthGuard`, `create-lead`
 * capability reuse). A separate controller (not a second route on
 * `TestDrivesController`) purely to mirror that existing precedent 1:1.
 */
@ApiTags('test-drives')
@Controller('api/v1/test-drives')
@UseGuards(SessionAuthGuard)
export class UpcomingTestDrivesController {
  constructor(private readonly testDrivesService: TestDrivesService) {}

  @Get('upcoming')
  @RequireCapability('create-lead')
  @ApiOkResponse({ type: [TestDriveResponseDto] })
  async findUpcoming(@CurrentPrincipal() actor: Principal): Promise<TestDriveResponseDto[]> {
    const testDrives = await this.testDrivesService.findUpcoming(actor);
    return testDrives.map(toResponse);
  }
}
