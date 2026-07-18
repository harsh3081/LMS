import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — full (unmasked) mobile per Clarifications.
 * MODIFIED (issue #28, AC1/AC6): `createdBy` was persisted on LeadEntity
 * since #24 but was missing from this response contract — added so the
 * "who created this Lead" audit metadata is actually visible in the API
 * payload, not just in the database. `ownerUpdatedAt` (issue #28, AC4) is
 * NEW — null until the owner is ever reassigned (see
 * LeadsService.reassignOwner; no endpoint calls it yet in this Story).
 * MODIFIED (issue #114, AC6): 22 new fields added, one per new Lead column
 * (migration 1700000000016-AddLeadCustomerDetails), so every new field is
 * "visible wherever Lead details are already surfaced" — this is currently
 * the only surface (POST/GET /api/v1/leads share this one response shape).
 */
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

  // ---- 1. Customer Details ----
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) customerType!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String }) pinCode!: string | null;
  @ApiProperty({ nullable: true, type: String }) preferredLanguage!: string | null;

  // ---- 2. Vehicle Interest ----
  @ApiProperty({ nullable: true, type: String }) variant!: string | null;
  @ApiProperty({ nullable: true, type: String }) fuelType!: string | null;
  @ApiProperty({ nullable: true, type: String }) transmission!: string | null;
  @ApiProperty({ nullable: true, type: Number }) budgetMin!: number | null;
  @ApiProperty({ nullable: true, type: Number }) budgetMax!: number | null;
  @ApiProperty({ nullable: true, type: String }) buyingTimeline!: string | null;

  // ---- 3. Exchange Vehicle ----
  @ApiProperty({ nullable: true, type: Boolean }) exchangeInterest!: boolean | null;
  @ApiProperty({ nullable: true, type: String }) currentVehicle!: string | null;
  @ApiProperty({ nullable: true, type: Number }) kmsDriven!: number | null;
  @ApiProperty({ nullable: true, type: String }) registrationNumber!: string | null;
  @ApiProperty({ nullable: true, type: Number }) expectedValue!: number | null;

  // ---- 4. Finance ----
  @ApiProperty({ nullable: true, type: String }) paymentMode!: string | null;
  @ApiProperty({ nullable: true, type: String }) preferredFinancer!: string | null;
  @ApiProperty({ nullable: true, type: Number }) downPaymentCapacity!: number | null;

  // ---- 5. Source & Assignment ----
  @ApiProperty({ nullable: true, type: String }) referrerName!: string | null;

  // ---- 6. Follow-up & Consent ----
  @ApiProperty({ nullable: true, type: String }) firstFollowUpAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) remarks!: string | null;
  @ApiProperty() communicationConsentVerified!: boolean;
}
