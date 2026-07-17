import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { FollowupsService } from './followups.service';
import { LogFollowupDto } from './dto/log-followup.dto';
import { FollowupResponseDto } from './dto/followup-response.dto';
import { toFollowupResponse as toResponse } from './followups.mapper';

/**
 * Log-a-Follow-up contract (issue #30 AC1-AC5) — a sub-resource of the
 * target Enquiry (`api/v1/enquiries/:enquiryId/follow-ups`), mirroring the
 * `api/v1/leads/:leadId/convert` sub-resource convention (issue #25) rather
 * than a flat top-level resource: a Follow-up cannot exist without its
 * parent Enquiry. `SessionAuthGuard` (deny-by-default, ADR-003): every route
 * requires a valid session.
 *
 * RBAC decision: reuses the existing `create-lead` capability rather than
 * introducing a new `log-followup` one — mirrors DirectEnquiryController's
 * (#26) and DuplicatesController's (#29) precedent exactly: a DSE who can
 * create a Lead/Direct-Enquiry performs the same frontline data-capture
 * role that logging a Follow-up against their own Enquiry continues, so
 * gating it behind `create-lead` keeps the RBAC surface minimal and
 * requires no changes to the frozen #24 test-user fixtures
 * (.phoenix-os/project/specs/24/tests/fixtures/test-users.json) — dseA/
 * dseB/dseC already carry `create-lead` and can log Follow-ups;
 * `noCapabilityUser` still lacks it and continues to prove deny-by-default
 * RBAC for this endpoint too. See NOTES.md for the full reasoning (a
 * dedicated `log-followup` capability was considered and rejected).
 *
 * GET is provided alongside POST (not a separate future Story) purely to
 * prove AC5 ("associated with... the correct Enquiry") end to end in this
 * Story's own test suite — it is intentionally NOT the full role-scoped
 * history timeline UI that #32 will build; it returns the same
 * owner/tenant-scoped list any #30 caller who can already see the Enquiry
 * is entitled to see.
 */
@ApiTags('followups')
@Controller('api/v1/enquiries/:enquiryId/follow-ups')
@UseGuards(SessionAuthGuard)
export class FollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Post()
  @HttpCode(201)
  @RequireCapability('create-lead')
  @ApiParam({ name: 'enquiryId', description: 'The Enquiry this Follow-up is logged against' })
  @ApiCreatedResponse({ type: FollowupResponseDto })
  async create(
    @Param('enquiryId') enquiryId: string,
    @Body() dto: LogFollowupDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<FollowupResponseDto> {
    const followup = await this.followupsService.logFollowup(enquiryId, dto, actor);
    return toResponse(followup);
  }

  @Get()
  @RequireCapability('create-lead')
  @ApiParam({ name: 'enquiryId', description: 'The Enquiry to list Follow-ups for' })
  @ApiOkResponse({ type: [FollowupResponseDto] })
  async findByEnquiry(
    @Param('enquiryId') enquiryId: string,
    @CurrentPrincipal() actor: Principal,
  ): Promise<FollowupResponseDto[]> {
    const followups = await this.followupsService.findByEnquiry(enquiryId, actor);
    return followups.map(toResponse);
  }
}
