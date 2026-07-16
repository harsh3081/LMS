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
});
