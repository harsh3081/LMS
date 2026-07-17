import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import { FOLLOWUP_TYPES } from '../entities/followup.entity';

/**
 * Client-supplied fields ONLY for logging a Follow-up (issue #30 AC1-AC4).
 * `enquiryId` is deliberately NOT here — it comes from the route param
 * (`POST /api/v1/enquiries/:enquiryId/follow-ups`), and `loggedBy`/
 * `locationId`/`dealerGroupId` are server-derived from the Principal (never
 * accepted from the client, ADR-003/009) — the global ValidationPipe
 * (`whitelist: true`) strips any extra body properties before they ever
 * reach the service, same convention as CreateDirectEnquiryDto.
 */
export class LogFollowupDto {
  /** AC1/AC4: required, must be one of the closed set of follow-up types —
   * `@IsIn` rejects both an omitted value and any value outside the set
   * (including an empty string), so "cannot be left blank" is enforced by
   * the same check as "must be a valid type". */
  @ApiProperty({ example: FOLLOWUP_TYPES[0], description: FOLLOWUP_TYPES.join(' | ') })
  @IsIn(FOLLOWUP_TYPES, { message: `type is required and must be one of: ${FOLLOWUP_TYPES.join(', ')}` })
  type!: string;

  /** AC2/AC3: mandatory free-text remarks — `@IsNotEmpty` rejects missing,
   * null, and empty-string values; `@Matches(/\S/)` additionally rejects a
   * whitespace-only string (which `@IsNotEmpty` alone would let through,
   * since `'   ' !== ''`) — a whitespace-only value is not meaningful free
   * text and should not be treated as "remarks entered" (AC2/AC3's spirit:
   * "DSE must enter free-text remarks"). Both share the same clear message. */
  @ApiProperty({ example: 'Customer requested a test drive next week.' })
  @IsString()
  @IsNotEmpty({ message: 'remarks is required' })
  @Matches(/\S/, { message: 'remarks is required' })
  remarks!: string;
}
