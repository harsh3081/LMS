import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { DuplicatesService } from './duplicates.service';
import { DuplicateQueryDto } from './dto/duplicate-query.dto';
import { DuplicateMatchDto } from './dto/duplicate-match.dto';

/**
 * GET /api/v1/duplicates?mobile={normalized} (issue #29, AC6: "exposed via
 * a documented REST API endpoint for reuse across form types" — both
 * NewLeadForm and NewEnquiryForm call this same endpoint). Tenant-scoped to
 * the caller's own `locationId` (never a client-supplied one, ADR-003).
 * Reuses the `create-lead` capability (same RBAC decision as
 * DirectEnquiryController, issue #26) rather than introducing a new one —
 * any DSE who can create a Lead/Direct-Enquiry needs this check.
 */
@ApiTags('duplicates')
@Controller('api/v1/duplicates')
@UseGuards(SessionAuthGuard)
export class DuplicatesController {
  constructor(private readonly duplicatesService: DuplicatesService) {}

  @Get()
  @RequireCapability('create-lead')
  @ApiOkResponse({ type: [DuplicateMatchDto] })
  async findMatches(
    @Query() query: DuplicateQueryDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<DuplicateMatchDto[]> {
    return this.duplicatesService.findMatches(query.mobile, actor.locationId);
  }
}
