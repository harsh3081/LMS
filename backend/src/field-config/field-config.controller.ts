import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RequireCapability } from '../auth/require-capability.decorator';
import { CurrentPrincipal } from '../auth/principal.decorator';
import { Principal } from '../common/principal';
import { FieldConfigService } from './field-config.service';
import { FieldConfigEntryDto } from './dto/field-config-response.dto';
import { UpdateFieldConfigDto } from './dto/update-field-config.dto';

/**
 * Field-configuration admin surface (issue #27 AC1/AC2/AC3/AC5).
 *
 * GET is deliberately left WITHOUT `SessionAuthGuard` (mirrors
 * ConfigController's public bootstrap-read precedent) — every authenticated
 * intake form (NewLeadForm/NewEnquiryForm, any role) needs to read the
 * current mandatory set to render itself correctly (AC3: "enforced ... at
 * next load"), not just the admin. There is no sensitive data in the read
 * (field names + booleans), so gating it behind the admin capability would
 * only break the forms for non-admin DSEs.
 *
 * PUT is gated behind the new `manage-field-config` capability (deny-by-
 * default, ADR-003) — only a designated admin-capable principal may change
 * the configuration; every change is audit-logged (AC5) by the service.
 */
@ApiTags('field-config')
@Controller('api/v1/field-config')
export class FieldConfigController {
  constructor(private readonly fieldConfigService: FieldConfigService) {}

  @Get()
  @ApiOkResponse({ type: [FieldConfigEntryDto] })
  async getAll(): Promise<FieldConfigEntryDto[]> {
    return this.fieldConfigService.getAll();
  }

  @Put()
  @UseGuards(SessionAuthGuard)
  @RequireCapability('manage-field-config')
  @ApiOkResponse({ type: [FieldConfigEntryDto] })
  async update(
    @Body() dto: UpdateFieldConfigDto,
    @CurrentPrincipal() actor: Principal,
  ): Promise<FieldConfigEntryDto[]> {
    return this.fieldConfigService.updateMany(dto.fields, actor);
  }
}
