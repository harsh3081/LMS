import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — unmasked, mirrors LeadResponseDto.
 * `dealerGroupId` is intentionally excluded (resolved spec, EVAL-CC-09).
 * MODIFIED (issue #26): `leadId` is now nullable (null for a Direct
 * Enquiry, AC4); `entryType` ('DIRECT' | 'CONVERTED') and the
 * Lead-equivalent fields (populated only for Direct Enquiries, null
 * otherwise) were added so API consumers/reports can distinguish entry
 * type without a separate lookup (AC5/AC6). */
export class EnquiryResponseDto {
  @ApiProperty() enquiryId!: string;
  @ApiProperty({ nullable: true, type: String }) leadId!: string | null;
  @ApiProperty({ example: 'DIRECT', description: "'DIRECT' | 'CONVERTED'" }) entryType!: string;
  @ApiProperty({ nullable: true, type: String }) customerName!: string | null;
  @ApiProperty({ nullable: true, type: String }) mobile!: string | null;
  @ApiProperty({ nullable: true, type: Number }) sourceId!: number | null;
  @ApiProperty({ nullable: true, type: Number }) modelId!: number | null;
  @ApiProperty() budget!: number;
  @ApiProperty() variant!: string;
  @ApiProperty() exchangeInterest!: boolean;
  @ApiProperty() financeInterest!: boolean;
  @ApiProperty() convertedBy!: string;
  @ApiProperty() convertedAt!: string;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  /** NEW (issue #28, AC4) — null until the owner is ever reassigned (see
   * EnquiriesService.reassignOwner; no endpoint calls it yet in this Story). */
  @ApiProperty({ nullable: true, type: String }) ownerUpdatedAt!: string | null;
  @ApiProperty() locationId!: string;
}
