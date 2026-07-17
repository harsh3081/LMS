import { ApiProperty } from '@nestjs/swagger';

/** Mirrors EnquiryResponseDto's shape convention. `dealerGroupId` is
 * intentionally excluded (mirrors EnquiryResponseDto, EVAL-CC-09 precedent). */
export class FollowupResponseDto {
  @ApiProperty() followupId!: string;
  @ApiProperty() enquiryId!: string;
  @ApiProperty({ example: 'Home Visit', description: "'Home Visit' | 'Showroom Visit' | 'Call'" }) type!: string;
  @ApiProperty() remarks!: string;
  @ApiProperty() loggedBy!: string;
  @ApiProperty() locationId!: string;
  @ApiProperty() loggedAt!: string;
  /** NEW (issue #31, AC1-AC4): null only when this Follow-up closed its
   * Enquiry to a terminal status in the same request (AC2's exception). */
  @ApiProperty({ nullable: true, example: '2026-08-01T00:00:00.000Z' }) nextFollowUpAt!: string | null;
  /** NEW (issue #32, AC2): "any status change" — the terminal Enquiry status
   * (Lost/Booked) this Follow-up entry applied, if any. Null for the
   * overwhelming majority of Follow-ups (those that did not close the
   * Enquiry). */
  @ApiProperty({ nullable: true, example: 'Lost', description: 'Lost | Booked | null' }) resultingStatus!: string | null;
}
