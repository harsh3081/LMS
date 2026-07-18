/**
 * RED->GREEN — issue #124, AC1. ConvertLeadPage reads :leadId from the route
 * and renders the full ConvertLeadForm inside the AppShell + Card page-shell
 * (mirrors NewLeadPage/LeadDetailPage's convention), with a page header and
 * a "Back to Leads" link. Mirrors LeadDetailPage.spec.tsx's MemoryRouter +
 * routed-param convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ConvertLeadPage } from '../../src/pages/ConvertLeadPage';
import { api } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getLead: vi.fn(),
      getVehicleModels: vi.fn(),
      getConsultants: vi.fn(),
      convertLead: vi.fn(),
    },
  };
});
const mockedApi = vi.mocked(api, true);

const fullLead: Lead = {
  leadId: 'lead-1',
  customerName: 'Asha Rao',
  mobile: '9876543210',
  sourceId: 1,
  modelId: 101,
  status: 'New',
  ownerId: 'owner-1',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
  variant: 'LX',
};

function renderPage(leadId = 'lead-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/leads/${leadId}/convert`]}>
        <Routes>
          <Route path="/" element={<div>Dashboard</div>} />
          <Route path="/leads/:leadId/convert" element={<ConvertLeadPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConvertLeadPage (issue #124, AC1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getLead.mockResolvedValue(fullLead);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getConsultants.mockResolvedValue([]);
  });

  it('renders a page header and the sectioned ConvertLeadForm', async () => {
    renderPage('lead-1');
    expect(screen.getByRole('heading', { name: /convert to enquiry/i })).toBeInTheDocument();
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(mockedApi.getLead).toHaveBeenCalledWith('lead-1');
  });

  it('renders a "Back to Leads" link to the dashboard', async () => {
    renderPage('lead-1');
    await screen.findByText('Asha Rao');
    const backLink = screen.getByRole('link', { name: /back to leads/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('navigates back to the dashboard after a successful conversion', async () => {
    mockedApi.convertLead.mockResolvedValue({
      enquiryId: 'enq-1',
      leadId: 'lead-1',
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

    renderPage('lead-1');
    const user = userEvent.setup();
    await screen.findByText('Asha Rao');

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

    await waitFor(() => expect(mockedApi.convertLead).toHaveBeenCalled());
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });
});
