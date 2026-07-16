import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — full (unmasked) mobile per Clarifications.
 * MODIFIED (issue #28, AC1/AC6): `createdBy` was persisted on LeadEntity
 * since #24 but was missing from this response contract — added so the
 * "who created this Lead" audit metadata is actually visible in the API
 * payload, not just in the database. `ownerUpdatedAt` (issue #28, AC4) is
 * NEW — null until the owner is ever reassigned (see
 * LeadsService.reassignOwner; no endpoint calls it yet in this Story). */
export class LeadResponseDto {
  @ApiProperty() leadId!: string;
  @ApiProperty({ nullable: true, type: String }) customerName!: string | null;
  @ApiProperty({ nullable: true, type: String }) mobile!: string | null;
  @ApiProperty({ nullable: true, type: Number }) sourceId!: number | null;
  @ApiProperty({ nullable: true, type: Number }) modelId!: number | null;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty({ nullable: true, type: String }) ownerUpdatedAt!: string | null;
  @ApiProperty() locationId!: string;
  @ApiProperty() createdBy!: string;
  @ApiProperty() createdAt!: string;
}
