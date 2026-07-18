/**
 * RED->GREEN — Task 5.4 (original); UPDATED (issue #118, AC5): NewLeadPage
 * ("/leads/new") no longer redundantly re-displays the "My Leads" table
 * below the form — LandingPage already shows the same DSE queue, and the
 * Dashboard's own "New Lead" entry point now opens this same form in a
 * slide-over panel instead of navigating here. This route still exists for
 * direct navigation/bookmarking and still renders just the form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NewLeadPage } from '../../src/pages/NewLeadPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createLead: vi.fn(),
      getMyLeads: vi.fn(),
      getFieldConfig: vi.fn(),
      // issue #114 (AC5): backs the "Assign to Consultant" dropdown.
      getConsultants: vi.fn(),
      // issue #29 (AC1/AC5): defaults to "no duplicates" so the mobile blur is a no-op.
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewLeadPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NewLeadPage (issue #118, AC5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getMyLeads.mockResolvedValue([]);
    mockedApi.getConsultants.mockResolvedValue([]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
  });

  it('renders the New Lead form', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /new lead/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
  });

  it('AC5: does not render the "My Leads" table on this route anymore', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('My Leads')).not.toBeInTheDocument();
    // Confirms the queue was never mounted here at all, not merely hidden —
    // the read that backs LeadQueue is never even called from this page.
    expect(mockedApi.getMyLeads).not.toHaveBeenCalled();
  });

  it('EVAL-AC1-01: submitting valid data still calls createLead and shows a success message on this route', async () => {
    mockedApi.createLead.mockResolvedValue({
      leadId: 'lead-new',
      customerName: 'Queue Check 123',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
      createdAt: new Date().toISOString(),
    });

    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/customer name/i), 'Queue Check 123');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    // NEW (issue #114, AC2): communicationConsentVerified is a hard,
    // always-required compliance gate blocking submission client-side until
    // checked — unrelated to this file's own success-message assertion.
    await user.click(screen.getByLabelText(/customer consents/i));
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
    expect(mockedApi.createLead).toHaveBeenCalledTimes(1);
  });
});
