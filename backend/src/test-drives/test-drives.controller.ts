import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { TestDrivesService } from './test-drives.service';
import { CreateTestDriveDto } from './dto/create-test-drive.dto';
import { TestDriveResponseDto } from './dto/test-drive-response.dto';
import { toTestDriveResponse as toResponse } from './test-drives.mapper';

/**
 * Book-a-Test-Drive contract (issue #34 AC1-AC6) — a flat top-level resource
 * (`api/v1/test-drives`), unlike `FollowupsController`'s `:enquiryId`
 * sub-resource path, since `enquiryId` is itself one of the fields the
 * booking form's DSE selects (see CreateTestDriveDto's comment).
 * `SessionAuthGuard` (deny-by-default, ADR-003): every route requires a
 * valid session.
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
}
