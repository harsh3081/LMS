/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Task 4.5.1 (issue #25).
 * The per-row "Convert to Enquiry" action renders only for non-Converted
 * rows and only when convertLeadEnabled; on success the row leaves the
 * displayed queue (AC1, AC5, CC-11).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  modelId: 101,
  status: 'New',
  ownerId: 'owner-1',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
};

const convertedLead: Lead = {
  leadId: 'lead-converted',
  customerName: 'Rohan Iyer',
  mobile: '9876543211',
  sourceId: 1,
  modelId: 101,
  status: 'Converted',
  ownerId: 'owner-1',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
};

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LeadQueue />
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
