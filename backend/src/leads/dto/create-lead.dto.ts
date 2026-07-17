import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';

/**
 * Client-supplied fields ONLY (tech-design.md Data Design / ref-code.md
 * Sample 1). Owner/tenant/status/audit are intentionally absent from this
 * type — they can never be set by a client because the type does not carry
 * them, and the global ValidationPipe (`whitelist: true`) strips any extra
 * body properties (ownerId/status/etc.) before they ever reach the service —
 * they are silently ignored, not honored (EVAL-CC-01/02).
 *
 * MODIFIED (issue #27, FR-04): mandatory-ness of these four fields is no
 * longer a static class-validator concern — it is now decided at request
 * time by FieldConfigService.assertMandatoryFieldsPresent (LeadsService.create,
 * called before persistence), reading the admin-configurable `field_config`
 * table. `@IsOptional()` here only means "the ValidationPipe must not reject
 * a request for omitting this field" — the service layer still blocks the
 * request (400, AC4) if that field is currently configured mandatory and
 * missing/blank. Format validation (mobile regex, integer type) stays here
 * and still runs whenever a value IS supplied, mandatory or not.
 */
export class CreateLeadDto {
  @ApiProperty({ example: 'Asha Rao', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '9876543210', required: false })
  @IsOptional()
  @IsString()
  @Matches(INDIA_MOBILE_REGEX, { message: 'mobile must be a valid India 10-digit number (leading 6-9)' })
  mobile?: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt({ message: 'sourceId must be an integer' })
  sourceId?: number;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsInt({ message: 'modelId must be an integer' })
  modelId?: number;

  /** NEW (issue #29, AC3): "the DSE has seen and dismissed" the duplicate-
   * warning UI and chose to proceed anyway. Purely advisory — the server
   * NEVER blocks creation on a duplicate match either way (AC3: "DSE can
   * choose to proceed"); this flag only changes which audit_log action
   * LeadsService.create writes when a duplicate mobile is actually found
   * (DUPLICATE_OVERRIDE_ACKNOWLEDGED vs ...UNACKNOWLEDGED — see NOTES.md
   * "Design decisions"). Omitted/false is indistinguishable from "the
   * client never checked" — both are logged as unacknowledged. */
  @ApiProperty({ required: false, description: 'true if the DSE dismissed a duplicate-mobile warning and chose to proceed' })
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeDuplicate must be a boolean' })
  acknowledgeDuplicate?: boolean;
}
