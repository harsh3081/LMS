import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { LeadEntity } from './entities/lead.entity';

function toResponse(lead: LeadEntity): LeadResponseDto {
  return {
    leadId: lead.leadId,
    customerName: lead.customerName,
    mobile: lead.mobile,
    sourceId: lead.sourceId,
    modelId: lead.modelId,
    status: lead.status,
    ownerId: lead.ownerId,
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
}
