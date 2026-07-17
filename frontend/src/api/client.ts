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

/** MODIFIED (issue #27, FR-04): the four Lead-equivalent fields are now
 * optional here — whether they are actually required at submission time is
 * config-driven (see useFieldConfig/FieldConfigEntry below), enforced both
 * client-side (NewLeadForm reads the config) and server-side (backend
 * FieldConfigService), not hardcoded on this type anymore.
 * MODIFIED (issue #29, AC3): `acknowledgeDuplicate` mirrors
 * CreateLeadDto.acknowledgeDuplicate exactly (backend/src/leads/dto/
 * create-lead.dto.ts) — set to `true` by NewLeadForm only when the DSE
 * dismissed a duplicate-mobile warning and chose to proceed anyway. */
export interface CreateLeadInput {
  customerName?: string;
  mobile?: string;
  sourceId?: number;
  modelId?: number;
  acknowledgeDuplicate?: boolean;
}

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

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly fieldErrors: FieldError[] | null,
    message: string,
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
    let message = `Request to ${path} failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (Array.isArray(body)) {
        fieldErrors = body;
        message = body.map((e: FieldError) => e.message).join('; ') || message;
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
    throw new ApiError(response.status, fieldErrors, message);
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
};
