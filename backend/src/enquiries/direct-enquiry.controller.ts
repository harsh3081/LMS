import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { EnquiriesService } from './enquiries.service';
import { CreateDirectEnquiryDto } from './dto/create-direct-enquiry.dto';
import { EnquiryResponseDto } from './dto/enquiry-response.dto';
import { toEnquiryResponse as toResponse } from './enquiries.mapper';

/**
 * Create-a-Direct-Enquiry contract (issue #26 AC6: "exposed via a
 * documented REST API endpoint"). Deliberately a separate top-level
 * resource (`api/v1/enquiries`) rather than the `/leads/:id/convert`
 * sub-resource path (#25) — a Direct Enquiry has no parent Lead (AC1/AC4),
 * so it cannot live under `/leads`. `SessionAuthGuard` (deny-by-default,
 * ADR-003): every route requires a valid session.
 *
 * RBAC decision: reuses the existing `create-lead` capability rather than
 * introducing a new `create-enquiry` capability. A DSE who can create a
 * Lead already captures the same Lead-equivalent mandatory fields (AC2);
 * a Direct Enquiry is a superset of that same data-entry action (plus
 * qualifying details), so gating it behind `create-lead` keeps the RBAC
 * surface minimal and requires no changes to the frozen #24/#25 test-user
 * fixtures (.phoenix-os/project/specs/24/tests/fixtures/test-users.json) —
 * dseA/dseB/dseC already carry `create-lead` and can create Direct
 * Enquiries; `noCapabilityUser` still lacks it and continues to prove
 * deny-by-default RBAC for this endpoint too.
 */
@ApiTags('enquiries')
@Controller('api/v1/enquiries')
@UseGuards(SessionAuthGuard)
export class DirectEnquiryController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  @HttpCode(201)
  @RequireCapability('create-lead')
  @ApiCreatedResponse({ type: EnquiryResponseDto })
  async create(
    @Body() dto: CreateDirectEnquiryDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<EnquiryResponseDto> {
    const enquiry = await this.enquiriesService.createDirect(dto, actor);
    return toResponse(enquiry);
  }

  @Get()
  @ApiOkResponse({ type: [EnquiryResponseDto] })
  async findOwnQueue(@CurrentPrincipal() actor: Principal): Promise<EnquiryResponseDto[]> {
    const enquiries = await this.enquiriesService.findOwnQueue(actor);
    return enquiries.map(toResponse);
  }
}
