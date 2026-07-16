/**
 * RED->GREEN (Inside-Out) — issue #26. useCreateDirectEnquiry mutation: on
 * success the created Enquiry is prepended to the cached list (mirrors
 * useCreateLead's cache-update convention). Kept in its own file (rather
 * than editing #25's useEnquiries.spec.tsx) for isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useCreateDirectEnquiry, useEnquiries, ENQUIRIES_QUERY_KEY } from '../../src/hooks/useEnquiries';
import { api } from '../../src/api/client';
import type { Enquiry } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createDirectEnquiry: vi.fn(),
      getMyEnquiries: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const createdEnquiry: Enquiry = {
  enquiryId: 'enq-direct-1',
  leadId: null,
  entryType: 'DIRECT',
  customerName: 'Walk-in Customer',
  mobile: '9876543210',
  sourceId: 1,
  modelId: 101,
  budget: 300000,
  variant: 'LX',
  exchangeInterest: false,
  financeInterest: true,
  convertedBy: 'owner-1',
  convertedAt: new Date().toISOString(),
  status: 'New',
  ownerId: 'owner-1',
  locationId: 'loc-1',
};

describe('useCreateDirectEnquiry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepends the created Enquiry into the cached list on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(ENQUIRIES_QUERY_KEY, []);
    mockedApi.createDirectEnquiry.mockResolvedValue(createdEnquiry);

    const { result } = renderHook(() => useCreateDirectEnquiry(), { wrapper: wrapper(queryClient) });

    result.current.mutate({
      customerName: 'Walk-in Customer',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      budget: 300000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Enquiry[]>(ENQUIRIES_QUERY_KEY);
    expect(cached?.[0].enquiryId).toBe('enq-direct-1');
  });
});

describe('useEnquiries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the own-Enquiries list via getMyEnquiries', async () => {
    mockedApi.getMyEnquiries.mockResolvedValue([createdEnquiry]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useEnquiries(), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([createdEnquiry]);
  });
});
