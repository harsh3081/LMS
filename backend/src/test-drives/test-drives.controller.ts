import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { TestDrivesService } from './test-drives.service';
import { CreateTestDriveDto } from './dto/create-test-drive.dto';
import { TestDriveResponseDto } from './dto/test-drive-response.dto';
import { SchedulerQueryDto } from './dto/scheduler-query.dto';
import { SchedulerSlotDto } from './dto/scheduler-slot.dto';
import { toTestDriveResponse as toResponse, toSchedulerSlot } from './test-drives.mapper';

/**
 * Book-a-Test-Drive contract (issue #34 AC1-AC6) — a flat top-level resource
 * (`api/v1/test-drives`), unlike `FollowupsController`'s `:enquiryId`
 * sub-resource path, since `enquiryId` is itself one of the fields the
 * booking form's DSE selects (see CreateTestDriveDto's comment).
 * `SessionAuthGuard` (deny-by-default, ADR-003): every route requires a
 * valid session. MODIFIED (issue #35): also hosts the scheduler-grid query
 * (`GET /api/v1/test-drives?vehicleId=&from=&to=`, see getScheduler below)
 * as a filtered GET on this same collection resource.
 *
 * RBAC decision: reuses the existing `create-lead` capability — mirrors
 * FollowupsController's/DirectEnquiryController's/DuplicatesController's
 * precedent exactly (a DSE who can create a Lead/Direct-Enquiry/Follow-up
 * performs the same frontline data-capture role that booking a Test Drive
 * against their own Enquiry continues). No new capability introduced; the
 * frozen #24 test-user fixtures (dseA/dseB/dseC) already carry it.
 */
@ApiTags('test-drives')
@Controller('api/v1/test-drives')
@UseGuards(SessionAuthGuard)
export class TestDrivesController {
  constructor(private readonly testDrivesService: TestDrivesService) {}

  @Post()
  @HttpCode(201)
  @RequireCapability('create-lead')
  @ApiCreatedResponse({ type: TestDriveResponseDto })
  async create(@Body() dto: CreateTestDriveDto, @CurrentPrincipal() actor: Principal): Promise<TestDriveResponseDto> {
    const testDrive = await this.testDrivesService.book(dto, actor);
    return toResponse(testDrive);
  }

  /**
   * NEW (issue #35, "Real-Time Test Drive Scheduler View" AC1/AC2/AC5) —
   * GET /api/v1/test-drives?vehicleId=&from=&to=: every BOOKED slot for one
   * demo vehicle within a date range, tenant-scoped but deliberately NOT
   * owner-scoped (see TestDrivesRepository.findBookedInRange's comment) —
   * any DSE at the caller's own location can see all bookings against a
   * vehicle they can also see via GET /api/v1/demo-vehicles, since demo
   * vehicles are a shared dealership resource. Reuses the `create-lead`
   * capability, same RBAC decision as this controller's other routes.
   * Response is deliberately minimal/anonymized (SchedulerSlotDto) — see
   * that DTO's comment. "Open" slots are NOT computed here — this endpoint
   * only returns what IS booked; the frontend derives the full open/booked
   * grid itself (see NOTES.md "derived, not stored").
   */
  @Get()
  @RequireCapability('create-lead')
  @ApiOkResponse({ type: [SchedulerSlotDto] })
  async getScheduler(
    @Query() query: SchedulerQueryDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<SchedulerSlotDto[]> {
    const testDrives = await this.testDrivesService.getScheduler(query, actor);
    return testDrives.map(toSchedulerSlot);
  }
}
