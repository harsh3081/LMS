import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';
import { jsonbTransformer } from '../../common/jsonb.transformer';

export const LEAD_STATUS_NEW = 'New';
/** Additive, data-only status value (issue #25) — no schema change; see
 * migrations 1700000000003-CreateEnquiries.ts "Warnings". Set by
 * EnquiriesService.convert() when a Lead is converted into an Enquiry. */
export const LEAD_STATUS_CONVERTED = 'Converted';

/**
 * Closed-set dropdown vocabularies (issue #114, AC4). Named exported
 * constants — consumed by CreateLeadDto's `@IsIn()` decorators AND by
 * migration 1700000000016-AddLeadCustomerDetails's defense-in-depth CHECK
 * constraints, so the DTO and the DB schema cannot silently drift apart.
 * See .phoenix-os/project/specs/114/NOTES.md for the option-set source.
 */
export const CUSTOMER_TYPES = ['Individual', 'Corporate', 'Government', 'Fleet'] as const;
export const PREFERRED_LANGUAGES = [
  'English',
  'Hindi',
  'Marathi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Bengali',
  'Punjabi',
] as const;
export const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] as const;
export const TRANSMISSIONS = ['Manual', 'Automatic'] as const;
export const BUYING_TIMELINES = ['Immediate', 'Within 1 Month', '1-3 Months', '3-6 Months', '6+ Months'] as const;
export const PAYMENT_MODES = ['Cash', 'Loan', 'Lease'] as const;

/**
 * `bigint` columns round-trip as JS strings by default (both real Postgres
 * and pg-mem) to avoid precision loss beyond Number.MAX_SAFE_INTEGER.
 * Mirrors EnquiryEntity's private `bigintTransformer` exactly (issue #25) —
 * duplicated here rather than imported/shared, so this Story does not need
 * to touch the frozen enquiry.entity.ts file to export it. `budgetMin`/
 * `budgetMax`/`expectedValue`/`downPaymentCapacity` (INR whole rupees) are
 * all nullable, so `from` must pass through null/undefined untouched.
 */
const bigintTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null): number | null => (value === null ? null : Number(value)),
};

/**
 * `leads` table (tech-design Data Design). Owner/tenant/status/audit are
 * server-derived only — never accepted from the client (ADR-003/009).
 * No mobile uniqueness constraint — duplicate handling deferred to FR-06.
 */
@Entity({ name: 'leads' })
@Index('idx_leads_owner_location_created', ['ownerId', 'locationId', 'createdAt'])
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'lead_id' })
  leadId!: string;

  /** MODIFIED (issue #27, migration 1700000000007): nullable — field-config
   * (FR-04) may mark this field optional, and a Lead created while it is
   * optional-and-omitted must be storable (mirrors EnquiryEntity.customerName,
   * made nullable for the same reason in #26). */
  @Column({ name: 'customer_name', type: 'text', nullable: true })
  customerName!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  mobile!: string | null;

  @Column({ name: 'source_id', type: 'int', nullable: true })
  sourceId!: number | null;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId!: number | null;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @Column({ name: 'dealer_group_id', type: 'uuid' })
  dealerGroupId!: string;

  @Column({ type: 'varchar', default: LEAD_STATUS_NEW })
  status!: string;

  /** Reserved for FR-04 configurable fields; provisioned, unused this Story. */
  @Column({ name: 'custom_fields', type: 'jsonb', default: () => "'{}'", transformer: jsonbTransformer })
  customFields!: Record<string, unknown>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  /** NEW (issue #28, AC4): set whenever `ownerId` is reassigned (see
   * LeadsRepository.reassignOwner / LeadsService.reassignOwner). NULL means
   * "never reassigned since creation" — additive nullable column, migration
   * 1700000000009-AddOwnerUpdatedAt, so every pre-existing Lead row remains
   * valid without a backfill statement. No controller/endpoint calls the
   * reassignment path yet in this Story (a future TL-reassignment Story
   * wires the HTTP surface) — this column + the repository/service method
   * prove the tracking mechanism itself works. */
  @Column({ name: 'owner_updated_at', type: 'timestamptz', nullable: true })
  ownerUpdatedAt!: Date | null;

  // ==========================================================================
  // NEW (issue #114, migration 1700000000016-AddLeadCustomerDetails): all 22
  // columns below are nullable (every new field is optional, AC2) except
  // `communicationConsentVerified` (NOT NULL — see that column's own
  // comment). Grouped to mirror the New Lead form's 6 UI sections exactly.
  // ==========================================================================

  // ---- 1. Customer Details ----
  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  /** Closed set — see CUSTOMER_TYPES. */
  @Column({ name: 'customer_type', type: 'varchar', nullable: true })
  customerType!: string | null;

  @Column({ type: 'text', nullable: true })
  city!: string | null;

  /** India 6-digit postal code (first digit 1-9). */
  @Column({ name: 'pin_code', type: 'varchar', length: 6, nullable: true })
  pinCode!: string | null;

  /** Closed set — see PREFERRED_LANGUAGES. */
  @Column({ name: 'preferred_language', type: 'varchar', nullable: true })
  preferredLanguage!: string | null;

  // ---- 2. Vehicle Interest ----
  @Column({ type: 'text', nullable: true })
  variant!: string | null;

  /** Closed set — see FUEL_TYPES. */
  @Column({ name: 'fuel_type', type: 'varchar', nullable: true })
  fuelType!: string | null;

  /** Closed set — see TRANSMISSIONS. */
  @Column({ type: 'varchar', nullable: true })
  transmission!: string | null;

  /** INR whole rupees. Two independent nullable columns (not one bucketed
   * dropdown) — mirrors enquiries.budget's bigint precedent for large-
   * integer round-tripping; see migration comment point 5. */
  @Column({ name: 'budget_min', type: 'bigint', nullable: true, transformer: bigintTransformer })
  budgetMin!: number | null;

  @Column({ name: 'budget_max', type: 'bigint', nullable: true, transformer: bigintTransformer })
  budgetMax!: number | null;

  /** Closed set — see BUYING_TIMELINES. */
  @Column({ name: 'buying_timeline', type: 'varchar', nullable: true })
  buyingTimeline!: string | null;

  // ---- 3. Exchange Vehicle (optional group) ----
  /** Lead-level gating flag for the 4 exchange-detail columns below —
   * nullable (unlike enquiries.exchange_interest, which is NOT NULL): NULL
   * means "not yet stated", distinct from an explicit `false`. */
  @Column({ name: 'exchange_interest', type: 'boolean', nullable: true })
  exchangeInterest!: boolean | null;

  @Column({ name: 'current_vehicle', type: 'text', nullable: true })
  currentVehicle!: string | null;

  @Column({ name: 'kms_driven', type: 'int', nullable: true })
  kmsDriven!: number | null;

  @Column({ name: 'registration_number', type: 'text', nullable: true })
  registrationNumber!: string | null;

  /** INR whole rupees. */
  @Column({ name: 'expected_value', type: 'bigint', nullable: true, transformer: bigintTransformer })
  expectedValue!: number | null;

  // ---- 4. Finance ----
  /** Closed set — see PAYMENT_MODES. */
  @Column({ name: 'payment_mode', type: 'varchar', nullable: true })
  paymentMode!: string | null;

  @Column({ name: 'preferred_financer', type: 'text', nullable: true })
  preferredFinancer!: string | null;

  /** INR whole rupees. */
  @Column({ name: 'down_payment_capacity', type: 'bigint', nullable: true, transformer: bigintTransformer })
  downPaymentCapacity!: number | null;

  // ---- 5. Source & Assignment ----
  /** Free text; relevant only when sourceId === the 'Referral' lead_sources
   * row (id=2, migration 1700000000004-SeedMasterData) — client-side
   * conditional display only, no server-side cross-field requirement (every
   * new field stays independently optional, AC2). Note: "Assign to
   * Consultant" (CreateLeadDto.assignedOwnerId) is NOT a persisted column —
   * it only steers which user `ownerId` is set to at creation time (see
   * LeadsService.create). */
  @Column({ name: 'referrer_name', type: 'text', nullable: true })
  referrerName!: string | null;

  // ---- 6. Follow-up & Consent ----
  /** Plain planned-next-action date captured at creation time — NOT the
   * same mechanism as the `followups` table (#30/#31, which only applies to
   * Enquiries). No reminder/scheduling logic attached (see NOTES.md "Known
   * gaps"). */
  @Column({ name: 'first_follow_up_at', type: 'timestamptz', nullable: true })
  firstFollowUpAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  /** Hard compliance gate (TRAI DND relevance) — NOT NULL, DB default false
   * only so the ADD COLUMN statement itself is valid; CreateLeadDto/
   * LeadsService.create REJECT (400) any create request where this is not
   * explicitly `true`, so `false` is never actually persisted via the
   * normal create path. See migration comment point 2. */
  @Column({ name: 'communication_consent_verified', type: 'boolean', default: false })
  communicationConsentVerified!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
