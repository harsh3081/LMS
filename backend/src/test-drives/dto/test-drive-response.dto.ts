import { ApiProperty } from '@nestjs/swagger';

/** Mirrors FollowupResponseDto's flat-field convention
 * (`dealerGroupId` intentionally excluded). AC3: this record — the
 * `testDriveId` plus the enquiry/vehicle/slot fields already on it — IS the
 * "booking reference" confirmation; no separate confirmation-number scheme
 * (the client already knows the customer/vehicle details it selected on the
 * form, so no server-side join/denormalization was added — see NOTES.md). */
export class TestDriveResponseDto {
  @ApiProperty() testDriveId!: string;
  @ApiProperty() enquiryId!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty() slotStart!: string;
  @ApiProperty() slotEnd!: string;
  @ApiProperty({ example: 'Booked' }) status!: string;
  @ApiProperty({ nullable: true }) remarks!: string | null;
  @ApiProperty() bookedBy!: string;
  @ApiProperty() locationId!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
