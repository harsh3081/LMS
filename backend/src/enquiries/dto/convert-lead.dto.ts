import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import {
  CONTACT_VERIFIED_OPTIONS,
  EXCHANGE_EVALUATION_STATUSES,
  FINANCE_APPLICATION_STATUSES,
  FINANCIER_OPTIONS,
  FUEL_TYPES,
  INSURANCE_PREFERENCES,
  INTENT_RATINGS,
  QUOTATION_SHARED_VIA_OPTIONS,
  SHOWROOM_VISIT_OPTIONS,
  TEST_DRIVE_STATUSES,
  TRANSMISSIONS,
  WARRANTY_INTEREST_OPTIONS,
} from '../entities/enquiry.entity';

/**
 * Client-supplied fields ONLY (tech-design.md Data Design / ref-code.md
 * Warnings). Owner/tenant/convertedBy/status are intentionally absent from
 * this type — they can never be set by a client because the type does not
 * carry them, and the global ValidationPipe (`whitelist: true`) strips any
 * extra body properties before they ever reach the service — they are
 * silently ignored, never honored (EVAL-CC-01). `leadId` comes from the
 * route path param, never the body.
 *
 * `budget` is stored as a `bigint` column (resolved Clarification Q1 — no
 * int4 overflow risk, no explicit upper bound) but is validated here as a
 * plain positive integer `number`; `@Type(() => Number)` coerces any
 * JSON-numeric-looking input before `@IsInt`/`@IsPositive` run, while a
 * genuinely non-numeric string (e.g. "five-lakh") still fails `@IsInt`
 * (`Number('five-lakh')` is `NaN`, which is not an integer).
 *
 * EXTENDED (issue #124, "Rewrite Convert Lead to Enquiry as a sectioned
 * form"): the original 4 fields above (`budget`/`variant`/
 * `exchangeInterest`/`financeInterest`) keep their exact required-ness — AC3
 * "nothing about the existing mandatory contract changes". Every field added
 * below is `@IsOptional()` (AC4). Grouped to mirror the rewritten form's 8
 * UI sections; Section 0 (Customer Information) is entirely READ-ONLY,
 * sourced from the Lead client-side, and has no corresponding fields here at
 * all — nothing new to validate or persist for it (see NOTES.md).
 */
export class ConvertLeadDto {
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

  // ---- 1. Vehicle Information (pre-filled from the Lead, editable) ----
  @ApiProperty({ required: false, example: 101 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modelId?: number;

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
}
