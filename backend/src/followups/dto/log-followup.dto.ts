import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { FOLLOWUP_TYPES } from '../entities/followup.entity';
import { ENQUIRY_TERMINAL_STATUSES } from '../../enquiries/entities/enquiry.entity';

/**
 * Client-supplied fields ONLY for logging a Follow-up (issue #30 AC1-AC4,
 * extended by issue #31 AC1-AC4 with `nextFollowUpAt`/`enquiryStatus`).
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

  /**
   * NEW (issue #31, AC1-AC3): the DSE's confirmed Next Follow-up Date — this
   * value IS the auto-generated reminder (no separate Reminder entity, see
   * .phoenix-os/project/specs/31/NOTES.md). Optional/format-only at the
   * DTO/class-validator level — `@ValidateIf` skips the ISO-format check
   * entirely when the value is omitted/blank — because WHETHER it is
   * mandatory depends on the sibling `enquiryStatus` field (AC2's
   * terminal-status exception), which class-validator's single-property
   * decorators cannot express cleanly. That cross-field rule is enforced by
   * FollowupsService.assertNextFollowUpOrTerminalStatus, mirroring
   * FieldConfigService.assertMandatoryFieldsPresent's convention of doing
   * conditional-mandatory checks in the service layer rather than the DTO.
   */
  @ApiProperty({
    required: false,
    example: '2026-08-01',
    description: 'ISO 8601 date/date-time. Required unless enquiryStatus is Lost or Booked (AC2).',
  })
  @ValidateIf((dto) => dto.nextFollowUpAt !== undefined && dto.nextFollowUpAt !== null && dto.nextFollowUpAt !== '')
  @IsISO8601({}, { message: 'nextFollowUpAt must be a valid ISO 8601 date' })
  nextFollowUpAt?: string;

  /**
   * NEW (issue #31, AC2): the minimum slice of issue #33 ("Update Enquiry
   * Status as Part of a Follow-up") pulled forward just far enough to make
   * AC2's terminal-state exception correct — see NOTES.md "Terminal-status
   * boundary" for the full reasoning and the explicit hand-off to #33
   * (transitions, reasons, permissions nuance, and audit trail beyond the
   * single audit_log row written here all remain #33's to build).
   * Deliberately restricted to the two terminal values only via `@IsIn`
   * (not the full status vocabulary) — this endpoint is not a general
   * enquiry-status-update surface.
   */
  @ApiProperty({
    required: false,
    example: ENQUIRY_TERMINAL_STATUSES[0],
    description: ENQUIRY_TERMINAL_STATUSES.join(' | '),
  })
  @IsOptional()
  @IsIn(ENQUIRY_TERMINAL_STATUSES, { message: `enquiryStatus must be one of: ${ENQUIRY_TERMINAL_STATUSES.join(', ')}` })
  enquiryStatus?: string;
}
