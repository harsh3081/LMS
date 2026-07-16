/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Tasks 5.2 / 5.3 / 5.4.
 * Component tests mirroring the frozen Playwright tests/new-lead-form.spec.ts
 * assertions (AC1, AC2, AC4, AC5, AC6), with the api client mocked (the real
 * HTTP path is proven by the backend Supertest suite + the Playwright E2E
 * run against the live app).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewLeadForm } from '../../src/components/NewLeadForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createLead: vi.fn(),
      getMyLeads: vi.fn(),
      getConfig: vi.fn(),
      login: vi.fn(),
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

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewLeadForm />
    </QueryClientProvider>,
  );
}

const sources = [
  { sourceId: 1, name: 'Walk-in' },
  { sourceId: 2, name: 'Referral' },
];
const models = [
  { modelId: 101, name: 'Compact Hatchback LX' },
  { modelId: 102, name: 'Sedan GT' },
];

describe('NewLeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue(sources);
    mockedApi.getVehicleModels.mockResolvedValue(models);
  });

  it('EVAL-AC1-01: renders all 4 mandatory fields and a submit control', async () => {
    renderForm();
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit|create|save/i })).toBeInTheDocument();
  });

  it('EVAL-AC5-01/03: source and model dropdowns populate from the read paths', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Referral' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Compact Hatchback LX' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sedan GT' })).toBeInTheDocument();
  });

  it('EVAL-AC2-01..04: submitting all 4 fields empty shows inline errors and does not call createLead', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/customer name.*required|required.*customer name/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile.*required|required.*mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/source.*required|required.*source/i)).toBeInTheDocument();
    expect(screen.getByText(/model.*required|required.*model/i)).toBeInTheDocument();
    expect(mockedApi.createLead).not.toHaveBeenCalled();
  });

  const invalidMobileCases = [
    { label: '9-digit (too short)', value: '987654321' },
    { label: '11-digit (too long)', value: '98765432101' },
    { label: 'leading 0-5 disallowed', value: '5876543210' },
    { label: 'non-numeric', value: '98765abcde' },
  ];
  for (const { label, value } of invalidMobileCases) {
    it(`EVAL-AC4 client: rejects invalid mobile — ${label}`, async () => {
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.type(screen.getByLabelText(/mobile/i), value);
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/valid.*mobile|mobile.*valid|10-digit/i)).toBeInTheDocument();
      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });
  }

  it('EVAL-AC4-05: valid mobile passes client-side validation (no inline error)', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.tab();
    expect(screen.queryByText(/valid.*mobile|mobile.*valid|10-digit/i)).not.toBeInTheDocument();
  });

  it('EVAL-AC1-02: submitting valid data calls createLead and shows a success message', async () => {
    mockedApi.createLead.mockResolvedValue({
      leadId: 'lead-1',
      customerName: 'Asha Rao',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      status: 'New',
      ownerId: 'owner-1',
      locationId: 'loc-1',
      createdAt: new Date().toISOString(),
    });

    renderForm();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
    expect(mockedApi.createLead).toHaveBeenCalledWith({
      customerName: 'Asha Rao',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
    });
  });

  it('maps a server 400 field error onto the matching form field', async () => {
    mockedApi.createLead.mockRejectedValue(
      new ApiError(400, [{ field: 'mobile', message: 'mobile must be a valid India 10-digit number' }], 'Bad request'),
    );

    renderForm();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/mobile/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/source/i), '1');
    await user.selectOptions(screen.getByLabelText(/model/i), '101');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/mobile must be a valid india 10-digit number/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------
  // ADDED (issue #27, FR-04) — mandatory-ness is config-driven (AC3).
  // -----------------------------------------------------------------
  describe('config-driven mandatory fields (issue #27)', () => {
    it('AC3: does not show a required error for a field configured optional, and submits without it', async () => {
      mockedApi.getFieldConfig.mockResolvedValue([
        { fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'sourceId', label: 'Source', mandatory: false, updatedBy: null, updatedAt: null },
        { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
      ]);
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-optional-source',
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: null,
        modelId: 101,
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });

      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(screen.queryByText(/source.*required|required.*source/i)).not.toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith({
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: undefined,
        modelId: 101,
      });
    });

    it('shows a required error for sourceId when it is (re)configured mandatory', async () => {
      mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/source.*required|required.*source/i)).toBeInTheDocument();
      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });
  });
});
