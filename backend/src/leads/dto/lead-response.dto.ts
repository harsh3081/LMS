import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — full (unmasked) mobile per Clarifications. */
export class LeadResponseDto {
  @ApiProperty() leadId!: string;
  @ApiProperty({ nullable: true, type: String }) customerName!: string | null;
  @ApiProperty({ nullable: true, type: String }) mobile!: string | null;
  @ApiProperty({ nullable: true, type: Number }) sourceId!: number | null;
  @ApiProperty({ nullable: true, type: Number }) modelId!: number | null;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() locationId!: string;
  @ApiProperty() createdAt!: string;
}
