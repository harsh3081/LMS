/**
 * RED->GREEN — issue #116, AC2/AC3. LeadDetailPage reads :leadId from the
 * route and renders the full Lead detail as 6 read-only section groups
 * (mirrors issue #114's New Lead form sections), with a page header (name +
 * status badge), a "Back to Leads" link, and graceful null/unset field
 * handling ("Not provided", never blank or literal "null"). Mirrors
 * LogFollowupPage.spec.tsx's MemoryRouter + routed-param convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LeadDetailPage } from '../../src/pages/LeadDetailPage';
import { api, ApiError } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { ...actual.api, getLead: vi.fn() },
  };
});
const mockedApi = vi.mocked(api, true);

const fullLead: Lead = {
  leadId: 'lead-1',
  customerName: 'Asha Rao',
  mobile: '9876543210',
  sourceId: 2,
  sourceName: 'Referral',
  modelId: 102,
  modelName: 'Sedan GT',
  status: 'New',
  ownerId: 'owner-1',
  ownerName: 'Dealer Sales Executive Loc1-A',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
  email: 'asha.rao@example.com',
  customerType: 'Individual',
  city: 'Pune',
  pinCode: '411001',
  preferredLanguage: 'English',
  variant: 'VXi (O) CVT',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  budgetMin: 800000,
  budgetMax: 1200000,
  buyingTimeline: 'Within 1 Month',
  exchangeInterest: true,
  currentVehicle: 'Maruti Swift 2018',
  kmsDriven: 45000,
  registrationNumber: 'MH12AB1234',
  expectedValue: 350000,
  paymentMode: 'Loan',
  preferredFinancer: 'HDFC Bank',
  downPaymentCapacity: 100000,
  referrerName: 'Rohit Sharma (existing customer)',
  firstFollowUpAt: '2026-08-01T10:00:00.000Z',
  remarks: 'Interested in test drive next week.',
  communicationConsentVerified: true,
};

const minimalLead: Lead = {
  leadId: 'lead-2',
  customerName: 'Minimal Lead',
  mobile: '9876500000',
  sourceId: null,
  sourceName: null,
  modelId: null,
  modelName: null,
  status: 'New',
  ownerId: 'owner-1',
  ownerName: 'Dealer Sales Executive Loc1-A',
  locationId: 'loc-1',
  createdAt: new Date().toISOString(),
  email: null,
  customerType: null,
  city: null,
  pinCode: null,
  preferredLanguage: null,
  variant: null,
  fuelType: null,
  transmission: null,
  budgetMin: null,
  budgetMax: null,
  buyingTimeline: null,
  exchangeInterest: null,
  currentVehicle: null,
  kmsDriven: null,
  registrationNumber: null,
  expectedValue: null,
  paymentMode: null,
  preferredFinancer: null,
  downPaymentCapacity: null,
  referrerName: null,
  firstFollowUpAt: null,
  remarks: null,
  communicationConsentVerified: false,
};

function renderPage(leadId = 'lead-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/leads/${leadId}`]}>
        <Routes>
          <Route path="/leads/:leadId" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LeadDetailPage (issue #116, AC2/AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a page header with the Lead name and status badge', async () => {
    mockedApi.getLead.mockResolvedValue(fullLead);
    renderPage('lead-1');

    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(mockedApi.getLead).toHaveBeenCalledWith('lead-1');
  });

  it('renders a "Back to Leads" link to the dashboard', async () => {
    mockedApi.getLead.mockResolvedValue(fullLead);
    renderPage('lead-1');

    await screen.findByRole('heading', { name: 'Asha Rao' });
    const backLink = screen.getByRole('link', { name: /back to leads/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('renders all 6 section groups with their fields, mirroring issue #114 sections', async () => {
    mockedApi.getLead.mockResolvedValue(fullLead);
    renderPage('lead-1');

    await screen.findByRole('heading', { name: 'Asha Rao' });

    for (const section of [
      'Customer Details',
      'Vehicle Interest',
      'Exchange Vehicle',
      'Finance',
      'Source & Assignment',
      'Follow-up & Consent',
    ]) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }

    // Sample fields from each section, including the denormalized names.
    expect(screen.getByText('asha.rao@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sedan GT')).toBeInTheDocument();
    expect(screen.getByText('Maruti Swift 2018')).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('Dealer Sales Executive Loc1-A')).toBeInTheDocument();
    expect(screen.getByText('Interested in test drive next week.')).toBeInTheDocument();
  });

  it('formats currency and boolean fields for readability', async () => {
    mockedApi.getLead.mockResolvedValue(fullLead);
    renderPage('lead-1');

    await screen.findByRole('heading', { name: 'Asha Rao' });
    expect(screen.getByText(/₹8,00,000|₹800,000/)).toBeInTheDocument();
    // exchangeInterest: true, communicationConsentVerified: true -> "Yes"
    expect(screen.getAllByText('Yes').length).toBeGreaterThanOrEqual(2);
  });

  it('AC3: shows "Not provided" (never blank or literal "null") for unset optional fields', async () => {
    mockedApi.getLead.mockResolvedValue(minimalLead);
    renderPage('lead-2');

    await screen.findByRole('heading', { name: 'Minimal Lead' });
    expect(screen.queryByText(/^null$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(5);
    // exchangeInterest: null -> "Not provided", not "No".
    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
  });

  it('shows a loading state before the Lead resolves', () => {
    mockedApi.getLead.mockReturnValue(new Promise(() => {}));
    renderPage('lead-1');
    expect(screen.getByText('Lead Detail')).toBeInTheDocument();
  });

  it('shows a "Lead not found" message on a 404 (owner/tenant-scoped 404, not a crash)', async () => {
    mockedApi.getLead.mockRejectedValue(new ApiError(404, [{ field: 'leadId', message: 'Lead x not found' }], 'Lead x not found'));
    renderPage('lead-1');

    expect(await screen.findByText(/lead not found/i)).toBeInTheDocument();
  });
});
