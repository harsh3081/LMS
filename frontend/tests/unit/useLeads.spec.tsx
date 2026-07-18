/**
 * RED->GREEN — issue #116, AC2. useLead(leadId) — single-Lead detail read
 * backing LeadDetailPage. Mirrors useEnquiries.spec.tsx's hook-test
 * convention: renderHook + a QueryClientProvider wrapper, api module mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useLead } from '../../src/hooks/useLeads';
import { api } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getLead: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

const lead: Lead = {
  leadId: 'lead-1',
  customerName: 'Asha Rao',
  mobile: '9876543210',
  sourceId: 1,
  sourceName: 'Walk-in',
  modelId: 101,
  modelName: 'Compact Hatchback LX',
  status: 'New',
  ownerId: 'owner-1',
  ownerName: 'Dealer Sales Executive Loc1-A',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
};

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useLead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the Lead by id and exposes it once resolved', async () => {
    mockedApi.getLead.mockResolvedValue(lead);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useLead('lead-1'), { wrapper: wrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lead);
    expect(mockedApi.getLead).toHaveBeenCalledWith('lead-1');
  });

  it('does not call the API when leadId is undefined (mirrors id-guarded hooks elsewhere)', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useLead(undefined), { wrapper: wrapper(queryClient) });
    expect(mockedApi.getLead).not.toHaveBeenCalled();
  });
});
