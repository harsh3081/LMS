/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #31 AC4. Mirrors
 * EnquiryQueue.spec.tsx's structure (table-list component, api client
 * mocked, MemoryRouter for the per-row "Log Follow-up" link).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UpcomingFollowupsList } from '../../src/components/UpcomingFollowupsList';
import { api } from '../../src/api/client';
import type { Followup } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getUpcomingFollowups: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function makeFollowup(overrides: Partial<Followup>): Followup {
  return {
    followupId: 'followup-1',
    enquiryId: 'enq-1',
    type: 'Call',
    remarks: 'Discussed financing options.',
    loggedBy: 'dse-1',
    locationId: 'loc-1',
    loggedAt: new Date().toISOString(),
    nextFollowUpAt: null,
    resultingStatus: null,
    ...overrides,
  };
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UpcomingFollowupsList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UpcomingFollowupsList (issue #31 AC4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty state when there are no upcoming follow-ups', async () => {
    mockedApi.getUpcomingFollowups.mockResolvedValue([]);
    renderList();
    expect(await screen.findByText(/no upcoming follow-ups/i)).toBeInTheDocument();
  });

  it('renders each Follow-up with its type, remarks, and a "Log Follow-up" link', async () => {
    mockedApi.getUpcomingFollowups.mockResolvedValue([
      makeFollowup({ followupId: 'f1', enquiryId: 'enq-9', type: 'Home Visit', nextFollowUpAt: '2099-01-01T00:00:00.000Z' }),
    ]);
    renderList();

    expect(await screen.findByText('Home Visit')).toBeInTheDocument();
    expect(screen.getByText('Discussed financing options.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /log follow-up/i });
    expect(link).toHaveAttribute('href', '/enquiries/enq-9/follow-up');
  });

  it('marks a past-due nextFollowUpAt as Overdue', async () => {
    mockedApi.getUpcomingFollowups.mockResolvedValue([
      makeFollowup({ nextFollowUpAt: '2020-01-01T00:00:00.000Z' }),
    ]);
    renderList();
    expect(await screen.findByText('Overdue')).toBeInTheDocument();
  });

  it('marks a future nextFollowUpAt as Upcoming', async () => {
    mockedApi.getUpcomingFollowups.mockResolvedValue([
      makeFollowup({ nextFollowUpAt: '2099-01-01T00:00:00.000Z' }),
    ]);
    renderList();
    expect(await screen.findByText('Upcoming')).toBeInTheDocument();
  });
});
