/**
 * RED->GREEN (Inside-Out) — Task 4.2.1 (issue #25). useConvertLead mutation:
 * on success the source Lead is removed (filtered by leadId) from the
 * cached queue — mirrors useCreateLead's cache-update convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useConvertLead } from '../../src/hooks/useEnquiries';
import { LEADS_QUERY_KEY } from '../../src/hooks/useLeads';
import { api } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      convertLead: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

const existingLeads: Lead[] = [
  {
    leadId: 'lead-1',
    customerName: 'Asha Rao',
    mobile: '9876543210',
    sourceId: 1,
    modelId: 101,
    status: 'New',
    ownerId: 'owner-1',
    locationId: 'loc-1',
    createdAt: new Date().toISOString(),
  },
  {
    leadId: 'lead-2',
    customerName: 'Rohan Iyer',
    mobile: '9876543211',
    sourceId: 1,
    modelId: 101,
    status: 'New',
    ownerId: 'owner-1',
    locationId: 'loc-1',
    createdAt: new Date().toISOString(),
  },
];

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useConvertLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the converted Lead (by leadId) from the cached queue on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(LEADS_QUERY_KEY, existingLeads);

    mockedApi.convertLead.mockResolvedValue({
      enquiryId: 'enq-1',
      leadId: 'lead-1',
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchangeInterest: true,
      financeInterest: false,
      convertedBy: 'owner-1',
      convertedAt: new Date().toISOString(),
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
    });

    const { result } = renderHook(() => useConvertLead(), { wrapper: wrapper(queryClient) });

    result.current.mutate({
      leadId: 'lead-1',
      input: { budget: 500000, variant: 'VXi (O) CVT', exchangeInterest: true, financeInterest: false },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Lead[]>(LEADS_QUERY_KEY);
    expect(cached?.some((l) => l.leadId === 'lead-1')).toBe(false);
    expect(cached?.some((l) => l.leadId === 'lead-2')).toBe(true);
  });
});
