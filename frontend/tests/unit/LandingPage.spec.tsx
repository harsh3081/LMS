/**
 * RED->GREEN — Task 5.5: entry point + feature toggle (CC-10). UPDATED
 * (issue #118): "New Lead" is now a button that opens a slide-over panel
 * (SlideOver + NewLeadForm) instead of a `<Link>` navigating to /leads/new.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../../src/pages/LandingPage';
import { SUCCESS_AUTO_CLOSE_MS } from '../../src/components/NewLeadForm';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    // NEW (issue #31): getUpcomingFollowups is called by LandingPage's new
    // "My Upcoming Follow-ups" entry point via useUpcomingFollowups.
    // NEW (issue #34): getUpcomingTestDrives is called by LandingPage's new
    // "My Upcoming Test Drives" entry point via useUpcomingTestDrives.
    // NEW (issue #118): the New Lead slide-over panel mounts the real
    // NewLeadForm once opened, so its data reads/mutation are mocked here
    // too (mirrors NewLeadForm.spec.tsx / NewLeadPage.spec.tsx's mock set).
    api: {
      getConfig: vi.fn(),
      getMyLeads: vi.fn(),
      getUpcomingFollowups: vi.fn(),
      getUpcomingTestDrives: vi.fn(),
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createLead: vi.fn(),
      getFieldConfig: vi.fn(),
      getConsultants: vi.fn(),
      checkDuplicates: vi.fn(),
    },
  };
});
const mockedApi = vi.mocked(api, true);

const ALL_MANDATORY_FIELD_CONFIG = [
  { fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'sourceId', label: 'Source', mandatory: true, updatedBy: null, updatedAt: null },
  { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
];

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
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getConsultants.mockResolvedValue([]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
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
    // issue #118 (AC1): the entry point is now a <button> that opens a
    // slide-over panel, not a <Link> that navigates to /leads/new.
    const entry = await screen.findByRole('button', { name: /new lead/i });
    expect(entry).not.toHaveAttribute('href');
  });

  it('hides the New Lead entry point when the toggle is disabled', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: false, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('button', { name: /new lead/i })).not.toBeInTheDocument());
  });

  // -----------------------------------------------------------------
  // issue #118 — New Lead slide-over panel (AC1-AC4).
  // -----------------------------------------------------------------
  describe('New Lead slide-over panel (issue #118)', () => {
    beforeEach(() => {
      mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    });

    it('AC1/AC2: clicking "New Lead" opens the panel without navigating away — the Dashboard stays mounted underneath', async () => {
      renderLanding();
      const user = userEvent.setup();

      // Dashboard content is present before opening the panel.
      expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(await screen.findByRole('table', { name: /my leads/i })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /new lead/i }));

      // The panel is now open (AC1: docked slide-over, not a page navigation)...
      const dialog = await screen.findByRole('dialog', { name: /new lead/i });
      expect(dialog).toBeInTheDocument();
      // ...and the Dashboard heading/table are still in the document, proving
      // this is an overlay on top of the still-mounted Dashboard, not a
      // replacement of it (AC1: "does NOT navigate to a separate page").
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /my leads/i })).toBeInTheDocument();

      // AC2: the panel contains the New Lead form.
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    });

    it('AC3: closing via the close button removes the panel and leaves the Dashboard intact', async () => {
      renderLanding();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new lead/i }));
      await screen.findByRole('dialog', { name: /new lead/i });

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('AC2/AC4: the form inside the panel works end-to-end through to a successful creation, and the Dashboard queue reflects it without a full page reload', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-panel-e2e',
        customerName: 'Panel E2E',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });

      // Same targeted setTimeout spy as NewLeadForm.spec.tsx's
      // "onSuccess auto-close" tests — deterministic control over the
      // SUCCESS_AUTO_CLOSE_MS auto-close timer, no real wall-clock wait,
      // and every other timer (Testing Library's own polling included)
      // passes through untouched.
      const originalSetTimeout = window.setTimeout;
      let capturedCallback: (() => void) | null = null;
      const setTimeoutSpy = vi
        .spyOn(window, 'setTimeout')
        .mockImplementation(((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === SUCCESS_AUTO_CLOSE_MS) {
            capturedCallback = fn as () => void;
            return 0 as unknown as ReturnType<typeof setTimeout>;
          }
          return originalSetTimeout(fn as TimerHandler, delay, ...args);
        }) as typeof setTimeout);

      renderLanding();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new lead/i }));
      await screen.findByRole('dialog', { name: /new lead/i });
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'Panel E2E');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledTimes(1);

      // AC4: the already-visible "My Leads" table reflects the new Lead —
      // this is proven by useCreateLead's existing cache write (AC6 of
      // issue #24/#116), not by a second network read: getMyLeads was only
      // ever called once, on the initial Dashboard mount.
      expect(await screen.findByText('Panel E2E')).toBeInTheDocument();
      expect(mockedApi.getMyLeads).toHaveBeenCalledTimes(1);

      // AC4: the panel auto-closes shortly after showing the success message.
      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      setTimeoutSpy.mockRestore();
    });
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
