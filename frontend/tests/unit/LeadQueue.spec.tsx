/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Task 4.5.1 (issue #25).
 * The per-row "Convert to Enquiry" action renders only for non-Converted
 * rows and only when convertLeadEnabled; on success the row leaves the
 * displayed queue (AC1, AC5, CC-11).
 *
 * EXTENDED (issue #116, AC1/AC2/AC3): LeadQueue was redesigned into an
 * 8-column professional table (Name, Mobile, Model of Interest, Source,
 * Assigned To, Status, Action, View) — this file now also covers those new
 * columns (including the denormalized modelName/sourceName/ownerName), the
 * new "View" link into LeadDetailPage, and the new loading/empty states.
 * Wrapped in a MemoryRouter (mirrors EnquiryQueue.spec.tsx's convention)
 * since LeadQueue now renders a react-router `Link` for "View".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LeadQueue } from '../../src/components/LeadQueue';
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

  it('EVAL-AC1-02: clicking the action reveals the inline ConvertLeadForm for that row', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });

    renderQueue();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /convert to enquiry/i }));

    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/variant/i)).toBeInTheDocument();
  });

  it('EVAL-AC5-03: on a successful conversion, the row leaves the displayed queue (no full reload)', async () => {
    mockedApi.getMyLeads.mockResolvedValue([openLead]);
    mockedApi.getConfig.mockResolvedValue({ newLeadEnabled: true, convertLeadEnabled: true, directEnquiryEnabled: true });
    mockedApi.convertLead.mockResolvedValue({
      enquiryId: 'enq-1',
      leadId: 'lead-open',
      entryType: 'CONVERTED',
      customerName: null,
      mobile: null,
      sourceId: null,
      modelId: null,
      budget: 500000,
      variant: 'VXi (O) CVT',
      exchangeInterest: true,
      financeInterest: false,
      convertedBy: 'owner-1',
      convertedAt: new Date().toISOString(),
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
    });

    renderQueue();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /convert to enquiry/i }));

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.type(screen.getByLabelText(/variant/i), 'VXi (O) CVT');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    const submitButtons = screen.getAllByRole('button', { name: /submit|convert|save/i });
    await user.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /convert to enquiry/i })).not.toBeInTheDocument();
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
