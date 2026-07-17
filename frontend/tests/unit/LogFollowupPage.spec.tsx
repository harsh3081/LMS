/**
 * RED->GREEN — issue #30, extended by issue #32 ("Role-Scoped Follow-up
 * History Timeline", AC1/AC2). LogFollowupPage reads :enquiryId from the
 * route and passes it through to LogFollowupForm; a successful submit
 * shows the success confirmation (AC1-AC5). Mirrors NewEnquiryPage.spec.tsx's
 * MemoryRouter usage, with an initial route carrying the :enquiryId param.
 * MODIFIED (issue #32): the page now also renders FollowupHistoryTimeline
 * for the same routed Enquiry — `getFollowups` is mocked here too so that
 * component's own query resolves during these tests (its own rendering
 * behavior is covered in depth by FollowupHistoryTimeline.spec.tsx).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LogFollowupPage } from '../../src/pages/LogFollowupPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, logFollowup: vi.fn(), getFollowups: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function renderPage(enquiryId = 'enq-42') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/enquiries/${enquiryId}/follow-up`]}>
        <Routes>
          <Route path="/enquiries/:enquiryId/follow-up" element={<LogFollowupPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LogFollowupPage (issue #30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFollowups.mockResolvedValue([]);
  });

  it('renders the Log Follow-up form for the routed Enquiry', () => {
    renderPage('enq-42');
    expect(screen.getByLabelText(/follow-up type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remarks/i)).toBeInTheDocument();
  });

  it('AC1/AC2/AC5: submitting valid data calls logFollowup with the routed enquiryId', async () => {
    mockedApi.logFollowup.mockResolvedValue({
      followupId: 'followup-1',
      enquiryId: 'enq-42',
      type: 'Call',
      remarks: 'Left a voicemail.',
      loggedBy: 'dse-1',
      locationId: 'loc-1',
      loggedAt: new Date().toISOString(),
      nextFollowUpAt: '2026-08-01T00:00:00.000Z',
      resultingStatus: null,
    });

    renderPage('enq-42');
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'Left a voicemail.');
    await user.type(screen.getByLabelText(/next follow-up date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/follow-up logged/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).toHaveBeenCalledWith('enq-42', {
      type: 'Call',
      remarks: 'Left a voicemail.',
      nextFollowUpAt: '2026-08-01',
    });
  });

  // ---- issue #32: Role-Scoped Follow-up History Timeline (AC1/AC2) ----
  it('AC1/AC2: renders the Follow-up history timeline for the routed Enquiry', async () => {
    mockedApi.getFollowups.mockResolvedValue([
      {
        followupId: 'followup-9',
        enquiryId: 'enq-42',
        type: 'Showroom Visit',
        remarks: 'Customer viewed the SUV lineup.',
        loggedBy: 'dse-1',
        locationId: 'loc-1',
        loggedAt: new Date().toISOString(),
        nextFollowUpAt: null,
        resultingStatus: 'Booked',
      },
    ]);

    renderPage('enq-42');

    // Wait on the remarks text specifically — "Showroom Visit"/"Booked" are
    // also present synchronously as <option> text in LogFollowupForm's
    // dropdowns above, so they resolve immediately and would not actually
    // prove the async timeline query has settled.
    expect(await screen.findByText('Customer viewed the SUV lineup.')).toBeInTheDocument();
    expect(screen.getAllByText('Showroom Visit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Booked').length).toBeGreaterThan(0);
    expect(mockedApi.getFollowups).toHaveBeenCalledWith('enq-42');
  });

  it('shows the empty-history message when the Enquiry has no Follow-ups yet', async () => {
    mockedApi.getFollowups.mockResolvedValue([]);
    renderPage('enq-42');
    expect(await screen.findByText(/no follow-up history/i)).toBeInTheDocument();
  });
});
