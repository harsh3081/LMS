/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #32 ("Role-Scoped
 * Follow-up History Timeline", AC1/AC2). Mirrors UpcomingFollowupsList.spec.tsx's
 * structure (table-list component, api client mocked). Role-scoping itself
 * (AC3-AC6) is a backend-only concern proven by the Jest/Supertest suite
 * (see .phoenix-os/project/specs/32/NOTES.md) — this component simply
 * renders whatever GET /api/v1/enquiries/:enquiryId/follow-ups returns for
 * the caller, so no role branching exists client-side.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { FollowupHistoryTimeline } from '../../src/components/FollowupHistoryTimeline';
import { api } from '../../src/api/client';
import type { Followup } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getFollowups: vi.fn() },
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

function renderTimeline(enquiryId = 'enq-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FollowupHistoryTimeline enquiryId={enquiryId} />
    </QueryClientProvider>,
  );
}

describe('FollowupHistoryTimeline (issue #32, AC1/AC2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty state when there is no Follow-up history yet', async () => {
    mockedApi.getFollowups.mockResolvedValue([]);
    renderTimeline();
    expect(await screen.findByText(/no follow-up history/i)).toBeInTheDocument();
  });

  it('AC2: renders each entry with type, remarks, and next follow-up date', async () => {
    mockedApi.getFollowups.mockResolvedValue([
      makeFollowup({
        followupId: 'f1',
        type: 'Home Visit',
        remarks: 'Discussed financing options.',
        nextFollowUpAt: '2026-08-01T00:00:00.000Z',
      }),
    ]);
    renderTimeline();

    expect(await screen.findByText('Home Visit')).toBeInTheDocument();
    expect(screen.getByText('Discussed financing options.')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-08-01T00:00:00.000Z').toLocaleDateString())).toBeInTheDocument();
  });

  it('AC2: renders "any status change" (resultingStatus) when a Follow-up closed the Enquiry', async () => {
    mockedApi.getFollowups.mockResolvedValue([
      makeFollowup({ followupId: 'f2', resultingStatus: 'Lost', nextFollowUpAt: null }),
    ]);
    renderTimeline();

    expect(await screen.findByText('Lost')).toBeInTheDocument();
  });

  it('does not show a status change indicator for an entry with no resultingStatus', async () => {
    mockedApi.getFollowups.mockResolvedValue([makeFollowup({ followupId: 'f3', resultingStatus: null })]);
    renderTimeline();

    await screen.findByText('Call');
    expect(screen.queryByText('Lost')).not.toBeInTheDocument();
    expect(screen.queryByText('Booked')).not.toBeInTheDocument();
  });

  it('AC1: renders multiple entries in the order returned by the API (backend already sorts newest-first)', async () => {
    mockedApi.getFollowups.mockResolvedValue([
      makeFollowup({ followupId: 'newer', remarks: 'Newer entry.' }),
      makeFollowup({ followupId: 'older', remarks: 'Older entry.' }),
    ]);
    renderTimeline();

    const rows = await screen.findAllByRole('row');
    // rows[0] is the header row.
    expect(rows[1]).toHaveTextContent('Newer entry.');
    expect(rows[2]).toHaveTextContent('Older entry.');
  });

  it('fetches the history for the given enquiryId', async () => {
    mockedApi.getFollowups.mockResolvedValue([]);
    renderTimeline('enq-99');
    await screen.findByText(/no follow-up history/i);
    expect(mockedApi.getFollowups).toHaveBeenCalledWith('enq-99');
  });
});
