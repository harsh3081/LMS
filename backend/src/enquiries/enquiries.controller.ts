import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { EnquiriesService } from './enquiries.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { EnquiryResponseDto } from './dto/enquiry-response.dto';
import { toEnquiryResponse as toResponse } from './enquiries.mapper';

/**
 * Convert-a-Lead-into-an-Enquiry contract (tech-design.md Component 1). The
 * route intentionally stays on the Leads sub-resource path
 * (`api/v1/leads/:leadId/convert`, resolved in spec) while the handler lives
 * in this NEW Enquiry module. `SessionAuthGuard` (deny-by-default, ADR-003):
 * every route requires a valid session; `convert` additionally requires the
 * `convert-lead` capability (EVAL-CC-06/07).
 */
@ApiTags('enquiries')
@Controller('api/v1/leads')
@UseGuards(SessionAuthGuard)
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post(':leadId/convert')
  @HttpCode(201)
  @RequireCapability('convert-lead')
  @ApiParam({ name: 'leadId', description: 'The source Lead to convert' })
  @ApiCreatedResponse({ type: EnquiryResponseDto })
  async convert(
    @Param('leadId') leadId: string,
    @Body() dto: ConvertLeadDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<EnquiryResponseDto> {
    const enquiry = await this.enquiriesService.convert(leadId, dto, actor);
    return toResponse(enquiry);
  }
}
