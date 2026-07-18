import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { LeadsService, EnrichedLead } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { LeadEntity } from './entities/lead.entity';

/** MODIFIED (issue #116): accepts either a plain `LeadEntity` (the `create`
 * path — deliberately NOT enriched, mirrors #34/#114's "keep the flat CREATE
 * response minimal since the client already has what it just submitted")
 * or an `EnrichedLead` (the list/detail paths, which always attach
 * denormalized names) — `sourceName`/`modelName`/`ownerName` come through as
 * `undefined` for the former, a string-or-null for the latter, matching
 * LeadResponseDto's `?:` typing on those three fields exactly. */
function toResponse(lead: LeadEntity | EnrichedLead): LeadResponseDto {
  const names = lead as Partial<EnrichedLead>;
  return {
    leadId: lead.leadId,
    customerName: lead.customerName,
    mobile: lead.mobile,
    sourceId: lead.sourceId,
    sourceName: names.sourceName,
    modelId: lead.modelId,
    modelName: names.modelName,
    status: lead.status,
    ownerId: lead.ownerId,
    ownerName: names.ownerName,
    ownerUpdatedAt:
      lead.ownerUpdatedAt instanceof Date ? lead.ownerUpdatedAt.toISOString() : lead.ownerUpdatedAt,
    locationId: lead.locationId,
    createdBy: lead.createdBy,
    createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,

    // ---- issue #114: new fields, visible wherever Lead details are surfaced ----
    email: lead.email,
    customerType: lead.customerType,
    city: lead.city,
    pinCode: lead.pinCode,
    preferredLanguage: lead.preferredLanguage,
    variant: lead.variant,
    fuelType: lead.fuelType,
    transmission: lead.transmission,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    buyingTimeline: lead.buyingTimeline,
    exchangeInterest: lead.exchangeInterest,
    currentVehicle: lead.currentVehicle,
    kmsDriven: lead.kmsDriven,
    registrationNumber: lead.registrationNumber,
    expectedValue: lead.expectedValue,
    paymentMode: lead.paymentMode,
    preferredFinancer: lead.preferredFinancer,
    downPaymentCapacity: lead.downPaymentCapacity,
    referrerName: lead.referrerName,
    firstFollowUpAt: lead.firstFollowUpAt instanceof Date ? lead.firstFollowUpAt.toISOString() : lead.firstFollowUpAt,
    remarks: lead.remarks,
    communicationConsentVerified: lead.communicationConsentVerified,
  };
}

/**
 * Create-Lead contract + owner-scoped queue (tech-design.md Components 2/3).
 * `SessionAuthGuard` is applied to the whole controller (deny-by-default,
 * ADR-003): every route requires a valid session; `create` additionally
 * requires the `create-lead` capability (EVAL-CC-08).
 */
@ApiTags('leads')
@Controller('api/v1/leads')
@UseGuards(SessionAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(201)
  @RequireCapability('create-lead')
  @ApiCreatedResponse({ type: LeadResponseDto })
  async create(@Body() dto: CreateLeadDto, @CurrentPrincipal() actor: Principal): Promise<LeadResponseDto> {
    const lead = await this.leadsService.create(dto, actor);
    return toResponse(lead);
  }

  @Get()
  @ApiOkResponse({ type: [LeadResponseDto] })
  async findOwnQueue(@CurrentPrincipal() actor: Principal): Promise<LeadResponseDto[]> {
    const leads = await this.leadsService.findOwnQueue(actor);
    return leads.map(toResponse);
  }

  /**
   * NEW (issue #116, AC2) — single-Lead detail read, backing the new Lead
   * Detail page. Registered AFTER `findOwnQueue` (Nest matches routes in
   * declaration order; a bare `GET /api/v1/leads` must not fall through to
   * this `:leadId` route, though in practice Express only treats this as a
   * conflict for overlapping path shapes, which these are not). Owner-scoped
   * — a 404 (never a 403) for any Lead the caller does not own, mirroring
   * EnquiriesController's LeadNotFoundError handling for the exact same
   * "not found, or out of scope — indistinguishable from non-existent" reason.
   */
  @Get(':leadId')
  @ApiParam({ name: 'leadId', description: 'The Lead to view' })
  @ApiOkResponse({ type: LeadResponseDto })
  async findOne(@Param('leadId') leadId: string, @CurrentPrincipal() actor: Principal): Promise<LeadResponseDto> {
    const lead = await this.leadsService.findOwnedById(leadId, actor);
    return toResponse(lead);
  }
}
