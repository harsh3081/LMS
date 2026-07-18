/**
 * RED->GREEN — Task 5.5: entry point + feature toggle (CC-10). UPDATED
 * (issue #118): "New Lead" is now a button that opens a slide-over panel
 * (SlideOver + NewLeadForm) instead of a `<Link>` navigating to /leads/new.
 *
 * UPDATED (issue #126, AC4): the header link row is trimmed to just the two
 * quick-action controls ("New Enquiry" link, "New Lead" button) — "My
 * Upcoming Follow-ups", "My Upcoming Test Drives", "Book a Test Drive", and
 * "Test Drive Scheduler" (along with their badge-count reads) are removed
 * from LandingPage itself, since they're now covered by the persistent
 * Sidebar rendered by AppShell (see Sidebar.spec.tsx for that coverage).
 * Because AppShell now always renders the Sidebar too, and the Sidebar
 * happens to render some of the SAME link text/hrefs (e.g. "New Enquiry")
 * as this page's own quick actions, several queries below are scoped with
 * `within(main)` to assert against LandingPage's own content specifically
 * — a plain `getByRole('link', ...)` would otherwise match twice (once in
 * the page, once in the Sidebar) or silently match the Sidebar's copy after
 * a link was removed from the page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
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
    // NEW (issue #118): the New Lead slide-over panel mounts the real
    // NewLeadForm once opened, so its data reads/mutation are mocked here
    // too (mirrors NewLeadForm.spec.tsx / NewLeadPage.spec.tsx's mock set).
    api: {
      getConfig: vi.fn(),
      getMyLeads: vi.fn(),
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
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getConsultants.mockResolvedValue([]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
  });

  // ---- issue #126 AC4: header link row trimmed to the 2 quick actions ----
  it('AC4: no longer renders "My Upcoming Follow-ups", "My Upcoming Test Drives", "Book a Test Drive", "Test Drive Scheduler", or "Field Configuration" as part of its own content (now Sidebar-only nav)', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const main = await screen.findByRole('main');

    // Scoped to the page's own <main> — the Sidebar (rendered by AppShell
    // alongside <main>, not inside it) still renders equivalent links, so
    // an unscoped query would find those instead and mask a regression.
    expect(within(main).queryByRole('link', { name: /my upcoming follow-ups/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: /my upcoming test drives/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: /book a test drive/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: /test drive scheduler/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole('link', { name: /field configuration/i })).not.toBeInTheDocument();

    // The routes themselves are still reachable — just via the Sidebar now,
    // not a page-level regression (these are the Sidebar's own links,
    // outside <main>, verified in depth by Sidebar.spec.tsx).
    expect(screen.getByRole('link', { name: /my upcoming follow-ups/i })).toHaveAttribute('href', '/follow-ups/upcoming');
    expect(screen.getByRole('link', { name: /field configuration/i })).toHaveAttribute('href', '/admin/field-config');
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

  // -----------------------------------------------------------------
  // ADDED (issue #26) — New Enquiry entry point + its own feature toggle.
  // UPDATED (issue #126): the Sidebar renders its own "New Enquiry" link
  // to the same /enquiries/new route, with the same accessible name — so
  // an unscoped `getByRole('link', { name: /new enquiry/i })` would now
  // match BOTH the page's own quick action and the Sidebar's copy
  // ("Found multiple elements"). Scoped to `within(main)` so these assert
  // against LandingPage's own quick action specifically.
  // -----------------------------------------------------------------
  it('shows the New Enquiry entry point when directEnquiryEnabled is true', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    renderLanding();
    const main = await screen.findByRole('main');
    const entry = await within(main).findByRole('link', { name: /new enquiry/i });
    expect(entry).toHaveAttribute('href', '/enquiries/new');
  });

  it('hides the New Enquiry entry point when directEnquiryEnabled is false', async () => {
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: false });
    renderLanding();
    const main = await screen.findByRole('main');
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    await waitFor(() => expect(within(main).queryByRole('link', { name: /new enquiry/i })).not.toBeInTheDocument());
    // The route stays reachable via the Sidebar's own, unconditional
    // "New Enquiry" link — the feature toggle only ever gated LandingPage's
    // own quick-action copy, not the Sidebar (issue #126's minimal-shell
    // scope: the Sidebar is not toggle-aware).
    expect(screen.getByRole('link', { name: /new enquiry/i })).toHaveAttribute('href', '/enquiries/new');
  });
});
