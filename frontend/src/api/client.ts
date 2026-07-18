/**
 * Typed fetch client against the published OpenAPI contract (AC7) — same
 * origin as the SPA (tech-design.md: "no privileged path"). Cookie-based
 * session (ADR-004) travels automatically via `credentials: 'include'`.
 */
export interface LeadSource {
  sourceId: number;
  name: string;
}

export interface VehicleModel {
  modelId: number;
  name: string;
}

/** Closed-set dropdown vocabularies (issue #114, AC4) — mirror
 * backend/src/leads/entities/lead.entity.ts's exported constants exactly
 * (CUSTOMER_TYPES/PREFERRED_LANGUAGES/FUEL_TYPES/TRANSMISSIONS/
 * BUYING_TIMELINES/PAYMENT_MODES), duplicated here (not shared across the
 * two independent app packages, same convention as INDIA_MOBILE_REGEX in
 * NewLeadForm.tsx) so the `<select>` options and TS union types are backed
 * by one literal list each. */
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

/** MODIFIED (issue #27, FR-04): the four Lead-equivalent fields are now
 * optional here — whether they are actually required at submission time is
 * config-driven (see useFieldConfig/FieldConfigEntry below), enforced both
 * client-side (NewLeadForm reads the config) and server-side (backend
 * FieldConfigService), not hardcoded on this type anymore.
 * MODIFIED (issue #29, AC3): `acknowledgeDuplicate` mirrors
 * CreateLeadDto.acknowledgeDuplicate exactly (backend/src/leads/dto/
 * create-lead.dto.ts) — set to `true` by NewLeadForm only when the DSE
 * dismissed a duplicate-mobile warning and chose to proceed anyway.
 * MODIFIED (issue #114): 22 new optional fields (mirrors CreateLeadDto's new
 * fields exactly, grouped by the New Lead form's 6 UI sections), plus
 * `communicationConsentVerified` — the one field that is NOT optional here
 * either (the hard compliance gate, AC2). */
export interface CreateLeadInput {
  customerName?: string;
  mobile?: string;
  sourceId?: number;
  modelId?: number;

  // ---- 1. Customer Details ----
  email?: string;
  customerType?: (typeof CUSTOMER_TYPES)[number];
  city?: string;
  pinCode?: string;
  preferredLanguage?: (typeof PREFERRED_LANGUAGES)[number];

  // ---- 2. Vehicle Interest ----
  variant?: string;
  fuelType?: (typeof FUEL_TYPES)[number];
  transmission?: (typeof TRANSMISSIONS)[number];
  budgetMin?: number;
  budgetMax?: number;
  buyingTimeline?: (typeof BUYING_TIMELINES)[number];

  // ---- 3. Exchange Vehicle ----
  exchangeInterest?: boolean;
  currentVehicle?: string;
  kmsDriven?: number;
  registrationNumber?: string;
  expectedValue?: number;

  // ---- 4. Finance ----
  paymentMode?: (typeof PAYMENT_MODES)[number];
  preferredFinancer?: string;
  downPaymentCapacity?: number;

  // ---- 5. Source & Assignment ----
  referrerName?: string;
  assignedOwnerId?: string;

  // ---- 6. Follow-up & Consent ----
  firstFollowUpAt?: string;
  remarks?: string;
  /** Hard compliance gate (AC2) — must be `true` to submit; NewLeadForm
   * blocks submission client-side until the checkbox is checked, and the
   * server independently rejects (400) anything else (defense-in-depth). */
  communicationConsentVerified: boolean;

  acknowledgeDuplicate?: boolean;
}

/** MODIFIED (issue #114, AC6): 22 new fields added, one per new Lead column
 * — mirrors LeadResponseDto exactly, so every new field is visible wherever
 * Lead details are already surfaced. */
export interface Lead {
  leadId: string;
  customerName: string | null;
  mobile: string | null;
  sourceId: number | null;
  modelId: number | null;
  status: string;
  ownerId: string;
  locationId: string;
  createdAt: string;

  email?: string | null;
  customerType?: string | null;
  city?: string | null;
  pinCode?: string | null;
  preferredLanguage?: string | null;

  variant?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  buyingTimeline?: string | null;

  exchangeInterest?: boolean | null;
  currentVehicle?: string | null;
  kmsDriven?: number | null;
  registrationNumber?: string | null;
  expectedValue?: number | null;

  paymentMode?: string | null;
  preferredFinancer?: string | null;
  downPaymentCapacity?: number | null;

  referrerName?: string | null;

  firstFollowUpAt?: string | null;
  remarks?: string | null;
  communicationConsentVerified?: boolean;
}

/** GET /api/v1/consultants response shape (issue #114, AC5) — mirrors
 * backend/src/users/consultants.controller.ts's ConsultantResponseDto.
 * Location-scoped (the caller's own location's DSE roster only), deliberately
 * minimal — not a general user-management API, just enough to populate the
 * "Assign to Consultant" dropdown. */
export interface Consultant {
  userId: string;
  displayName: string;
}

/** One field's current configuration (issue #27, GET/PUT /api/v1/field-config). */
export interface FieldConfigEntry {
  fieldName: string;
  label: string;
  mandatory: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface UpdateFieldConfigInput {
  fields: { fieldName: string; mandatory: boolean }[];
}

/** ConvertLeadDto qualifying fields (issue #25, tech-design.md Component 6). */
export interface ConvertLeadInput {
  budget: number;
  variant: string;
  exchangeInterest: boolean;
  financeInterest: boolean;
}

/** Mirrors EnquiryResponseDto (dealerGroupId intentionally excluded).
 * MODIFIED (issue #26): `leadId` is nullable (null for a Direct Enquiry);
 * `entryType` and the Lead-equivalent fields were added (populated only for
 * Direct Enquiries, null for ones converted from a Lead). */
export interface Enquiry {
  enquiryId: string;
  leadId: string | null;
  entryType: 'DIRECT' | 'CONVERTED';
  customerName: string | null;
  mobile: string | null;
  sourceId: number | null;
  modelId: number | null;
  budget: number;
  variant: string;
  exchangeInterest: boolean;
  financeInterest: boolean;
  convertedBy: string;
  convertedAt: string;
  status: string;
  ownerId: string;
  locationId: string;
}

/** CreateDirectEnquiryDto fields (issue #26) — the Lead-equivalent
 * mandatory fields (mirrors CreateLeadInput) plus the qualifying details
 * (mirrors ConvertLeadInput), captured in one step (AC2). */
/** MODIFIED (issue #27): the four Lead-equivalent fields are now optional —
 * mirrors CreateLeadInput's same modification exactly (config-driven
 * mandatory-ness). The qualifying-details fields stay required. */
export interface CreateDirectEnquiryInput {
  customerName?: string;
  mobile?: string;
  sourceId?: number;
  modelId?: number;
  budget: number;
  variant: string;
  exchangeInterest: boolean;
  financeInterest: boolean;
  /** NEW (issue #29, AC3) — mirrors CreateLeadInput.acknowledgeDuplicate exactly. */
  acknowledgeDuplicate?: boolean;
}

/** GET /api/v1/duplicates response shape (issue #29, AC2/AC6) — mirrors
 * backend/src/duplicates/dto/duplicate-match.dto.ts exactly. */
export interface DuplicateMatch {
  id: string;
  type: 'LEAD' | 'ENQUIRY';
  label: string | null;
  status: string;
}

/** LogFollowupDto fields (issue #30, AC1-AC4, extended by issue #31 AC1-AC4
 * with `nextFollowUpAt`/`enquiryStatus`, WIDENED by issue #33 AC1/AC5 to the
 * full loggable status set) — backend/src/followups/dto/log-followup.dto.ts.
 * `enquiryId` is deliberately not part of the body; it travels in the URL
 * path (mirrors ConvertLeadInput / convertLead's leadId path-param
 * convention). `nextFollowUpAt` is required unless `enquiryStatus` is
 * terminal ('Lost'/'Booked', AC4) — enforced both client-side
 * (LogFollowupForm) and server-side (FollowupsService). */
export interface LogFollowupInput {
  type: 'Home Visit' | 'Showroom Visit' | 'Call';
  remarks: string;
  nextFollowUpAt?: string;
  enquiryStatus?: 'Hot' | 'Warm' | 'Cold' | 'Lost' | 'Booked';
}

/** Mirrors FollowupResponseDto (dealerGroupId intentionally excluded, same
 * convention as Enquiry). MODIFIED (issue #31): `nextFollowUpAt` — null only
 * when the Follow-up closed its Enquiry to a terminal status (AC2).
 * MODIFIED (issue #32, AC2): `resultingStatus` — the terminal Enquiry
 * status (Lost/Booked) this entry applied, if any; null otherwise. Powers
 * the "any status change" part of the history timeline (AC2). */
export interface Followup {
  followupId: string;
  enquiryId: string;
  type: string;
  remarks: string;
  loggedBy: string;
  locationId: string;
  loggedAt: string;
  nextFollowUpAt: string | null;
  resultingStatus: string | null;
}

/** GET /api/v1/demo-vehicles response shape (issue #34, AC1) — mirrors
 * backend/src/demo-vehicles/demo-vehicles.controller.ts's
 * DemoVehicleResponseDto. Location-scoped (the caller's own location's
 * active fleet only), deliberately distinct from VehicleModel (the
 * abstract, location-agnostic catalog). */
export interface DemoVehicle {
  vehicleId: string;
  modelId: number;
  variant: string;
  locationId: string;
}

/** CreateTestDriveDto fields (issue #34 AC1/AC6) —
 * backend/src/test-drives/dto/create-test-drive.dto.ts. `enquiryId` IS part
 * of the body here (unlike LogFollowupInput, where it travels in the URL
 * path) — the booking form is where the DSE selects which of their own
 * Enquiries the drive is against. */
export interface CreateTestDriveInput {
  enquiryId: string;
  vehicleId: string;
  slotStart: string;
  slotEnd: string;
}

/** Mirrors TestDriveResponseDto (dealerGroupId intentionally excluded, same
 * convention as Enquiry/Followup). */
export interface TestDrive {
  testDriveId: string;
  enquiryId: string;
  vehicleId: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  remarks: string | null;
  bookedBy: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/v1/test-drives?vehicleId=&from=&to= query params (issue #35,
 * "Real-Time Test Drive Scheduler View" AC1/AC5) — mirrors
 * backend/src/test-drives/dto/scheduler-query.dto.ts. */
export interface SchedulerQuery {
  vehicleId: string;
  from: string;
  to: string;
}

/** One BOOKED slot as returned by the scheduler query (issue #35 AC2) —
 * mirrors backend/src/test-drives/dto/scheduler-slot.dto.ts. Deliberately
 * minimal/anonymized — no testDriveId/enquiryId/bookedBy (see that DTO's
 * comment). The frontend derives the full open/booked grid itself from
 * this list of booked slots (see NOTES.md "derived, not stored"). */
export interface SchedulerSlot {
  slotStart: string;
  slotEnd: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly fieldErrors: FieldError[] | null,
    message: string,
    /** NEW (issue #36, AC2) — populated only for the 409 double-booking
     * conflict response (`POST /api/v1/test-drives`), whose body shape is
     * `{ errors, suggestedSlots }` rather than the plain `FieldError[]`
     * array every other error in this codebase uses (see
     * backend/src/test-drives/test-drives.errors.ts's
     * TestDriveSlotConflictError comment for why). `null` for every other
     * error shape. */
    public readonly suggestedSlots: SchedulerSlot[] | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    let fieldErrors: FieldError[] | null = null;
    let suggestedSlots: SchedulerSlot[] | null = null;
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (Array.isArray(body)) {
        fieldErrors = body;
        message = body.map((e: FieldError) => e.message).join('; ') || message;
      } else if (Array.isArray(body?.errors)) {
        // issue #36 AC2 — the 409 conflict shape: { errors, suggestedSlots }.
        fieldErrors = body.errors;
        suggestedSlots = Array.isArray(body.suggestedSlots) ? body.suggestedSlots : null;
        message = body.errors.map((e: FieldError) => e.message).join('; ') || message;
      } else if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join('; ') : String(body.message);
      }
    } catch {
      // no JSON body — keep default message
    }
    // No session (or an expired one): bounce to /login rather than letting
    // every page silently render empty data with no visible explanation
    // (the root cause of dropdowns/queues appearing "not populated" with no
    // error shown). Skip this on the login endpoint itself so a wrong
    // password shows its own error instead of looping back to /login.
    if (response.status === 401 && path !== '/api/v1/auth/login' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError(response.status, fieldErrors, message, suggestedSlots);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ ok: true }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getConfig: () =>
    request<{ newLeadEnabled: boolean; convertLeadEnabled: boolean; directEnquiryEnabled: boolean }>(
      '/api/v1/config',
    ),

  getLeadSources: () => request<LeadSource[]>('/api/v1/lead-sources'),

  getVehicleModels: () => request<VehicleModel[]>('/api/v1/vehicle-models'),

  createLead: (input: CreateLeadInput) =>
    request<Lead>('/api/v1/leads', { method: 'POST', body: JSON.stringify(input) }),

  getMyLeads: () => request<Lead[]>('/api/v1/leads'),

  convertLead: (leadId: string, input: ConvertLeadInput) =>
    request<Enquiry>(`/api/v1/leads/${leadId}/convert`, { method: 'POST', body: JSON.stringify(input) }),

  createDirectEnquiry: (input: CreateDirectEnquiryInput) =>
    request<Enquiry>('/api/v1/enquiries', { method: 'POST', body: JSON.stringify(input) }),

  getMyEnquiries: () => request<Enquiry[]>('/api/v1/enquiries'),

  // ---- issue #27: field configuration (FR-04) ----
  getFieldConfig: () => request<FieldConfigEntry[]>('/api/v1/field-config'),

  updateFieldConfig: (input: UpdateFieldConfigInput) =>
    request<FieldConfigEntry[]>('/api/v1/field-config', { method: 'PUT', body: JSON.stringify(input) }),

  // ---- issue #29: duplicate detection (FR-06, AC1/AC6) ----
  checkDuplicates: (mobile: string) =>
    request<DuplicateMatch[]>(`/api/v1/duplicates?mobile=${encodeURIComponent(mobile)}`),

  // ---- issue #30: log a follow-up against an Enquiry (AC1-AC5) ----
  logFollowup: (enquiryId: string, input: LogFollowupInput) =>
    request<Followup>(`/api/v1/enquiries/${enquiryId}/follow-ups`, { method: 'POST', body: JSON.stringify(input) }),

  getFollowups: (enquiryId: string) => request<Followup[]>(`/api/v1/enquiries/${enquiryId}/follow-ups`),

  // ---- issue #31: my upcoming/overdue follow-up reminders (AC4) ----
  getUpcomingFollowups: () => request<Followup[]>('/api/v1/follow-ups/upcoming'),

  // ---- issue #34: book a test drive against an Enquiry (AC1-AC6) ----
  getDemoVehicles: () => request<DemoVehicle[]>('/api/v1/demo-vehicles'),

  bookTestDrive: (input: CreateTestDriveInput) =>
    request<TestDrive>('/api/v1/test-drives', { method: 'POST', body: JSON.stringify(input) }),

  getUpcomingTestDrives: () => request<TestDrive[]>('/api/v1/test-drives/upcoming'),

  // ---- issue #35: scheduler grid — booked slots for one vehicle+range (AC1/AC2/AC5) ----
  getScheduler: (query: SchedulerQuery) =>
    request<SchedulerSlot[]>(
      `/api/v1/test-drives?${new URLSearchParams({ vehicleId: query.vehicleId, from: query.from, to: query.to }).toString()}`,
    ),

  // ---- issue #114: the caller's own location's DSE roster, for "Assign to Consultant" (AC5) ----
  getConsultants: () => request<Consultant[]>('/api/v1/consultants'),
};
