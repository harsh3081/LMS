/**
 * RED->GREEN — issue #26. A created Direct Enquiry appears in the "My
 * Enquiries" list immediately after a successful submit (AC5), without a
 * full page reload — the cache update happens via
 * useCreateDirectEnquiry's onSuccess (mirrors NewLeadPage.spec.tsx, #24).
 *
 * MODIFIED (issue #30): EnquiryQueue's rows now render a react-router
 * <Link> ("Log Follow-up", AC1-AC5's entry point) — rendering NewEnquiryPage
 * (which includes EnquiryQueue) requires a Router context now, so this file
 * wraps with <MemoryRouter>, mirroring LandingPage.spec.tsx's pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { NewEnquiryPage } from '../../src/pages/NewEnquiryPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createDirectEnquiry: vi.fn(),
      getMyEnquiries: vi.fn(),
      getFieldConfig: vi.fn(),
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

describe('NewEnquiryPage queue reflection (AC5, issue #26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getMyEnquiries.mockResolvedValue([]);
  });

  it('created Direct Enquiry appears in the list, labeled "Direct Entry", without a full page reload', async () => {
    mockedApi.createDirectEnquiry.mockResolvedValue({
      enquiryId: 'enq-new',
      leadId: null,
      entryType: 'DIRECT',
      customerName: 'Queue Check Enquiry',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      budget: 300000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: true,
      convertedBy: 'owner-1',
      convertedAt: new Date().toISOString(),
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NewEnquiryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/customer name/i), 'Queue Check Enquiry');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    await user.type(screen.getByLabelText(/budget/i), '300000');
    await user.type(screen.getByLabelText(/variant/i), 'LX');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText('Queue Check Enquiry')).toBeInTheDocument();
    expect(screen.getByText('Direct Entry')).toBeInTheDocument();
    // getMyEnquiries (the network read) is called exactly once — the initial
    // mount fetch — proving the list update came from the mutation's cache
    // write, not a refetch/reload.
    expect(mockedApi.getMyEnquiries).toHaveBeenCalledTimes(1);
  });
});
