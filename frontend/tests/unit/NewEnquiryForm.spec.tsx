/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #26. Component tests
 * for NewEnquiryForm (AC1/AC2/AC3), with useLeadSources/useVehicleModels and
 * the api client mocked — mirrors NewLeadForm/ConvertLeadForm's test
 * conventions (the real HTTP path is proven by the backend Supertest suite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewEnquiryForm } from '../../src/components/NewEnquiryForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createDirectEnquiry: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewEnquiryForm />
    </QueryClientProvider>,
  );
}

describe('NewEnquiryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
  });

  it('AC2: renders all 4 Lead-equivalent fields plus all 4 qualifying fields, and a submit control', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/variant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exchange interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/finance interest/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit|create|save/i })).toBeInTheDocument();
  });

  it('AC3: submitting entirely empty shows inline errors for every mandatory field and does not call the API', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile is required/i)).toBeInTheDocument();
    expect(screen.getByText(/source is required/i)).toBeInTheDocument();
    expect(screen.getByText(/model is required/i)).toBeInTheDocument();
    expect(screen.getByText(/budget is required/i)).toBeInTheDocument();
    expect(screen.getByText(/variant is required/i)).toBeInTheDocument();
    expect(screen.getByText(/exchange interest is required/i)).toBeInTheDocument();
    expect(screen.getByText(/finance interest is required/i)).toBeInTheDocument();
    expect(mockedApi.createDirectEnquiry).not.toHaveBeenCalled();
  });

  it('AC1/AC2: submitting valid data calls createDirectEnquiry with all 8 fields and shows success', async () => {
    mockedApi.createDirectEnquiry.mockResolvedValue({
      enquiryId: 'enq-direct-1',
      leadId: null,
      entryType: 'DIRECT',
      customerName: 'Walk-in Customer',
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

    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/customer name/i), 'Walk-in Customer');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    await user.type(screen.getByLabelText(/budget/i), '300000');
    await user.type(screen.getByLabelText(/variant/i), 'LX');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
    expect(mockedApi.createDirectEnquiry).toHaveBeenCalledWith({
      customerName: 'Walk-in Customer',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      budget: 300000,
      variant: 'LX',
      exchangeInterest: false,
      financeInterest: true,
    });
  });

  it('AC3 client: rejects an invalid mobile number', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/mobile/i), '12345');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(mockedApi.createDirectEnquiry).not.toHaveBeenCalled();
  });

  it('AC3: maps a server 400 field error onto the matching form field', async () => {
    mockedApi.createDirectEnquiry.mockRejectedValue(
      new ApiError(400, [{ field: 'budget', message: 'budget must be a positive integer' }], 'Bad request'),
    );

    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/customer name/i), 'Walk-in Customer');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    await user.type(screen.getByLabelText(/budget/i), '300000');
    await user.type(screen.getByLabelText(/variant/i), 'LX');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/budget must be a positive integer/i)).toBeInTheDocument();
  });
});
