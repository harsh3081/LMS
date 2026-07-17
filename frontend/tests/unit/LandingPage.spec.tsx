/**
 * RED->GREEN — Task 5.5: entry point + feature toggle (CC-10).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../../src/pages/LandingPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    // NEW (issue #31): getUpcomingFollowups is called by LandingPage's new
    // "My Upcoming Follow-ups" entry point via useUpcomingFollowups.
    // NEW (issue #34): getUpcomingTestDrives is called by LandingPage's new
    // "My Upcoming Test Drives" entry point via useUpcomingTestDrives.
    api: { getConfig: vi.fn(), getMyLeads: vi.fn(), getUpcomingFollowups: vi.fn(), getUpcomingTestDrives: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

function renderLanding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LandingPage entry point / feature toggle (CC-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyLeads.mockResolvedValue([]);
    mockedApi.getUpcomingFollowups.mockResolvedValue([]);
    mockedApi.getUpcomingTestDrives.mockResolvedValue([]);
  });

  // ---- issue #31 AC4: "My Upcoming Follow-ups" entry point ----
  it('AC4: shows the "My Upcoming Follow-ups" entry point, badged with the current count', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    mockedApi.getUpcomingFollowups.mockResolvedValue([
      {
        followupId: 'f1',
        enquiryId: 'e1',
        type: 'Call',
        remarks: 'r',
        loggedBy: 'dse-1',
        locationId: 'loc-1',
        loggedAt: new Date().toISOString(),
        nextFollowUpAt: '2026-08-01T00:00:00.000Z',
        resultingStatus: null,
      },
    ]);
    renderLanding();
    const entry = await screen.findByRole('link', { name: /my upcoming follow-ups/i });
    expect(entry).toHaveAttribute('href', '/follow-ups/upcoming');
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('AC4: shows no badge when there are no upcoming follow-ups', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    await screen.findByRole('link', { name: /my upcoming follow-ups/i });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('EVAL-CC-10: shows the New Lead entry point when the toggle is enabled', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const entry = await screen.findByRole('link', { name: /new lead/i });
    expect(entry).toHaveAttribute('href', '/leads/new');
  });

  it('hides the New Lead entry point when the toggle is disabled', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: false, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('link', { name: /new lead/i })).not.toBeInTheDocument());
  });

  // ---- issue #34 AC5: "My Upcoming Test Drives" + "Book a Test Drive" entry points ----
  it('AC5: shows the "My Upcoming Test Drives" entry point, badged with the current count', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    mockedApi.getUpcomingTestDrives.mockResolvedValue([
      {
        testDriveId: 't1',
        enquiryId: 'e1',
        vehicleId: 'v1',
        slotStart: '2026-08-01T10:00:00.000Z',
        slotEnd: '2026-08-01T10:30:00.000Z',
        status: 'Booked',
        remarks: null,
        bookedBy: 'dse-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    renderLanding();
    const entry = await screen.findByRole('link', { name: /my upcoming test drives/i });
    expect(entry).toHaveAttribute('href', '/test-drives/upcoming');
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('AC5: shows no badge when there are no upcoming test drives', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    await screen.findByRole('link', { name: /my upcoming test drives/i });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('AC1: shows the "Book a Test Drive" entry point', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const entry = await screen.findByRole('link', { name: /book a test drive/i });
    expect(entry).toHaveAttribute('href', '/test-drives/new');
  });

  // ---- issue #35: "Test Drive Scheduler" entry point ----
  it('shows the "Test Drive Scheduler" entry point', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const entry = await screen.findByRole('link', { name: /test drive scheduler/i });
    expect(entry).toHaveAttribute('href', '/test-drives/scheduler');
  });

  // -----------------------------------------------------------------
  // ADDED (issue #26) — New Enquiry entry point + its own feature toggle.
  // -----------------------------------------------------------------
  it('shows the New Enquiry entry point when directEnquiryEnabled is true', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const entry = await screen.findByRole('link', { name: /new enquiry/i });
    expect(entry).toHaveAttribute('href', '/enquiries/new');
  });

  it('hides the New Enquiry entry point when directEnquiryEnabled is false', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: false });
    renderLanding();
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('link', { name: /new enquiry/i })).not.toBeInTheDocument());
  });
});
