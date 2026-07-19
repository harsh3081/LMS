import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';
import { FUEL_TYPES, TRANSMISSIONS, CUSTOMER_TYPES, PREFERRED_LANGUAGES } from '../../leads/entities/lead.entity';

/** Re-exported so ConvertLeadDto / enquiries.mapper.ts can import the closed-
 * set vocabulary from this module without also reaching into
 * leads/entities/lead.entity.ts directly (issue #124 migration comment point
 * 2 — this is a deliberate intra-backend cross-module reuse, not the
 * frontend/backend duplication convention). NEW (issue #134):
 * `CUSTOMER_TYPES`/`PREFERRED_LANGUAGES` re-exported the same way, so
 * `CreateDirectEnquiryDto` can import every closed-set vocabulary it needs
 * from this single module. */
export { FUEL_TYPES, TRANSMISSIONS, CUSTOMER_TYPES, PREFERRED_LANGUAGES };

/**
 * Closed-set dropdown vocabularies NEW for issue #124 ("Rewrite Convert Lead
 * to Enquiry as a sectioned form") — named exported constants, consumed by
 * ConvertLeadDto's `@IsIn()` decorators AND by migration
 * 1700000000017-AddEnquiryConversionDetails's defense-in-depth CHECK
 * constraints, so the DTO and the DB schema cannot silently drift apart
 * (mirrors lead.entity.ts's CUSTOMER_TYPES/etc. convention exactly). See
 * .phoenix-os/project/specs/124/NOTES.md for the option-set source.
 */
export const CONTACT_VERIFIED_OPTIONS = ['Call Connected', 'OTP Verified', 'WhatsApp Confirmed', 'Not Verified'] as const;

/** Distinct from ENQUIRY_ALL_LOGGABLE_STATUSES/ENQUIRY_STATUS_HOT/WARM/COLD
 * below (issue #33) — see migration 1700000000017's class comment point 4
 * for why these are NOT the same vocabulary despite the overlapping string
 * values. */
export const INTENT_RATINGS = ['Hot', 'Warm', 'Cold'] as const;

export const SHOWROOM_VISIT_OPTIONS = ['0', '1', '2', '3+'] as const;
export const INSURANCE_PREFERENCES = ['Dealer In-house', 'Own Arrangement', 'Undecided'] as const;
export const WARRANTY_INTEREST_OPTIONS = ['Interested', 'Not Interested', 'Undecided'] as const;
export const FINANCE_APPLICATION_STATUSES = [
  'Not Started',
  'Documents Collected',
  'Login Done',
  'Approved',
  'Rejected',
] as const;
export const FINANCIER_OPTIONS = ['In-house', 'HDFC Bank', 'SBI', 'ICICI Bank'] as const;
export const EXCHANGE_EVALUATION_STATUSES = ['Not Scheduled', 'Scheduled', 'Completed', 'No Exchange'] as const;
export const TEST_DRIVE_STATUSES = ['Not Scheduled', 'Scheduled', 'Completed', 'Declined'] as const;
export const QUOTATION_SHARED_VIA_OPTIONS = ['WhatsApp', 'Email', 'Printed', 'Not Shared'] as const;

export const ENQUIRY_STATUS_NEW = 'New';

/** NEW (issue #31, AC2): the minimal terminal-state subset needed for that
 * Story's "closing a Follow-up without a Next Follow-up Date" exception.
 * Issue #33 ("Update Enquiry Status as Part of a Follow-up") owns the FULL
 * status vocabulary (see ENQUIRY_ALL_LOGGABLE_STATUSES below) — this subset
 * remains exactly the two values that are "terminal" for
 * FollowupsService.assertNextFollowUpOrTerminalStatus's AC4 check (only
 * Lost/Booked waive the Next Follow-up Date requirement; Hot/Warm/Cold do
 * not). See .phoenix-os/project/specs/31/NOTES.md for the original boundary
 * reasoning and .phoenix-os/project/specs/33/NOTES.md for how #33 widened
 * the loggable set on top of it. */
export const ENQUIRY_STATUS_LOST = 'Lost';
export const ENQUIRY_STATUS_BOOKED = 'Booked';
export const ENQUIRY_TERMINAL_STATUSES = [ENQUIRY_STATUS_LOST, ENQUIRY_STATUS_BOOKED] as const;

/** NEW (issue #33, AC1/AC5): the full status vocabulary a DSE may set as
 * part of logging a Follow-up (`LogFollowupDto.enquiryStatus`). Hot/Warm/
 * Cold are non-terminal — they are valid `enquiryStatus` values but do NOT
 * appear in ENQUIRY_TERMINAL_STATUSES above, so they still require a
 * `nextFollowUpAt` (AC4). Lost/Booked remain the only terminal values. This
 * is deliberately still scoped to "statuses loggable via a Follow-up", not
 * every possible Enquiry status in the system (e.g. `ENQUIRY_STATUS_NEW` is
 * server-assigned at creation and intentionally excluded — this endpoint is
 * not a general status-reset surface). */
export const ENQUIRY_STATUS_HOT = 'Hot';
export const ENQUIRY_STATUS_WARM = 'Warm';
export const ENQUIRY_STATUS_COLD = 'Cold';
export const ENQUIRY_ALL_LOGGABLE_STATUSES = [
  ENQUIRY_STATUS_HOT,
  ENQUIRY_STATUS_WARM,
  ENQUIRY_STATUS_COLD,
  ENQUIRY_STATUS_LOST,
  ENQUIRY_STATUS_BOOKED,
] as const;

/** Distinguishes a Direct Enquiry (issue #26, no parent Lead) from one
 * converted from an existing Lead (issue #25). See migration
 * 1700000000005-DirectEnquiry.ts "Schema decisions" for why this is an
 * explicit column rather than inferred from `leadId === null`. */
export const ENQUIRY_ENTRY_TYPE_DIRECT = 'DIRECT';
export const ENQUIRY_ENTRY_TYPE_CONVERTED = 'CONVERTED';

/**
 * `bigint` columns round-trip as JS strings by default (both real Postgres
 * and pg-mem) to avoid precision loss for values beyond Number.MAX_SAFE_INTEGER.
 * `budget` (INR whole rupees, resolved Clarification Q1) is NOT NULL and
 * never approaches that range in practice, so this transformer normalizes it
 * back to a JS number on read for a clean EnquiryResponseDto/API surface,
 * mirroring the `jsonbTransformer` cross-driver-normalization pattern above.
 */
const bigintTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | number): number => Number(value),
};

/** Nullable counterpart of `bigintTransformer` above, for issue #124's new
 * optional INR bigint columns (`quotedOnRoadPrice`/`loanAmountSought`/
 * `exchangeEvaluatedPrice`/`exchangeCustomerExpectation`) — mirrors
 * lead.entity.ts's own nullable `bigintTransformer` exactly. */
const nullableBigintTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

/**
 * `enquiries` table (tech-design Data Design, issue #25). Mirrors LeadEntity
 * conventions exactly (uuid PK, snake_case columns, `jsonbTransformer`).
 * Owner/tenant/convertedBy/status are server-derived only — never accepted
 * from the client (ADR-003/009), enforced in EnquiriesService.convert.
 * `leadId` carries a DB-level UNIQUE constraint (see migration
 * 1700000000003) — defense-in-depth behind the app-level 409 check.
 */
@Entity({ name: 'enquiries' })
@Index('idx_enquiries_owner_location_created', ['ownerId', 'locationId', 'convertedAt'])
export class EnquiryEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'enquiry_id' })
  enquiryId!: string;

  /** MODIFIED (issue #26, migration 1700000000005): nullable — a Direct
   * Enquiry (entryType DIRECT) has no parent Lead (AC4). Still carries a
   * DB-level UNIQUE constraint for non-null values (one Enquiry per
   * converted Lead, #25 Q2); Postgres treats every NULL as distinct so any
   * number of Direct Enquiries can coexist. */
  @Column({ name: 'lead_id', type: 'uuid', unique: true, nullable: true })
  leadId!: string | null;

  /** NEW (issue #26). Defaults to CONVERTED so pre-existing (#25) rows are
   * backfilled without a data migration statement. */
  @Column({ name: 'entry_type', type: 'varchar', default: ENQUIRY_ENTRY_TYPE_CONVERTED })
  entryType!: string;

  /** NEW (issue #26) — Lead-equivalent mandatory fields (AC2), populated
   * only for Direct Enquiries (entryType DIRECT). NULL for Converted
   * Enquiries, where this data is reachable via the (non-null) `leadId`
   * join to `leads` instead of being duplicated here. */
  @Column({ name: 'customer_name', type: 'text', nullable: true })
  customerName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mobile!: string | null;

  @Column({ name: 'source_id', type: 'int', nullable: true })
  sourceId!: number | null;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId!: number | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  budget!: number;

  @Column({ type: 'text' })
  variant!: string;

  @Column({ name: 'exchange_interest', type: 'boolean' })
  exchangeInterest!: boolean;

  @Column({ name: 'finance_interest', type: 'boolean' })
  financeInterest!: boolean;

  @Column({ name: 'converted_by', type: 'uuid' })
  convertedBy!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  /** NEW (issue #28, AC4): set whenever `ownerId` is reassigned (see
   * EnquiriesRepository.reassignOwner / EnquiriesService.reassignOwner).
   * NULL means "never reassigned since creation" — additive nullable column,
   * migration 1700000000009-AddOwnerUpdatedAt, mirrors LeadEntity.ownerUpdatedAt
   * exactly. No controller/endpoint calls the reassignment path yet in this
   * Story (deferred to a future TL-reassignment Story). */
  @Column({ name: 'owner_updated_at', type: 'timestamptz', nullable: true })
  ownerUpdatedAt!: Date | null;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @Column({ type: 'varchar', default: ENQUIRY_STATUS_NEW })
  status!: string;

  /** Reserved for FR-04 configurable fields; provisioned, unused this Story. */
  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'", transformer: jsonbTransformer })
  customFields!: Record<string, unknown>;

  // ==========================================================================
  // NEW (issue #134, migration 1700000000018-AddEnquiryCustomerDetails): 5
  // nullable columns backing the redesigned Direct Enquiry form's editable
  // Section 0 "Customer Details". Mirrors LeadEntity's own Customer Details
  // columns (issue #114) exactly, including reusing CUSTOMER_TYPES/
  // PREFERRED_LANGUAGES imported above rather than redeclaring them.
  // ==========================================================================

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  /** Closed set — see CUSTOMER_TYPES (imported/re-exported from lead.entity.ts). */
  @Column({ name: 'customer_type', type: 'varchar', nullable: true })
  customerType!: string | null;

  @Column({ type: 'text', nullable: true })
  city!: string | null;

  /** India 6-digit postal code (first digit 1-9). */
  @Column({ name: 'pin_code', type: 'varchar', length: 6, nullable: true })
  pinCode!: string | null;

  /** Closed set — see PREFERRED_LANGUAGES (imported/re-exported from lead.entity.ts). */
  @Column({ name: 'preferred_language', type: 'varchar', nullable: true })
  preferredLanguage!: string | null;

  // ==========================================================================
  // NEW (issue #124, migration 1700000000017-AddEnquiryConversionDetails):
  // all columns below are nullable (every new field is optional, AC4) except
  // the 4 Document Checklist booleans (NOT NULL DEFAULT false — see that
  // migration's class comment point 1). Grouped to mirror the rewritten
  // Convert-to-Enquiry form's 8 UI sections exactly. `modelId` above (already
  // existed, added by DirectEnquiry1700000000005) is REUSED for Section 1's
  // "Model of Interest" — not duplicated here.
  // ==========================================================================

  // ---- 1. Vehicle Information (model_id reused; variant/budget above are pre-existing) ----
  /** Closed set — see FUEL_TYPES (imported/re-exported from lead.entity.ts). */
  @Column({ name: 'fuel_type', type: 'varchar', nullable: true })
  fuelType!: string | null;

  /** Closed set — see TRANSMISSIONS (imported/re-exported from lead.entity.ts). */
  @Column({ type: 'varchar', nullable: true })
  transmission!: string | null;

  @Column({ name: 'color_first_preference', type: 'text', nullable: true })
  colorFirstPreference!: string | null;

  @Column({ name: 'color_second_preference', type: 'text', nullable: true })
  colorSecondPreference!: string | null;

  @Column({ name: 'accessories_interest', type: 'text', nullable: true })
  accessoriesInterest!: string | null;

  @Column({ name: 'competitor_consideration', type: 'text', nullable: true })
  competitorConsideration!: string | null;

  // ---- 2. Qualification ----
  /** Closed set — see CONTACT_VERIFIED_OPTIONS. */
  @Column({ name: 'contact_verified', type: 'varchar', nullable: true })
  contactVerified!: string | null;

  /** Closed set — see INTENT_RATINGS. Distinct from `status` above — see
   * migration 1700000000017's class comment point 4. */
  @Column({ name: 'intent_rating', type: 'varchar', nullable: true })
  intentRating!: string | null;

  /** Calendar date, no time-of-day — distinct from `testDriveDateTime` below. */
  @Column({ name: 'expected_closure_date', type: 'date', nullable: true })
  expectedClosureDate!: string | null;

  /** Closed set — see SHOWROOM_VISIT_OPTIONS. Deliberately `varchar` (not
   * `int`) — '3+' is not representable as a plain integer. */
  @Column({ name: 'showroom_visits', type: 'varchar', nullable: true })
  showroomVisits!: string | null;

  // ---- 3. Commercial ----
  @Column({ name: 'quotation_number', type: 'text', nullable: true })
  quotationNumber!: string | null;

  /** INR whole rupees. */
  @Column({ name: 'quoted_on_road_price', type: 'bigint', nullable: true, transformer: nullableBigintTransformer })
  quotedOnRoadPrice!: number | null;

  /** Free text — compound real-world values (e.g. "Rs 35,000 + corporate offer"). */
  @Column({ name: 'discount_discussed', type: 'text', nullable: true })
  discountDiscussed!: string | null;

  /** Closed set — see INSURANCE_PREFERENCES. */
  @Column({ name: 'insurance_preference', type: 'varchar', nullable: true })
  insurancePreference!: string | null;

  /** Closed set — see WARRANTY_INTEREST_OPTIONS. */
  @Column({ name: 'extended_warranty_interest', type: 'varchar', nullable: true })
  extendedWarrantyInterest!: string | null;

  /** Free text — employer name if any. */
  @Column({ name: 'corporate_discount_eligible', type: 'text', nullable: true })
  corporateDiscountEligible!: string | null;

  // ---- 4. Finance (extends the existing required financeInterest boolean) ----
  /** Closed set — see FINANCE_APPLICATION_STATUSES. */
  @Column({ name: 'finance_application_status', type: 'varchar', nullable: true })
  financeApplicationStatus!: string | null;

  /** Closed set — see FINANCIER_OPTIONS. */
  @Column({ type: 'varchar', nullable: true })
  financier!: string | null;

  /** INR whole rupees. */
  @Column({ name: 'loan_amount_sought', type: 'bigint', nullable: true, transformer: nullableBigintTransformer })
  loanAmountSought!: number | null;

  /** Free text — compound value (e.g. "60 months, Rs 33,500/mo"). */
  @Column({ name: 'tenure_and_emi_discussed', type: 'text', nullable: true })
  tenureAndEmiDiscussed!: string | null;

  // ---- 5. Exchange Evaluation (extends the existing required exchangeInterest boolean) ----
  /** Closed set — see EXCHANGE_EVALUATION_STATUSES. */
  @Column({ name: 'exchange_evaluation_status', type: 'varchar', nullable: true })
  exchangeEvaluationStatus!: string | null;

  @Column({ name: 'exchange_evaluated_by', type: 'text', nullable: true })
  exchangeEvaluatedBy!: string | null;

  /** INR whole rupees. */
  @Column({ name: 'exchange_evaluated_price', type: 'bigint', nullable: true, transformer: nullableBigintTransformer })
  exchangeEvaluatedPrice!: number | null;

  /** INR whole rupees. */
  @Column({
    name: 'exchange_customer_expectation',
    type: 'bigint',
    nullable: true,
    transformer: nullableBigintTransformer,
  })
  exchangeCustomerExpectation!: number | null;

  // ---- 6. Test Drive & Engagement ----
  /** Closed set — see TEST_DRIVE_STATUSES. */
  @Column({ name: 'test_drive_status', type: 'varchar', nullable: true })
  testDriveStatus!: string | null;

  /** Specific date+time slot — distinct from `expectedClosureDate` above. */
  @Column({ name: 'test_drive_date_time', type: 'timestamptz', nullable: true })
  testDriveDateTime!: Date | null;

  /** Closed set — see QUOTATION_SHARED_VIA_OPTIONS. */
  @Column({ name: 'quotation_shared_via', type: 'varchar', nullable: true })
  quotationSharedVia!: string | null;

  /** Nullable FK to `users(user_id)` — mirrors ownerId/convertedBy's FK
   * precedent (CreateEnquiries1700000000003). Reuses the existing
   * `useConsultants()` roster on the frontend (issue #114). */
  @Column({ name: 'next_action_owner_id', type: 'uuid', nullable: true })
  nextActionOwnerId!: string | null;

  @Column({ name: 'test_drive_feedback', type: 'text', nullable: true })
  testDriveFeedback!: string | null;

  // ---- 7. Document Checklist (4 independent booleans, no gating logic) ----
  @Column({ name: 'pan_card_verified', type: 'boolean', default: false })
  panCardVerified!: boolean;

  @Column({ name: 'address_proof_verified', type: 'boolean', default: false })
  addressProofVerified!: boolean;

  @Column({ name: 'income_proof_verified', type: 'boolean', default: false })
  incomeProofVerified!: boolean;

  @Column({ name: 'gst_details_verified', type: 'boolean', default: false })
  gstDetailsVerified!: boolean;

  @CreateDateColumn({ name: 'converted_at', type: 'timestamptz' })
  convertedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
