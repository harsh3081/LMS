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
    throw new ApiError(response.status, fieldErrors, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ ok: true }>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getConfig: () => request<{ newLeadEnabled: boolean }>('/api/v1/config'),

  getLeadSources: () => request<LeadSource[]>('/api/v1/lead-sources'),

  getVehicleModels: () => request<VehicleModel[]>('/api/v1/vehicle-models'),

  createLead: (input: CreateLeadInput) =>
    request<Lead>('/api/v1/leads', { method: 'POST', body: JSON.stringify(input) }),

  getMyLeads: () => request<Lead[]>('/api/v1/leads'),
};
