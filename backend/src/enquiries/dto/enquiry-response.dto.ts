import { ApiProperty } from '@nestjs/swagger';

/** tech-design.md Data Design — unmasked, mirrors LeadResponseDto.
 * `dealerGroupId` is intentionally excluded (resolved spec, EVAL-CC-09).
 * MODIFIED (issue #26): `leadId` is now nullable (null for a Direct
 * Enquiry, AC4); `entryType` ('DIRECT' | 'CONVERTED') and the
 * Lead-equivalent fields (populated only for Direct Enquiries, null
 * otherwise) were added so API consumers/reports can distinguish entry
 * type without a separate lookup (AC5/AC6).
 * MODIFIED (issue #124, AC5): 30 new fields added, one per new Enquiry
 * column — mirrors EnquiryEntity exactly, so every new field captured by the
 * rewritten Convert-to-Enquiry form is "retrievable wherever Enquiry details
 * are already surfaced".
 * MODIFIED (issue #134, AC2): 5 new Customer Details fields added
 * (email/customerType/city/pinCode/preferredLanguage), populated for Direct
 * Enquiries (and, going forward, any Enquiry) — mirrors EnquiryEntity's new
 * columns exactly. */
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

  // ---- issue #134 Section 0: Customer Details ----
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) customerType!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String }) pinCode!: string | null;
  @ApiProperty({ nullable: true, type: String }) preferredLanguage!: string | null;

  // ---- issue #124 Section 1: Vehicle Information ----
  @ApiProperty({ nullable: true, type: String }) fuelType!: string | null;
  @ApiProperty({ nullable: true, type: String }) transmission!: string | null;
  @ApiProperty({ nullable: true, type: String }) colorFirstPreference!: string | null;
  @ApiProperty({ nullable: true, type: String }) colorSecondPreference!: string | null;
  @ApiProperty({ nullable: true, type: String }) accessoriesInterest!: string | null;
  @ApiProperty({ nullable: true, type: String }) competitorConsideration!: string | null;

  // ---- Section 2: Qualification ----
  @ApiProperty({ nullable: true, type: String }) contactVerified!: string | null;
  @ApiProperty({ nullable: true, type: String }) intentRating!: string | null;
  @ApiProperty({ nullable: true, type: String }) expectedClosureDate!: string | null;
  @ApiProperty({ nullable: true, type: String }) showroomVisits!: string | null;

  // ---- Section 3: Commercial ----
  @ApiProperty({ nullable: true, type: String }) quotationNumber!: string | null;
  @ApiProperty({ nullable: true, type: Number }) quotedOnRoadPrice!: number | null;
  @ApiProperty({ nullable: true, type: String }) discountDiscussed!: string | null;
  @ApiProperty({ nullable: true, type: String }) insurancePreference!: string | null;
  @ApiProperty({ nullable: true, type: String }) extendedWarrantyInterest!: string | null;
  @ApiProperty({ nullable: true, type: String }) corporateDiscountEligible!: string | null;

  // ---- Section 4: Finance ----
  @ApiProperty({ nullable: true, type: String }) financeApplicationStatus!: string | null;
  @ApiProperty({ nullable: true, type: String }) financier!: string | null;
  @ApiProperty({ nullable: true, type: Number }) loanAmountSought!: number | null;
  @ApiProperty({ nullable: true, type: String }) tenureAndEmiDiscussed!: string | null;

  // ---- Section 5: Exchange Evaluation ----
  @ApiProperty({ nullable: true, type: String }) exchangeEvaluationStatus!: string | null;
  @ApiProperty({ nullable: true, type: String }) exchangeEvaluatedBy!: string | null;
  @ApiProperty({ nullable: true, type: Number }) exchangeEvaluatedPrice!: number | null;
  @ApiProperty({ nullable: true, type: Number }) exchangeCustomerExpectation!: number | null;

  // ---- Section 6: Test Drive & Engagement ----
  @ApiProperty({ nullable: true, type: String }) testDriveStatus!: string | null;
  @ApiProperty({ nullable: true, type: String }) testDriveDateTime!: string | null;
  @ApiProperty({ nullable: true, type: String }) quotationSharedVia!: string | null;
  @ApiProperty({ nullable: true, type: String }) nextActionOwnerId!: string | null;
  @ApiProperty({ nullable: true, type: String }) testDriveFeedback!: string | null;

  // ---- Section 7: Document Checklist ----
  @ApiProperty() panCardVerified!: boolean;
  @ApiProperty() addressProofVerified!: boolean;
  @ApiProperty() incomeProofVerified!: boolean;
  @ApiProperty() gstDetailsVerified!: boolean;
}
