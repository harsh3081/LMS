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

export interface CreateLeadInput {
  customerName: string;
  mobile: string;
  sourceId: number;
  modelId: number;
}

export interface Lead {
  leadId: string;
  customerName: string;
  mobile: string;
  sourceId: number;
  modelId: number;
  status: string;
  ownerId: string;
  locationId: string;
  createdAt: string;
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
export interface CreateDirectEnquiryInput {
  customerName: string;
  mobile: string;
  sourceId: number;
  modelId: number;
  budget: number;
  variant: string;
  exchangeInterest: boolean;
  financeInterest: boolean;
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
};
