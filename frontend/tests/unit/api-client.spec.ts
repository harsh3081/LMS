/**
 * RED->GREEN (Inside-Out) — Task 5.1.1: API client (createLead, getSources,
 * getModels, getMyLeads). `global.fetch` is mocked — this is the frontend's
 * infrastructure boundary layer, mocking the network is the accepted
 * pattern here (the real HTTP behavior is proven by the backend Supertest
 * suite and the Playwright E2E suite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '../../src/api/client';

function mockFetchOnce(status: number, body: unknown) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('api client', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('createLead posts to /api/v1/leads and returns the created Lead', async () => {
    mockFetchOnce(201, { leadId: 'abc', status: 'New' });
    const result = await api.createLead({ customerName: 'A', mobile: '9876543210', sourceId: 1, modelId: 101 });
    expect(result.leadId).toBe('abc');
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/leads',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('getLeadSources fetches /api/v1/lead-sources', async () => {
    mockFetchOnce(200, [{ sourceId: 1, name: 'Walk-in' }]);
    const result = await api.getLeadSources();
    expect(result).toEqual([{ sourceId: 1, name: 'Walk-in' }]);
  });

  it('getVehicleModels fetches /api/v1/vehicle-models', async () => {
    mockFetchOnce(200, [{ modelId: 101, name: 'Hatch' }]);
    const result = await api.getVehicleModels();
    expect(result).toEqual([{ modelId: 101, name: 'Hatch' }]);
  });

  it('getMyLeads fetches /api/v1/leads', async () => {
    mockFetchOnce(200, [{ leadId: 'x' }]);
    const result = await api.getMyLeads();
    expect(result).toEqual([{ leadId: 'x' }]);
  });

  it('throws ApiError with fieldErrors on a 400 array response', async () => {
    mockFetchOnce(400, [{ field: 'mobile', message: 'mobile must be valid' }]);
    await expect(
      api.createLead({ customerName: 'A', mobile: 'bad', sourceId: 1, modelId: 101 }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError with status 401 on unauthenticated response', async () => {
    mockFetchOnce(401, { message: 'Authentication required' });
    await expect(api.getMyLeads()).rejects.toMatchObject({ status: 401 });
  });

  // -----------------------------------------------------------------
  // Task 4.1.1 (issue #25) — convertLead + getConfig's convertLeadEnabled
  // -----------------------------------------------------------------
  it('convertLead posts to /api/v1/leads/{leadId}/convert and returns the created Enquiry', async () => {
    mockFetchOnce(201, { enquiryId: 'enq-1', leadId: 'lead-1', status: 'New' });
    const result = await api.convertLead('lead-1', {
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchangeInterest: true,
      financeInterest: false,
    });
    expect(result.enquiryId).toBe('enq-1');
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/leads/lead-1/convert',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('convertLead surfaces a 400 field error as ApiError.fieldErrors', async () => {
    mockFetchOnce(400, [{ field: 'budget', message: 'budget must be a positive integer' }]);
    await expect(
      api.convertLead('lead-1', { budget: -1, variant: 'VXi', exchangeInterest: true, financeInterest: false }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('getConfig returns both newLeadEnabled and convertLeadEnabled', async () => {
    mockFetchOnce(200, { newLeadEnabled: true, convertLeadEnabled: false });
    const result = await api.getConfig();
    expect(result).toEqual({ newLeadEnabled: true, convertLeadEnabled: false });
  });
});
