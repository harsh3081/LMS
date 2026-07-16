import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';

/**
 * Client-supplied fields ONLY (tech-design.md Data Design / ref-code.md
 * Sample 1). Owner/tenant/status/audit are intentionally absent from this
 * type — they can never be set by a client because the type does not carry
 * them, and the global ValidationPipe (`whitelist: true`) strips any extra
 * body properties (ownerId/status/etc.) before they ever reach the service —
 * they are silently ignored, not honored (EVAL-CC-01/02).
 */
export class CreateLeadDto {
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
}
