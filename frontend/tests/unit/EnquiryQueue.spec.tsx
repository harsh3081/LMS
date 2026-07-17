/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #30. Each Enquiry row
 * exposes a "Log Follow-up" entry point (AC1-AC5's UI entry point) linking
 * to /enquiries/:enquiryId/follow-up. Mirrors LandingPage.spec.tsx's
 * MemoryRouter wrapping convention (EnquiryQueue now renders a react-router
 * <Link>).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EnquiryQueue } from '../../src/components/EnquiryQueue';
import { api } from '../../src/api/client';
import type { Enquiry } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getMyEnquiries: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

const enquiry: Enquiry = {
  enquiryId: 'enq-1',
  leadId: null,
  entryType: 'DIRECT',
  customerName: 'Asha Rao',
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

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EnquiryQueue />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('EnquiryQueue — Log Follow-up entry point (issue #30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Log Follow-up" link per row pointing at /enquiries/:enquiryId/follow-up', async () => {
    mockedApi.getMyEnquiries.mockResolvedValue([enquiry]);
    renderQueue();

    const link = await screen.findByRole('link', { name: /log follow-up/i });
    expect(link).toHaveAttribute('href', '/enquiries/enq-1/follow-up');
  });
});
