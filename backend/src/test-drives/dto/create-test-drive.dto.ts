import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Client-supplied fields for booking a Test Drive (issue #34 AC1/AC6).
 * Unlike LogFollowupDto (a sub-resource of `:enquiryId`), `enquiryId` IS
 * part of this body — the endpoint is a flat top-level resource
 * (`POST /api/v1/test-drives`), since the booking form itself is where the
 * DSE selects which of their own Enquiries the drive is against (AC1: "DSE
 * can select a customer... from a booking form" = select one of the DSE's
 * own open Enquiries). `status`/`bookedBy`/`locationId`/`dealerGroupId` are
 * deliberately NOT here — server-derived only (ADR-003/009); the global
 * ValidationPipe (`whitelist: true`) strips any extra body properties before
 * they ever reach the service (same convention as every other create DTO in
 * this codebase).
 *
 * `@IsNotEmpty` + `@IsUUID`/`@IsISO8601` together satisfy AC6 ("System
 * rejects booking attempts with missing required fields") at the format
 * level; the cross-field "is this slot within operating hours" business rule
 * (AC2) is enforced in TestDrivesService, mirroring
 * FollowupsService.assertNextFollowUpOrTerminalStatus's convention of doing
 * business-rule checks at the service layer, not the DTO.
 */
export class CreateTestDriveDto {
  @ApiProperty({ description: 'The Enquiry (DSE-owned) this Test Drive is booked against' })
  @IsNotEmpty({ message: 'enquiryId is required' })
  @IsUUID('4', { message: 'enquiryId must be a valid id' })
  enquiryId!: string;

  @ApiProperty({ description: 'The demo vehicle to book' })
  @IsNotEmpty({ message: 'vehicleId is required' })
  @IsUUID('4', { message: 'vehicleId must be a valid id' })
  vehicleId!: string;

  @ApiProperty({ example: '2026-08-01T10:00:00.000Z', description: 'ISO 8601 date-time; must fall within operating hours' })
  @IsNotEmpty({ message: 'slotStart is required' })
  @IsISO8601({}, { message: 'slotStart must be a valid ISO 8601 date-time' })
  slotStart!: string;

  @ApiProperty({ example: '2026-08-01T10:30:00.000Z', description: 'ISO 8601 date-time; must be after slotStart and within operating hours' })
  @IsNotEmpty({ message: 'slotEnd is required' })
  @IsISO8601({}, { message: 'slotEnd must be a valid ISO 8601 date-time' })
  slotEnd!: string;
}
