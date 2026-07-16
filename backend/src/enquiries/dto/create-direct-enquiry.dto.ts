import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsPositive, IsString, Matches } from 'class-validator';
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
 */
export class CreateDirectEnquiryDto {
  // ---- Lead-equivalent mandatory fields (AC2) ----
  @ApiProperty({ example: 'Asha Rao' })
  @IsString()
  @IsNotEmpty({ message: 'customerName is required' })
  customerName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty({ message: 'mobile is required' })
  @Matches(INDIA_MOBILE_REGEX, { message: 'mobile must be a valid India 10-digit number (leading 6-9)' })
  mobile!: string;

  @ApiProperty({ example: 3 })
  @IsInt({ message: 'sourceId is required and must be an integer' })
  sourceId!: number;

  @ApiProperty({ example: 12 })
  @IsInt({ message: 'modelId is required and must be an integer' })
  modelId!: number;

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
}
