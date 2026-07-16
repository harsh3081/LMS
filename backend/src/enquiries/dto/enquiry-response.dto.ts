import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — unmasked, mirrors LeadResponseDto.
 * `dealerGroupId` is intentionally excluded (resolved spec, EVAL-CC-09). */
export class EnquiryResponseDto {
  @ApiProperty() enquiryId!: string;
  @ApiProperty() leadId!: string;
  @ApiProperty() budget!: number;
  @ApiProperty() variant!: string;
  @ApiProperty() exchangeInterest!: boolean;
  @ApiProperty() financeInterest!: boolean;
  @ApiProperty() convertedBy!: string;
  @ApiProperty() convertedAt!: string;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() locationId!: string;
}
