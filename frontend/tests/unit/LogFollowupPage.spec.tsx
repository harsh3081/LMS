/**
 * RED->GREEN — issue #30. LogFollowupPage reads :enquiryId from the route
 * and passes it through to LogFollowupForm; a successful submit shows the
 * success confirmation (AC1-AC5). Mirrors NewEnquiryPage.spec.tsx's
 * MemoryRouter usage, with an initial route carrying the :enquiryId param.
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
    api: { ...actual.api, logFollowup: vi.fn() },
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
    });

    renderPage('enq-42');
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'Left a voicemail.');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/follow-up logged/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).toHaveBeenCalledWith('enq-42', { type: 'Call', remarks: 'Left a voicemail.' });
  });
});
