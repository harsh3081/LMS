import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — full (unmasked) mobile per Clarifications. */
export class LeadResponseDto {
  @ApiProperty() leadId!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() mobile!: string;
  @ApiProperty() sourceId!: number;
  @ApiProperty() modelId!: number;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() locationId!: string;
  @ApiProperty() createdAt!: string;
}
