import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { INDIA_MOBILE_REGEX } from '../../common/mobile.util';
import { INDIA_PIN_CODE_REGEX } from '../../common/pin-code.util';
import {
  BUYING_TIMELINES,
  CUSTOMER_TYPES,
  FUEL_TYPES,
  PAYMENT_MODES,
  PREFERRED_LANGUAGES,
  TRANSMISSIONS,
} from '../entities/lead.entity';

/**
 * Client-supplied fields ONLY (tech-design.md Data Design / ref-code.md
 * Sample 1). Owner/tenant/status/audit are intentionally absent from this
 * type — they can never be set by a client because the type does not carry
 * them, and the global ValidationPipe (`whitelist: true`) strips any extra
 * body properties (ownerId/status/etc.) before they ever reach the service —
 * they are silently ignored, not honored (EVAL-CC-01/02).
 *
 * MODIFIED (issue #27, FR-04): mandatory-ness of these four fields is no
 * longer a static class-validator concern — it is now decided at request
 * time by FieldConfigService.assertMandatoryFieldsPresent (LeadsService.create,
 * called before persistence), reading the admin-configurable `field_config`
 * table. `@IsOptional()` here only means "the ValidationPipe must not reject
 * a request for omitting this field" — the service layer still blocks the
 * request (400, AC4) if that field is currently configured mandatory and
 * missing/blank. Format validation (mobile regex, integer type) stays here
 * and still runs whenever a value IS supplied, mandatory or not.
 *
 * MODIFIED (issue #114): 22 new fields added, one per new Lead column
 * (migration 1700000000016-AddLeadCustomerDetails), grouped to mirror the
 * New Lead form's 6 UI sections. Every new field is `@IsOptional()` and
 * STATICALLY so (issue #114 AC2) — deliberately NOT routed through
 * FieldConfigService/CONFIGURABLE_FIELD_KEYS, which per its own code comment
 * (field-config.constants.ts) stays scoped to exactly the 4 pre-existing
 * shared Lead/Enquiry fields above. The sole exception is
 * `communicationConsentVerified`, a hard compliance gate enforced directly
 * below via `@Equals(true)` — not config-driven either, but for the opposite
 * reason (always required, never optional).
 */
export class CreateLeadDto {
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

  // ==========================================================================
  // NEW (issue #114) — 1. Customer Details
  // ==========================================================================
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

  // ==========================================================================
  // NEW (issue #114) — 2. Vehicle Interest
  // ==========================================================================
  @ApiProperty({ example: 'VXi (O) CVT', required: false })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiProperty({ enum: FUEL_TYPES, required: false })
  @IsOptional()
  @IsIn(FUEL_TYPES, { message: `fuelType must be one of: ${FUEL_TYPES.join(', ')}` })
  fuelType?: (typeof FUEL_TYPES)[number];

  @ApiProperty({ enum: TRANSMISSIONS, required: false })
  @IsOptional()
  @IsIn(TRANSMISSIONS, { message: `transmission must be one of: ${TRANSMISSIONS.join(', ')}` })
  transmission?: (typeof TRANSMISSIONS)[number];

  @ApiProperty({ example: 800000, required: false, description: 'INR whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'budgetMin must be a non-negative integer' })
  @Min(0, { message: 'budgetMin must be a non-negative integer' })
  budgetMin?: number;

  @ApiProperty({ example: 1200000, required: false, description: 'INR whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'budgetMax must be a non-negative integer' })
  @Min(0, { message: 'budgetMax must be a non-negative integer' })
  budgetMax?: number;

  @ApiProperty({ enum: BUYING_TIMELINES, required: false })
  @IsOptional()
  @IsIn(BUYING_TIMELINES, { message: `buyingTimeline must be one of: ${BUYING_TIMELINES.join(', ')}` })
  buyingTimeline?: (typeof BUYING_TIMELINES)[number];

  // ==========================================================================
  // NEW (issue #114) — 3. Exchange Vehicle (optional group)
  // ==========================================================================
  @ApiProperty({ required: false, description: 'Gates the 4 exchange-detail fields below; true if the customer has a vehicle to exchange' })
  @IsOptional()
  @IsBoolean({ message: 'exchangeInterest must be a boolean' })
  exchangeInterest?: boolean;

  @ApiProperty({ example: 'Maruti Swift 2018', required: false })
  @IsOptional()
  @IsString()
  currentVehicle?: string;

  @ApiProperty({ example: 45000, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'kmsDriven must be a non-negative integer' })
  @Min(0, { message: 'kmsDriven must be a non-negative integer' })
  kmsDriven?: number;

  @ApiProperty({ example: 'MH12AB1234', required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ example: 350000, required: false, description: 'INR whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'expectedValue must be a non-negative integer' })
  @Min(0, { message: 'expectedValue must be a non-negative integer' })
  expectedValue?: number;

  // ==========================================================================
  // NEW (issue #114) — 4. Finance
  // ==========================================================================
  @ApiProperty({ enum: PAYMENT_MODES, required: false })
  @IsOptional()
  @IsIn(PAYMENT_MODES, { message: `paymentMode must be one of: ${PAYMENT_MODES.join(', ')}` })
  paymentMode?: (typeof PAYMENT_MODES)[number];

  @ApiProperty({ example: 'HDFC Bank', required: false })
  @IsOptional()
  @IsString()
  preferredFinancer?: string;

  @ApiProperty({ example: 100000, required: false, description: 'INR whole rupees' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'downPaymentCapacity must be a non-negative integer' })
  @Min(0, { message: 'downPaymentCapacity must be a non-negative integer' })
  downPaymentCapacity?: number;

  // ==========================================================================
  // NEW (issue #114) — 5. Source & Assignment
  // ==========================================================================
  /** Free text; relevant only when sourceId is the 'Referral' lead_sources
   * row (id=2) — client-side conditional display only (see lead.entity.ts's
   * `referrerName` column comment). */
  @ApiProperty({ example: 'Rohit Sharma (existing customer)', required: false })
  @IsOptional()
  @IsString()
  referrerName?: string;

  /** NEW (issue #114, AC5): optionally assigns the Lead's owner to a
   * different DSE at the caller's own location/dealer group at creation
   * time. LeadsService.create validates the target (exists, role DSE, same
   * location/dealerGroupId as the caller) and 400s (ReferentialValidationError)
   * if invalid — omitted preserves issue #28's self-assignment default. */
  @ApiProperty({ required: false, description: 'userId of the DSE to assign this Lead to; omit to self-assign (default)' })
  @IsOptional()
  @IsUUID('4', { message: 'assignedOwnerId must be a valid UUID' })
  assignedOwnerId?: string;

  // ==========================================================================
  // NEW (issue #114) — 6. Follow-up & Consent
  // ==========================================================================
  @ApiProperty({ example: '2026-08-01T10:00:00.000Z', required: false })
  @IsOptional()
  @IsISO8601({}, { message: 'firstFollowUpAt must be a valid ISO 8601 date-time' })
  firstFollowUpAt?: string;

  @ApiProperty({ example: 'Interested in test drive next week.', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;

  /** Hard compliance gate (TRAI DND relevance) — NOT config-driven, NOT
   * `@IsOptional()`: a request omitting this field, or supplying anything
   * other than the literal boolean `true`, is rejected (400) by the global
   * ValidationPipe before LeadsService.create ever runs (defense-in-depth:
   * the client (NewLeadForm) also blocks submission until checked). */
  @ApiProperty({ example: true, description: 'Must be explicitly true — compliance gate, see issue #114 AC2' })
  @IsBoolean({ message: 'communicationConsentVerified must be a boolean' })
  @Equals(true, { message: 'communicationConsentVerified must be true to submit a lead' })
  communicationConsentVerified!: boolean;

  /** NEW (issue #29, AC3): "the DSE has seen and dismissed" the duplicate-
   * warning UI and chose to proceed anyway. Purely advisory — the server
   * NEVER blocks creation on a duplicate match either way (AC3: "DSE can
   * choose to proceed"); this flag only changes which audit_log action
   * LeadsService.create writes when a duplicate mobile is actually found
   * (DUPLICATE_OVERRIDE_ACKNOWLEDGED vs ...UNACKNOWLEDGED — see NOTES.md
   * "Design decisions"). Omitted/false is indistinguishable from "the
   * client never checked" — both are logged as unacknowledged. */
  @ApiProperty({ required: false, description: 'true if the DSE dismissed a duplicate-mobile warning and chose to proceed' })
  @IsOptional()
  @IsBoolean({ message: 'acknowledgeDuplicate must be a boolean' })
  acknowledgeDuplicate?: boolean;
}
