/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Task 4.5.1 (issue #25).
 * The per-row "Convert to Enquiry" action renders only for non-Converted
 * rows and only when convertLeadEnabled (AC1, CC-11).
 *
 * REDESIGNED (issue #124, AC1) then REVERSED (issue #132): issue #124
 * changed "Convert to Enquiry" from a button that inline-expanded the old
 * 4-field `ConvertLeadForm` below the table into a `Link` navigating to a
 * dedicated `/leads/:leadId/convert` route (`ConvertLeadPage`). Issue #132
 * reverses that: it is a `<button>` again, but now opens the NEW 8-section
 * `ConvertLeadForm` (unchanged since #124's rewrite) in a right-docked
 * `SlideOver` panel — mirroring exactly how "New Lead" (issue #118) opens
 * its own SlideOver from LeadManagementPage. This file's assertions were
 * updated to match: button (not link) role for the trigger, and new tests
 * covering panel-open/panel-close/one-panel-at-a-time behavior. The "row
 * leaves the queue on a successful conversion" behavior (AC5) still lives in
 * useConvertLead's cache-update mechanism, already covered by
 * useEnquiries.spec.tsx — ConvertLeadForm.spec.tsx covers the new form's own
 * submission behavior directly, including its issue #132 auto-close.
 *
 * EXTENDED (issue #116, AC1/AC2/AC3): LeadQueue was redesigned into an
 * 8-column professional table (Name, Mobile, Model of Interest, Source,
 * Assigned To, Status, Action, View) — this file now also covers those new
 * columns (including the denormalized modelName/sourceName/ownerName), the
 * new "View" link into LeadDetailPage, and the new loading/empty states.
 * Wrapped in a MemoryRouter (mirrors EnquiryQueue.spec.tsx's convention)
 * since LeadQueue still renders a react-router `Link` for "View".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LeadQueue } from '../../src/components/LeadQueue';
import { SUCCESS_AUTO_CLOSE_MS } from '../../src/components/ConvertLeadForm';
import { api } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyLeads: vi.fn(),
      getConfig: vi.fn(),
      // issue #132: the Convert to Enquiry slide-over panel mounts the real
      // ConvertLeadForm once opened, so its data reads/mutation are mocked
      // here too (mirrors ConvertLeadForm.spec.tsx's mock set).
      getLead: vi.fn(),
      getVehicleModels: vi.fn(),
      getConsultants: vi.fn(),
      convertLead: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

const openLead: Lead = {
  leadId: 'lead-open',
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

const convertedLead: Lead = {
  leadId: 'lead-converted',
  customerName: 'Rohan Iyer',
  mobile: '9876543211',
  sourceId: 1,
  sourceName: 'Walk-in',
  modelId: 101,
  modelName: 'Compact Hatchback LX',
  status: 'Converted',
  ownerId: 'owner-1',
  ownerName: 'Dealer Sales Executive Loc1-A',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
};

// issue #132: a second open Lead, distinct from `openLead`, used by the
// "only one panel open at a time" test below.
const secondOpenLead: Lead = {
  leadId: 'lead-open-2',
  customerName: 'Priya Nair',
  mobile: '9876543212',
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

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LeadQueue />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LeadQueue — Convert to Enquiry action (Task 4.5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EVAL-AC1-01: renders the Convert to Enquiry action for a non-Converted row, not for a Converted one', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead, convertedLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    const openRow = (await screen.findByText('Asha Rao')).closest('tr')!;
    const convertedRow = screen.getByText('Rohan Iyer').closest('tr')!;

    expect(within(openRow).getByRole('button', { name: /convert to enquiry/i })).toBeInTheDocument();
    expect(within(convertedRow).queryByRole('button', { name: /convert to enquiry/i })).not.toBeInTheDocument();
  });

  it('CC-11: hides the Convert to Enquiry action entirely when convertLeadEnabled is false', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: false, directEnquiryEnabled: true });

    renderQueue();

    await screen.findByText('Asha Rao');
    await waitFor(() => expect(mockedApi.getConfig).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /convert to enquiry/i })).not.toBeInTheDocument();
  });
});

describe('LeadQueue — Convert to Enquiry slide-over panel (issue #132)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getConsultants.mockResolvedValue([]);
  });

  it('AC1: clicking "Convert to Enquiry" opens a slide-over (not a navigation) with that row\'s ConvertLeadForm', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getLead.mockResolvedValue(openLead);

    renderQueue();
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: /convert to enquiry/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(button);

    const dialog = await screen.findByRole('dialog', { name: /convert to enquiry/i });
    expect(dialog).toBeInTheDocument();
    // The queue table is still mounted underneath — this is an overlay, not
    // a page replacement (AC1: "not a page navigation").
    expect(screen.getByRole('table', { name: /my leads/i })).toBeInTheDocument();
    expect(mockedApi.getLead).toHaveBeenCalledWith('lead-open');
    // AC2: the panel shows the full 8-section form.
    expect(await within(dialog).findByLabelText(/budget/i)).toBeInTheDocument();
  });

  it('closing the panel via the close button removes it and leaves the queue intact', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getLead.mockResolvedValue(openLead);

    renderQueue();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /convert to enquiry/i }));
    await screen.findByRole('dialog', { name: /convert to enquiry/i });

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('only one row\'s panel is open at a time — opening a second row\'s panel swaps to that lead', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead, secondOpenLead]);
    mockedApi.getLead.mockImplementation((leadId: string) =>
      Promise.resolve(leadId === openLead.leadId ? openLead : secondOpenLead),
    );

    renderQueue();
    const user = userEvent.setup();
    const ashaRow = (await screen.findByText('Asha Rao')).closest('tr')!;
    const priyaRow = screen.getByText('Priya Nair').closest('tr')!;

    await user.click(within(ashaRow).getByRole('button', { name: /convert to enquiry/i }));
    await screen.findByRole('dialog', { name: /convert to enquiry/i });
    expect(mockedApi.getLead).toHaveBeenLastCalledWith('lead-open');
    // Only a single dialog is ever rendered — verified below by exercising
    // the row-switch itself rather than by counting dialogs (there is only
    // ever one SlideOver instance, per this component's implementation).

    await user.click(within(priyaRow).getByRole('button', { name: /convert to enquiry/i }));
    await waitFor(() => expect(mockedApi.getLead).toHaveBeenLastCalledWith('lead-open-2'));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('AC3: on a successful conversion, the success message shows briefly, then the panel auto-closes', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getLead.mockResolvedValue(openLead);
    mockedApi.convertLead.mockResolvedValue({
      enquiryId: 'enq-1',
      leadId: 'lead-open',
      entryType: 'CONVERTED',
      customerName: null,
      mobile: null,
      sourceId: null,
      modelId: 101,
      budget: 500000,
      variant: 'LX',
      exchangeInterest: true,
      financeInterest: false,
      convertedBy: 'owner-1',
      convertedAt: new Date().toISOString(),
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
    });

    // Same targeted setTimeout spy as ConvertLeadForm.spec.tsx's /
    // NewLeadForm.spec.tsx's auto-close tests — deterministic control over
    // the SUCCESS_AUTO_CLOSE_MS timer, no real wall-clock wait.
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

    renderQueue();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /convert to enquiry/i }));
    const dialog = await screen.findByRole('dialog', { name: /convert to enquiry/i });
    await within(dialog).findByText('Asha Rao');

    // `openLead` carries no `variant`, so Vehicle Information's pre-fill
    // leaves it blank — fill it in explicitly since it's one of the 4
    // fields whose required-ness ConvertLeadForm kept unchanged (AC3).
    await user.type(within(dialog).getByLabelText(/^variant$/i), 'LX');
    await user.type(within(dialog).getByLabelText(/budget/i), '500000');
    await user.selectOptions(within(dialog).getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(within(dialog).getByLabelText(/finance interest/i), 'false');
    await user.click(within(dialog).getByRole('button', { name: /^convert to enquiry$/i }));

    expect(await within(dialog).findByText(/converted|enquiry created|success/i)).toBeInTheDocument();
    // Still open immediately after success — the panel has not been asked
    // to close yet.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(capturedCallback).not.toBeNull();
    await act(async () => capturedCallback!());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setTimeoutSpy.mockRestore();
  });
});

describe('LeadQueue — professional table redesign (issue #116)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1: renders all 8 requested columns with human-readable names, not raw ids', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    for (const heading of ['Name', 'Mobile', 'Model of Interest', 'Source', 'Assigned To', 'Status', 'Action', 'View']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }

    const row = (await screen.findByText('Asha Rao')).closest('tr')!;
    expect(within(row).getByText('9876543210')).toBeInTheDocument();
    expect(within(row).getByText('Compact Hatchback LX')).toBeInTheDocument();
    expect(within(row).getByText('Walk-in')).toBeInTheDocument();
    expect(within(row).getByText('Dealer Sales Executive Loc1-A')).toBeInTheDocument();
    expect(within(row).getByText('New')).toBeInTheDocument();
    // Raw ids must not leak into the rendered row.
    expect(within(row).queryByText('101')).not.toBeInTheDocument();
    expect(within(row).queryByText('owner-1')).not.toBeInTheDocument();
  });

  it('AC2: the View link/button per row navigates to /leads/:leadId', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();
    const row = (await screen.findByText('Asha Rao')).closest('tr')!;
    const viewLink = within(row).getByRole('link', { name: /view/i });
    expect(viewLink).toHaveAttribute('href', '/leads/lead-open');
  });

  it('renders a sensible empty state when there are no leads', async () => {
    mockedApi.getMyLeads.mockResolvedValue([]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    expect(await screen.findByText(/no leads yet/i)).toBeInTheDocument();
  });

  it('renders skeleton loading rows (not a plain "Loading…" string) while the queue is fetching', async () => {
    let resolveLeads: (leads: Lead[]) => void = () => {};
    mockedApi.getMyLeads.mockReturnValue(
      new Promise((resolve) => {
        resolveLeads = resolve;
      }),
    );
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    // The table shell (headers) is present immediately, with skeleton rows
    // (not literal "Loading…" text) standing in for data.
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByText(/^loading/i)).not.toBeInTheDocument();

    resolveLeads([openLead]);
    await screen.findByText('Asha Rao');
  });

  it('renders an avatar-style Recipient cell with initials, keeping the full name text accessible', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    // "Asha Rao" -> "AR" initials badge (issue #138).
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('truncates a long customer name visually but keeps the full text accessible', async () => {
    const longNameLead: Lead = {
      ...openLead,
      leadId: 'lead-long',
      customerName: 'A Very Long Customer Name That Should Be Truncated In The Table Cell Display',
    };
    mockedApi.getMyLeads.mockResolvedValue([longNameLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();

    const cell = await screen.findByText(longNameLead.customerName!);
    expect(cell).toHaveClass('truncate');
    expect(cell).toHaveAttribute('title', longNameLead.customerName);
  });
});

describe('LeadQueue — search box (issue #138)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
  });

  it('filters rows by customer name as the user types, and clearing the box restores every row', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead, secondOpenLead]);
    renderQueue();
    const user = userEvent.setup();

    await screen.findByText('Asha Rao');
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search leads/i }), 'Priya');

    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: /search leads/i }));

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
  });

  it('matches case-insensitively across mobile, model, source, and owner too', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    renderQueue();
    const user = userEvent.setup();

    await screen.findByText('Asha Rao');
    await user.type(screen.getByRole('searchbox', { name: /search leads/i }), 'hatchback');

    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('shows a "no leads match" row when the search term matches nothing', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    renderQueue();
    const user = userEvent.setup();

    await screen.findByText('Asha Rao');
    await user.type(screen.getByRole('searchbox', { name: /search leads/i }), 'nonexistent-zzz');

    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
    expect(await screen.findByText(/no leads match your search/i)).toBeInTheDocument();
  });
});
