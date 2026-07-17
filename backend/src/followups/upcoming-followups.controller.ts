import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { FollowupsService } from './followups.service';
import { FollowupResponseDto } from './dto/followup-response.dto';
import { toFollowupResponse as toResponse } from './followups.mapper';

/**
 * "My upcoming Follow-ups" contract (issue #31 AC4) — a top-level resource
 * (`api/v1/follow-ups/upcoming`), deliberately a separate controller/path
 * from `FollowupsController` (which is scoped under
 * `api/v1/enquiries/:enquiryId/follow-ups` and always needs an `enquiryId`):
 * this list spans every Enquiry the DSE has scheduled a next action for, not
 * one Enquiry's history. `SessionAuthGuard` (deny-by-default, ADR-003) and
 * the same `create-lead` capability reuse as the rest of the Follow-up
 * surface (mirrors FollowupsController's RBAC precedent — see NOTES.md).
 *
 * This IS the AC3/AC4 "auto-generated reminder" surface: no separate
 * Reminder entity/job exists, the persisted `nextFollowUpAt` value on each
 * Follow-up row is directly queried and returned here. See NOTES.md for why
 * AC5's "shared scheduled job/notification service" is explicitly deferred
 * (no such infrastructure exists anywhere in this codebase).
 */
@ApiTags('followups')
@Controller('api/v1/follow-ups')
@UseGuards(SessionAuthGuard)
export class UpcomingFollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Get('upcoming')
  @RequireCapability('create-lead')
  @ApiOkResponse({ type: [FollowupResponseDto] })
  async findUpcoming(@CurrentPrincipal() actor: Principal): Promise<FollowupResponseDto[]> {
    const followups = await this.followupsService.findUpcoming(actor);
    return followups.map(toResponse);
  }
}
