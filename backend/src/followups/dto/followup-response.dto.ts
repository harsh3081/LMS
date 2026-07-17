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
}
