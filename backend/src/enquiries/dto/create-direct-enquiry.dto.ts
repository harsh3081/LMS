import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';

/**
 * Client-supplied fields ONLY for a Direct Enquiry (issue #26 AC1/AC2/AC3):
 * the Lead-equivalent mandatory fields (mirrors CreateLeadDto exactly) PLUS
 * the qualifying details (mirrors ConvertLeadDto exactly), captured in one
 * step since there is no separate Lead to create first. Owner/tenant/
 * convertedBy/status/leadId/entryType are intentionally absent — they can
 * never be set by a client because the type does not carry them, and the
 * global ValidationPipe (`whitelist: true`) strips any extra body properties
 * before they ever reach the service (same convention as CreateLeadDto/
 * ConvertLeadDto).
 *
 * MODIFIED (issue #27, FR-04): the four Lead-equivalent fields' mandatory-
 * ness is now config-driven (mirrors CreateLeadDto exactly — see that file's
 * comment) via EnquiriesService.createDirect calling
 * FieldConfigService.assertMandatoryFieldsPresent. The qualifying-details
 * fields (budget/variant/exchangeInterest/financeInterest) are NOT part of
 * the configurable set (field-config.constants.ts) and stay statically
 * required exactly as before.
 */
export class CreateDirectEnquiryDto {
  // ---- Lead-equivalent fields (AC2) — mandatory-ness is config-driven (issue #27) ----
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

  // ---- Qualifying details (AC2, mirrors ConvertLeadDto) ----
  @ApiProperty({ example: 500000, description: 'Positive integer INR (whole rupees)' })
  @Type(() => Number)
  @IsInt({ message: 'budget must be a positive integer' })
  @IsPositive({ message: 'budget must be a positive integer' })
  budget!: number;

  @ApiProperty({ example: 'VXi (O) CVT' })
  @IsString()
  @IsNotEmpty({ message: 'variant is required' })
  variant!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'exchangeInterest is required and must be a boolean' })
  exchangeInterest!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean({ message: 'financeInterest is required and must be a boolean' })
  financeInterest!: boolean;

  /** NEW (issue #29, AC3) — mirrors CreateLeadDto.acknowledgeDuplicate
   * exactly; see that file's comment. */
  @ApiProperty({ required: false, description: 'true if the DSE dismissed a duplicate-mobile warning and chose to proceed' })
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeDuplicate must be a boolean' })
  acknowledgeDuplicate?: boolean;
}
