import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';

/**
 * GET /api/v1/duplicates query contract (issue #29, AC6/AC7). Mobile format
 * is validated with the SAME regex as CreateLeadDto/CreateDirectEnquiryDto
 * (client/server parity) — an invalid-shape mobile is rejected 400 by the
 * global ValidationPipe before DuplicatesService ever runs a query,
 * consistent with every other DTO in this codebase (no bespoke error path
 * needed for this endpoint).
 */
export class DuplicateQueryDto {
  @ApiProperty({ example: '9876543210' })
  @Matches(INDIA_MOBILE_REGEX, { message: 'mobile must be a valid India 10-digit number (leading 6-9)' })
  mobile!: string;
}
