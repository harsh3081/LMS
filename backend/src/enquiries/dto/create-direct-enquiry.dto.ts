import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';
import { INDIA_PIN_CODE_REGEX } from '../../common/pin-code.util';
import {
  CONTACT_VERIFIED_OPTIONS,
  CUSTOMER_TYPES,
  EXCHANGE_EVALUATION_STATUSES,
  FINANCE_APPLICATION_STATUSES,
  FINANCIER_OPTIONS,
  FUEL_TYPES,
  INSURANCE_PREFERENCES,
  INTENT_RATINGS,
  PREFERRED_LANGUAGES,
  QUOTATION_SHARED_VIA_OPTIONS,
  SHOWROOM_VISIT_OPTIONS,
  TEST_DRIVE_STATUSES,
  TRANSMISSIONS,
  WARRANTY_INTEREST_OPTIONS,
} from '../entities/enquiry.entity';

/**
 * Client-supplied fields ONLY for a Direct Enquiry (issue #26 AC1/AC2/AC3):
 * the Lead-equivalent mandatory fields (mirrors CreateLeadDto exactly) PLUS
 * the qualifying details (mirrors ConvertLeadDto exactly), captured in one
 * step since there is no separate Lead to create first. Owner/tenant/
 * convertedBy/status/leadId/entryType are intentionally absent — they can
 * never be set by a client because the type does not carry them, and the
 * global ValidationPipe (`whitelist: true`) strips any extra body properties
 * before they ever reach the service (same convention as CreateLeadDto/
 * ConvertLeadDto).
 *
 * MODIFIED (issue #27, FR-04): the four Lead-equivalent fields' mandatory-
 * ness is now config-driven (mirrors CreateLeadDto exactly — see that file's
 * comment) via EnquiriesService.createDirect calling
 * FieldConfigService.assertMandatoryFieldsPresent. The qualifying-details
 * fields (budget/variant/exchangeInterest/financeInterest) are NOT part of
 * the configurable set (field-config.constants.ts) and stay statically
 * required exactly as before.
 *
 * EXTENDED (issue #134, "Redesign New Enquiry form to match
 * Convert-to-Enquiry's 8-section structure"): two groups of fields added
 * below, all `@IsOptional()` (AC3 — nothing about the existing mandatory
 * contract changes):
 *   - Customer Details (email/customerType/city/pinCode/preferredLanguage):
 *     verbatim mirror of CreateLeadDto's own Customer Details fields'
 *     decorators (`@IsEmail`, `@IsIn(CUSTOMER_TYPES)`, `@Matches
 *     (INDIA_PIN_CODE_REGEX)`, `@IsIn(PREFERRED_LANGUAGES)`) — a new
 *     migration (1700000000018-AddEnquiryCustomerDetails) added the backing
 *     `enquiries` columns, since these 5 fields existed on `leads` (#114)
 *     but were never added to `enquiries` (Direct Enquiry, #26, predates
 *     that Story).
 *   - Sections 1-7 (Vehicle Information extras through Document Checklist):
 *     VERBATIM mirror of ConvertLeadDto's own optional field set — same
 *     field names, same decorators, same imported closed-set constants (see
 *     ConvertLeadDto's own comment for why Section 0 there has no fields;
 *     here, Section 0 IS captured, since a Direct Enquiry has no Lead to
 *     read Customer Information from — see NOTES.md).
 */
export class CreateDirectEnquiryDto {
  // ---- Lead-equivalent fields (AC2) — mandatory-ness is config-driven (issue #27) ----
  @ApiProperty({ example: 'Asha Rao', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '9876543210', required: false })
  @IsOptional()
  @IsString()
  @Matches(INDIA_MOBILE_REGEX, { message: 'mobile must be a valid India 10-digit number (leading 6-9)' })
  mobile?: string;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt({ message: 'sourceId must be an integer' })
  sourceId?: number;

  @ApiProperty({ example: 12, required: false })
  @IsOptional()
  @IsInt({ message: 'modelId must be an integer' })
  modelId?: number;

  // ---- issue #134: 0. Customer Details (verbatim mirror of CreateLeadDto) ----
  @ApiProperty({ example: 'asha.rao@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a well-formed email address' })
  email?: string;

  @ApiProperty({ enum: CUSTOMER_TYPES, required: false })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES, { message: `customerType must be one of: ${CUSTOMER_TYPES.join(', ')}` })
  customerType?: (typeof CUSTOMER_TYPES)[number];

  @ApiProperty({ example: 'Pune', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: '411001', required: false, description: 'India 6-digit postal code' })
  @IsOptional()
  @IsString()
  @Matches(INDIA_PIN_CODE_REGEX, { message: 'pinCode must be a valid India 6-digit postal code (leading 1-9)' })
  pinCode?: string;

  @ApiProperty({ enum: PREFERRED_LANGUAGES, required: false })
  @IsOptional()
  @IsIn(PREFERRED_LANGUAGES, { message: `preferredLanguage must be one of: ${PREFERRED_LANGUAGES.join(', ')}` })
  preferredLanguage?: (typeof PREFERRED_LANGUAGES)[number];

  // ---- Qualifying details (AC2, mirrors ConvertLeadDto) ----
  @ApiProperty({ example: 500000, description: 'Positive integer INR (whole rupees)' })
  @Type(() => Number)
  @IsInt({ message: 'budget must be a positive integer' })
  @IsPositive({ message: 'budget must be a positive integer' })
  budget!: number;

  @ApiProperty({ example: 'VXi (O) CVT' })
  @IsString()
  @IsNotEmpty({ message: 'variant is required' })
  variant!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'exchangeInterest is required and must be a boolean' })
  exchangeInterest!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean({ message: 'financeInterest is required and must be a boolean' })
  financeInterest!: boolean;

  // ---- issue #134: 1. Vehicle Information (verbatim mirror of ConvertLeadDto) ----
  @ApiProperty({ required: false, enum: FUEL_TYPES })
  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuelType?: (typeof FUEL_TYPES)[number];

  @ApiProperty({ required: false, enum: TRANSMISSIONS })
  @IsOptional()
  @IsIn(TRANSMISSIONS)
  transmission?: (typeof TRANSMISSIONS)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  colorFirstPreference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  colorSecondPreference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accessoriesInterest?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  competitorConsideration?: string;

  // ---- 2. Qualification ----
  @ApiProperty({ required: false, enum: CONTACT_VERIFIED_OPTIONS })
  @IsOptional()
  @IsIn(CONTACT_VERIFIED_OPTIONS)
  contactVerified?: (typeof CONTACT_VERIFIED_OPTIONS)[number];

  @ApiProperty({ required: false, enum: INTENT_RATINGS })
  @IsOptional()
  @IsIn(INTENT_RATINGS)
  intentRating?: (typeof INTENT_RATINGS)[number];

  @ApiProperty({ required: false, example: '2026-08-01' })
  @IsOptional()
  @IsString()
  expectedClosureDate?: string;

  @ApiProperty({ required: false, enum: SHOWROOM_VISIT_OPTIONS })
  @IsOptional()
  @IsIn(SHOWROOM_VISIT_OPTIONS)
  showroomVisits?: (typeof SHOWROOM_VISIT_OPTIONS)[number];

  // ---- 3. Commercial ----
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quotationNumber?: string;

  @ApiProperty({ required: false, example: 550000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quotedOnRoadPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  discountDiscussed?: string;

  @ApiProperty({ required: false, enum: INSURANCE_PREFERENCES })
  @IsOptional()
  @IsIn(INSURANCE_PREFERENCES)
  insurancePreference?: (typeof INSURANCE_PREFERENCES)[number];

  @ApiProperty({ required: false, enum: WARRANTY_INTEREST_OPTIONS })
  @IsOptional()
  @IsIn(WARRANTY_INTEREST_OPTIONS)
  extendedWarrantyInterest?: (typeof WARRANTY_INTEREST_OPTIONS)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corporateDiscountEligible?: string;

  // ---- 4. Finance ----
  @ApiProperty({ required: false, enum: FINANCE_APPLICATION_STATUSES })
  @IsOptional()
  @IsIn(FINANCE_APPLICATION_STATUSES)
  financeApplicationStatus?: (typeof FINANCE_APPLICATION_STATUSES)[number];

  @ApiProperty({ required: false, enum: FINANCIER_OPTIONS })
  @IsOptional()
  @IsIn(FINANCIER_OPTIONS)
  financier?: (typeof FINANCIER_OPTIONS)[number];

  @ApiProperty({ required: false, example: 400000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  loanAmountSought?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenureAndEmiDiscussed?: string;

  // ---- 5. Exchange Evaluation ----
  @ApiProperty({ required: false, enum: EXCHANGE_EVALUATION_STATUSES })
  @IsOptional()
  @IsIn(EXCHANGE_EVALUATION_STATUSES)
  exchangeEvaluationStatus?: (typeof EXCHANGE_EVALUATION_STATUSES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  exchangeEvaluatedBy?: string;

  @ApiProperty({ required: false, example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  exchangeEvaluatedPrice?: number;

  @ApiProperty({ required: false, example: 280000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  exchangeCustomerExpectation?: number;

  // ---- 6. Test Drive & Engagement ----
  @ApiProperty({ required: false, enum: TEST_DRIVE_STATUSES })
  @IsOptional()
  @IsIn(TEST_DRIVE_STATUSES)
  testDriveStatus?: (typeof TEST_DRIVE_STATUSES)[number];

  @ApiProperty({ required: false, example: '2026-08-02T10:30:00.000Z' })
  @IsOptional()
  @IsString()
  testDriveDateTime?: string;

  @ApiProperty({ required: false, enum: QUOTATION_SHARED_VIA_OPTIONS })
  @IsOptional()
  @IsIn(QUOTATION_SHARED_VIA_OPTIONS)
  quotationSharedVia?: (typeof QUOTATION_SHARED_VIA_OPTIONS)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextActionOwnerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  testDriveFeedback?: string;

  // ---- 7. Document Checklist ----
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  panCardVerified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  addressProofVerified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  incomeProofVerified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  gstDetailsVerified?: boolean;

  /** NEW (issue #29, AC3) — mirrors CreateLeadDto.acknowledgeDuplicate
   * exactly; see that file's comment. */
  @ApiProperty({ required: false, description: 'true if the DSE dismissed a duplicate-mobile warning and chose to proceed' })
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeDuplicate must be a boolean' })
  acknowledgeDuplicate?: boolean;
}
