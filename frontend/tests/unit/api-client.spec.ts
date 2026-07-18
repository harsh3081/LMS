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

  // -----------------------------------------------------------------
  // issue #26 — createDirectEnquiry + getMyEnquiries + getConfig's
  // directEnquiryEnabled.
  // -----------------------------------------------------------------
  it('createDirectEnquiry posts to /api/v1/enquiries and returns the created Enquiry', async () => {
    mockFetchOnce(201, { enquiryId: 'enq-direct-1', leadId: null, entryType: 'DIRECT', status: 'New' });
    const result = await api.createDirectEnquiry({
      customerName: 'Walk-in Customer',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      budget: 300000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: true,
    });
    expect(result.enquiryId).toBe('enq-direct-1');
    expect(result.leadId).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/enquiries',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('createDirectEnquiry surfaces a 400 field error as ApiError.fieldErrors', async () => {
    mockFetchOnce(400, [{ field: 'customerName', message: 'customerName is required' }]);
    await expect(
      api.createDirectEnquiry({
        customerName: '',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        budget: 300000,
        variant: 'LX',
        exchangeInterest: false,
        financeInterest: true,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('getMyEnquiries fetches /api/v1/enquiries', async () => {
    mockFetchOnce(200, [{ enquiryId: 'enq-1', entryType: 'DIRECT' }]);
    const result = await api.getMyEnquiries();
    expect(result).toEqual([{ enquiryId: 'enq-1', entryType: 'DIRECT' }]);
  });

  it('getConfig returns directEnquiryEnabled', async () => {
    mockFetchOnce(200, { newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: false });
    const result = await api.getConfig();
    expect(result).toEqual({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: false });
  });

  // -----------------------------------------------------------------
  // issue #27 — getFieldConfig / updateFieldConfig (FR-04)
  // -----------------------------------------------------------------
  it('getFieldConfig fetches /api/v1/field-config', async () => {
    const config = [{ fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null }];
    mockFetchOnce(200, config);
    const result = await api.getFieldConfig();
    expect(result).toEqual(config);
    expect(fetch).toHaveBeenCalledWith('/api/v1/field-config', expect.objectContaining({ credentials: 'include' }));
  });

  it('updateFieldConfig PUTs to /api/v1/field-config and returns the updated list', async () => {
    const updated = [{ fieldName: 'sourceId', label: 'Source', mandatory: false, updatedBy: 'admin-1', updatedAt: '2026-01-01T00:00:00.000Z' }];
    mockFetchOnce(200, updated);
    const result = await api.updateFieldConfig({ fields: [{ fieldName: 'sourceId', mandatory: false }] });
    expect(result).toEqual(updated);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/field-config',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    );
  });

  it('updateFieldConfig surfaces a 403 as ApiError', async () => {
    mockFetchOnce(403, { message: 'Missing required capability: manage-field-config' });
    await expect(
      api.updateFieldConfig({ fields: [{ fieldName: 'sourceId', mandatory: false }] }),
    ).rejects.toMatchObject({ status: 403 });
  });

  // -----------------------------------------------------------------
  // issue #30 — logFollowup / getFollowups (AC1-AC5)
  // -----------------------------------------------------------------
  it('logFollowup posts to /api/v1/enquiries/{enquiryId}/follow-ups and returns the created Follow-up', async () => {
    mockFetchOnce(201, {
      followupId: 'followup-1',
      enquiryId: 'enq-1',
      type: 'Home Visit',
      remarks: 'Discussed financing options.',
      loggedBy: 'dse-1',
      locationId: 'loc-1',
      loggedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = await api.logFollowup('enq-1', { type: 'Home Visit', remarks: 'Discussed financing options.' });
    expect(result.followupId).toBe('followup-1');
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/enquiries/enq-1/follow-ups',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('logFollowup surfaces a 400 field error as ApiError.fieldErrors', async () => {
    mockFetchOnce(400, [{ field: 'remarks', message: 'remarks is required' }]);
    await expect(api.logFollowup('enq-1', { type: 'Call', remarks: '' })).rejects.toBeInstanceOf(ApiError);
  });

  it('logFollowup surfaces a 404 (enquiry not found / not owned) as ApiError', async () => {
    mockFetchOnce(404, [{ field: 'enquiryId', message: 'Enquiry enq-1 not found' }]);
    await expect(
      api.logFollowup('enq-1', { type: 'Call', remarks: 'Discussed financing options.' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('getFollowups fetches /api/v1/enquiries/{enquiryId}/follow-ups', async () => {
    mockFetchOnce(200, [{ followupId: 'followup-1', enquiryId: 'enq-1', type: 'Call' }]);
    const result = await api.getFollowups('enq-1');
    expect(result).toEqual([{ followupId: 'followup-1', enquiryId: 'enq-1', type: 'Call' }]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/enquiries/enq-1/follow-ups',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  // -----------------------------------------------------------------
  // issue #31 — logFollowup(nextFollowUpAt/enquiryStatus) / getUpcomingFollowups (AC1-AC4)
  // -----------------------------------------------------------------
  it('logFollowup posts nextFollowUpAt and returns it on the created Follow-up', async () => {
    mockFetchOnce(201, {
      followupId: 'followup-2',
      enquiryId: 'enq-1',
      type: 'Home Visit',
      remarks: 'Scheduling next visit.',
      loggedBy: 'dse-1',
      locationId: 'loc-1',
      loggedAt: '2026-01-01T00:00:00.000Z',
      nextFollowUpAt: '2026-08-01T00:00:00.000Z',
    });
    const result = await api.logFollowup('enq-1', {
      type: 'Home Visit',
      remarks: 'Scheduling next visit.',
      nextFollowUpAt: '2026-08-01',
    });
    expect(result.nextFollowUpAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('logFollowup surfaces a 400 nextFollowUpAt-required error as ApiError.fieldErrors', async () => {
    mockFetchOnce(400, [
      { field: 'nextFollowUpAt', message: 'nextFollowUpAt is required unless enquiryStatus is Lost or Booked' },
    ]);
    await expect(api.logFollowup('enq-1', { type: 'Call', remarks: 'No date given.' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('logFollowup posts a terminal enquiryStatus without nextFollowUpAt', async () => {
    mockFetchOnce(201, {
      followupId: 'followup-3',
      enquiryId: 'enq-1',
      type: 'Call',
      remarks: 'Closing out.',
      loggedBy: 'dse-1',
      locationId: 'loc-1',
      loggedAt: '2026-01-01T00:00:00.000Z',
      nextFollowUpAt: null,
    });
    const result = await api.logFollowup('enq-1', { type: 'Call', remarks: 'Closing out.', enquiryStatus: 'Lost' });
    expect(result.nextFollowUpAt).toBeNull();
  });

  it('getUpcomingFollowups fetches /api/v1/follow-ups/upcoming', async () => {
    mockFetchOnce(200, [{ followupId: 'followup-1', enquiryId: 'enq-1', nextFollowUpAt: '2026-08-01T00:00:00.000Z' }]);
    const result = await api.getUpcomingFollowups();
    expect(result).toEqual([{ followupId: 'followup-1', enquiryId: 'enq-1', nextFollowUpAt: '2026-08-01T00:00:00.000Z' }]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/follow-ups/upcoming',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  // -----------------------------------------------------------------
  // issue #34 — getDemoVehicles / bookTestDrive / getUpcomingTestDrives (AC1-AC6)
  // -----------------------------------------------------------------
  it('getDemoVehicles fetches /api/v1/demo-vehicles', async () => {
    mockFetchOnce(200, [{ vehicleId: 'v1', modelId: 101, variant: 'LX', locationId: 'loc-1' }]);
    const result = await api.getDemoVehicles();
    expect(result).toEqual([{ vehicleId: 'v1', modelId: 101, variant: 'LX', locationId: 'loc-1' }]);
    expect(fetch).toHaveBeenCalledWith('/api/v1/demo-vehicles', expect.objectContaining({ credentials: 'include' }));
  });

  it('bookTestDrive posts to /api/v1/test-drives and returns the created Test Drive', async () => {
    mockFetchOnce(201, {
      testDriveId: 'td-1',
      enquiryId: 'enq-1',
      vehicleId: 'v1',
      slotStart: '2026-08-01T10:00:00.000Z',
      slotEnd: '2026-08-01T10:30:00.000Z',
      status: 'Booked',
      remarks: null,
      bookedBy: 'dse-1',
      locationId: 'loc-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const result = await api.bookTestDrive({
      enquiryId: 'enq-1',
      vehicleId: 'v1',
      slotStart: '2026-08-01T10:00:00.000Z',
      slotEnd: '2026-08-01T10:30:00.000Z',
    });
    expect(result.testDriveId).toBe('td-1');
    expect(result.status).toBe('Booked');
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/test-drives',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('bookTestDrive surfaces a 400 field error as ApiError.fieldErrors', async () => {
    mockFetchOnce(400, [{ field: 'enquiryId', message: 'enquiryId is required' }]);
    await expect(
      api.bookTestDrive({ enquiryId: '', vehicleId: 'v1', slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('bookTestDrive surfaces a 404 (enquiry not found / not owned) as ApiError', async () => {
    mockFetchOnce(404, [{ field: 'enquiryId', message: 'Enquiry enq-1 not found' }]);
    await expect(
      api.bookTestDrive({ enquiryId: 'enq-1', vehicleId: 'v1', slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  // -----------------------------------------------------------------
  // issue #36 — 409 double-booking conflict, { errors, suggestedSlots } shape
  // -----------------------------------------------------------------

  it('bookTestDrive surfaces a 409 conflict as ApiError with fieldErrors AND suggestedSlots parsed from the { errors, suggestedSlots } body', async () => {
    mockFetchOnce(409, {
      errors: [{ field: 'slotStart', message: 'The selected vehicle is already booked for an overlapping time slot' }],
      suggestedSlots: [
        { slotStart: '2026-08-01T10:30:00.000Z', slotEnd: '2026-08-01T11:00:00.000Z' },
        { slotStart: '2026-08-01T11:00:00.000Z', slotEnd: '2026-08-01T11:30:00.000Z' },
      ],
    });

    try {
      await api.bookTestDrive({
        enquiryId: 'enq-1',
        vehicleId: 'v1',
        slotStart: '2026-08-01T10:00:00.000Z',
        slotEnd: '2026-08-01T10:30:00.000Z',
      });
      throw new Error('expected bookTestDrive to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiError = err as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.fieldErrors).toEqual([
        { field: 'slotStart', message: 'The selected vehicle is already booked for an overlapping time slot' },
      ]);
      expect(apiError.suggestedSlots).toEqual([
        { slotStart: '2026-08-01T10:30:00.000Z', slotEnd: '2026-08-01T11:00:00.000Z' },
        { slotStart: '2026-08-01T11:00:00.000Z', slotEnd: '2026-08-01T11:30:00.000Z' },
      ]);
    }
  });

  it('a plain FieldError[] 400 body still yields a null suggestedSlots (backward-compatible parsing)', async () => {
    mockFetchOnce(400, [{ field: 'enquiryId', message: 'enquiryId is required' }]);
    try {
      await api.bookTestDrive({ enquiryId: '', vehicleId: 'v1', slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' });
      throw new Error('expected bookTestDrive to reject');
    } catch (err) {
      expect((err as ApiError).suggestedSlots).toBeNull();
    }
  });

  it('getUpcomingTestDrives fetches /api/v1/test-drives/upcoming', async () => {
    mockFetchOnce(200, [{ testDriveId: 'td-1', enquiryId: 'enq-1', slotStart: '2026-08-01T10:00:00.000Z' }]);
    const result = await api.getUpcomingTestDrives();
    expect(result).toEqual([{ testDriveId: 'td-1', enquiryId: 'enq-1', slotStart: '2026-08-01T10:00:00.000Z' }]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/test-drives/upcoming',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  // -----------------------------------------------------------------
  // issue #35 — getScheduler (AC1/AC2/AC5)
  // -----------------------------------------------------------------
  it('getScheduler fetches /api/v1/test-drives with vehicleId/from/to query params', async () => {
    mockFetchOnce(200, [{ slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' }]);
    const result = await api.getScheduler({
      vehicleId: 'v1',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-01T23:59:59.999Z',
    });
    expect(result).toEqual([{ slotStart: '2026-08-01T10:00:00.000Z', slotEnd: '2026-08-01T10:30:00.000Z' }]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/test-drives?vehicleId=v1&from=2026-08-01T00%3A00%3A00.000Z&to=2026-08-01T23%3A59%3A59.999Z',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
