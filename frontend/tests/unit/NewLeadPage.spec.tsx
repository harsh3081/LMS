/**
 * RED->GREEN — Task 5.4: created Lead appears in the DSE queue immediately
 * after a successful submit (AC6), without a full page reload — the cache
 * update happens via useCreateLead's onSuccess (src/hooks/useLeads.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

describe('NewLeadPage queue reflection (AC6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getMyLeads.mockResolvedValue([]);
    mockedApi.getConsultants.mockResolvedValue([]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
  });

  it('EVAL-AC6-01: created lead appears at the top of the queue without a full page reload', async () => {
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

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <NewLeadPage />
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/customer name/i), 'Queue Check 123');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    // NEW (issue #114, AC2): communicationConsentVerified is a hard,
    // always-required compliance gate blocking submission client-side until
    // checked — unrelated to this file's own queue-reflection assertion.
    await user.click(screen.getByLabelText(/customer consents/i));
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText('Queue Check 123')).toBeInTheDocument();
    // getMyLeads (the network read) is called exactly once — the initial
    // mount fetch — proving the queue update came from the mutation's cache
    // write, not a refetch/reload.
    expect(mockedApi.getMyLeads).toHaveBeenCalledTimes(1);
  });
});
