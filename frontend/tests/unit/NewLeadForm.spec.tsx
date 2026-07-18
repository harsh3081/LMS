/**
 * RED->GREEN (Inside-Out, Presentation Layer) — Tasks 5.2 / 5.3 / 5.4.
 * Component tests mirroring the frozen Playwright tests/new-lead-form.spec.ts
 * assertions (AC1, AC2, AC4, AC5, AC6), with the api client mocked (the real
 * HTTP path is proven by the backend Supertest suite + the Playwright E2E
 * run against the live app).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewLeadForm, SUCCESS_AUTO_CLOSE_MS } from '../../src/components/NewLeadForm';
import { api, ApiError, DuplicateMatch } from '../../src/api/client';

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
      // issue #29 (AC1/AC5): defaults to "no duplicates" so every
      // pre-existing test's mobile blur is a no-op unless a test overrides it.
      checkDuplicates: vi.fn(),
      // issue #114 (AC5): backs the "Assign to Consultant" dropdown.
      getConsultants: vi.fn(),
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
    mockedApi.checkDuplicates.mockResolvedValue([]);
    mockedApi.getConsultants.mockResolvedValue([]);
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
    await user.click(screen.getByLabelText(/customer consents/i));
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
    expect(mockedApi.createLead).toHaveBeenCalledWith({
      customerName: 'Asha Rao',
      mobile: '9876543210',
      sourceId: 1,
      modelId: 101,
      communicationConsentVerified: true,
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
    await user.click(screen.getByLabelText(/customer consents/i));
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
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(screen.queryByText(/source.*required|required.*source/i)).not.toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith({
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: undefined,
        modelId: 101,
        communicationConsentVerified: true,
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

  // -----------------------------------------------------------------
  // ADDED (issue #29, FR-06) — duplicate-mobile real-time warning (AC1/AC2/
  // AC3/AC5). The real HTTP path (GET /api/v1/duplicates) is proven by the
  // backend Supertest suite (duplicates.controller.spec.ts); here only the
  // client-side wiring/gating is exercised, with api.checkDuplicates mocked.
  // -----------------------------------------------------------------
  describe('duplicate-mobile warning (issue #29)', () => {
    const oneMatch: DuplicateMatch[] = [{ id: 'lead-existing-1', type: 'LEAD', label: 'Existing Customer', status: 'New' }];

    async function fillValidFormExceptMobile(user: ReturnType<typeof userEvent.setup>) {
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByLabelText(/customer consents/i));
    }

    it('AC1/AC5: checks for duplicates on blur of a validly formatted mobile number', async () => {
      mockedApi.checkDuplicates.mockResolvedValue([]);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();

      await waitFor(() => expect(mockedApi.checkDuplicates).toHaveBeenCalledWith('9876543210'));
    });

    it('does not check for duplicates on blur of an invalid/incomplete mobile number', async () => {
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/mobile/i), '987');
      await user.tab();

      expect(mockedApi.checkDuplicates).not.toHaveBeenCalled();
    });

    it('AC2: shows a warning listing the matching record(s) when a duplicate is found', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();

      expect(await screen.findByTestId('duplicate-warning')).toBeInTheDocument();
      expect(screen.getByText(/existing customer/i)).toBeInTheDocument();
    });

    it('AC3: blocks submission while the warning is showing and unacknowledged', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      renderForm();
      const user = userEvent.setup();
      await fillValidFormExceptMobile(user);
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();
      await screen.findByTestId('duplicate-warning');

      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });

    it('AC3: "Cancel" dismisses the warning without submitting', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();
      await screen.findByTestId('duplicate-warning');

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByTestId('duplicate-warning')).not.toBeInTheDocument();
      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });

    it('AC3: "Proceed anyway" creates the Lead with acknowledgeDuplicate: true', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-duplicate-proceed',
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
      await fillValidFormExceptMobile(user);
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();
      await screen.findByTestId('duplicate-warning');

      await user.click(screen.getByRole('button', { name: /proceed anyway/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ mobile: '9876543210', acknowledgeDuplicate: true }),
      );
    });

    it('re-checks and clears a stale warning when the mobile number is edited', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();
      await screen.findByTestId('duplicate-warning');

      await user.clear(screen.getByLabelText(/mobile/i));
      await user.type(screen.getByLabelText(/mobile/i), '1');

      expect(screen.queryByTestId('duplicate-warning')).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------
  // ADDED (issue #114) — 6-section redesign: new fields, closed-set
  // dropdowns, the consent compliance gate, conditional referrer-name
  // display, and the "Assign to Consultant" dropdown.
  // -----------------------------------------------------------------
  describe('customer-details redesign (issue #114)', () => {
    async function fillMandatoryFields(user: ReturnType<typeof userEvent.setup>) {
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/^source$/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
    }

    it('AC1: renders all 6 section headings', async () => {
      renderForm();
      expect(screen.getByRole('heading', { name: 'Customer Details' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Vehicle Interest' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Exchange Vehicle' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Finance' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Source & Assignment' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Follow-up & Consent' })).toBeInTheDocument();
    });

    it('AC1: renders the side-panel section nav with a link per section', () => {
      renderForm();
      expect(screen.getByRole('navigation', { name: /form sections/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Customer Details' })).toHaveAttribute(
        'href',
        '#section-customer-details',
      );
      expect(screen.getByRole('link', { name: 'Follow-up & Consent' })).toHaveAttribute(
        'href',
        '#section-followup-consent',
      );
    });

    it('AC1: renders every new field from the 6 sections', () => {
      renderForm();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preferred language/i)).toBeInTheDocument();

      expect(screen.getByLabelText(/^variant$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fuel type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/transmission/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget min/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget max/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/buying timeline/i)).toBeInTheDocument();

      expect(screen.getByLabelText(/customer has a vehicle to exchange/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current vehicle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kms driven/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/registration number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expected value/i)).toBeInTheDocument();

      expect(screen.getByLabelText(/payment mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preferred financer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/down payment capacity/i)).toBeInTheDocument();

      expect(screen.getByLabelText(/assign to consultant/i)).toBeInTheDocument();

      expect(screen.getByLabelText(/first follow-up date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^remarks$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/customer consents/i)).toBeInTheDocument();
    });

    it('AC4: closed-set dropdowns render only their fixed option set (customerType example)', () => {
      renderForm();
      const select = screen.getByLabelText(/customer type/i) as HTMLSelectElement;
      const optionLabels = Array.from(select.options).map((o) => o.textContent);
      expect(optionLabels).toEqual(['Select a customer type', 'Individual', 'Corporate', 'Government', 'Fleet']);
      expect(select.tagName).toBe('SELECT');
    });

    it('AC2: consent checkbox is unchecked by default', () => {
      renderForm();
      expect(screen.getByLabelText(/customer consents/i)).not.toBeChecked();
    });

    it('AC2: submit is blocked client-side while consent is unchecked, even with all other fields valid', async () => {
      renderForm();
      const user = userEvent.setup();
      await fillMandatoryFields(user);
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/consent must be confirmed/i)).toBeInTheDocument();
      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });

    it('AC2: checking consent unblocks submission and all other new fields default to omitted', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-114-minimal',
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
      await fillMandatoryFields(user);
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith({
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        communicationConsentVerified: true,
      });
    });

    it('AC2/AC4: submits with every new field populated, mapped onto the CreateLeadInput contract', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-114-full',
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
      await fillMandatoryFields(user);

      await user.type(screen.getByLabelText(/^email$/i), 'asha.rao@example.com');
      await user.selectOptions(screen.getByLabelText(/customer type/i), 'Individual');
      await user.type(screen.getByLabelText(/^city$/i), 'Pune');
      await user.type(screen.getByLabelText(/pin code/i), '411001');
      await user.selectOptions(screen.getByLabelText(/preferred language/i), 'Hindi');

      await user.type(screen.getByLabelText(/^variant$/i), 'VXi (O) CVT');
      await user.selectOptions(screen.getByLabelText(/fuel type/i), 'Petrol');
      await user.selectOptions(screen.getByLabelText(/transmission/i), 'Manual');
      await user.type(screen.getByLabelText(/budget min/i), '800000');
      await user.type(screen.getByLabelText(/budget max/i), '1200000');
      await user.selectOptions(screen.getByLabelText(/buying timeline/i), 'Immediate');

      await user.click(screen.getByLabelText(/customer has a vehicle to exchange/i));
      await user.type(screen.getByLabelText(/current vehicle/i), 'Maruti Swift 2018');
      await user.type(screen.getByLabelText(/kms driven/i), '45000');
      await user.type(screen.getByLabelText(/registration number/i), 'MH12AB1234');
      await user.type(screen.getByLabelText(/expected value/i), '350000');

      await user.selectOptions(screen.getByLabelText(/payment mode/i), 'Loan');
      await user.type(screen.getByLabelText(/preferred financer/i), 'HDFC Bank');
      await user.type(screen.getByLabelText(/down payment capacity/i), '100000');

      await user.type(screen.getByLabelText(/^remarks$/i), 'Interested in a test drive.');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'asha.rao@example.com',
          customerType: 'Individual',
          city: 'Pune',
          pinCode: '411001',
          preferredLanguage: 'Hindi',
          variant: 'VXi (O) CVT',
          fuelType: 'Petrol',
          transmission: 'Manual',
          budgetMin: 800000,
          budgetMax: 1200000,
          buyingTimeline: 'Immediate',
          exchangeInterest: true,
          currentVehicle: 'Maruti Swift 2018',
          kmsDriven: 45000,
          registrationNumber: 'MH12AB1234',
          expectedValue: 350000,
          paymentMode: 'Loan',
          preferredFinancer: 'HDFC Bank',
          downPaymentCapacity: 100000,
          remarks: 'Interested in a test drive.',
          communicationConsentVerified: true,
        }),
      );
    });

    it('AC3: shows an inline error for an invalid pin code and blocks submission', async () => {
      renderForm();
      const user = userEvent.setup();
      await fillMandatoryFields(user);
      await user.type(screen.getByLabelText(/pin code/i), '00000');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/valid.*pin code|pin code.*valid/i)).toBeInTheDocument();
      expect(mockedApi.createLead).not.toHaveBeenCalled();
    });

    it('AC2: referrerName field is hidden until Source = Referral is selected', async () => {
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      expect(screen.queryByLabelText(/referrer name/i)).not.toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^source$/i), '2'); // Referral
      expect(screen.getByLabelText(/referrer name/i)).toBeInTheDocument();

      await user.selectOptions(screen.getByLabelText(/^source$/i), '1'); // Walk-in
      expect(screen.queryByLabelText(/referrer name/i)).not.toBeInTheDocument();
    });

    it('AC5: "Assign to Consultant" dropdown populates from GET /api/v1/consultants and defaults to self-assignment', async () => {
      mockedApi.getConsultants.mockResolvedValue([
        { userId: 'dse-b', displayName: 'Dealer Sales Executive Loc1-B' },
      ]);
      renderForm();

      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Dealer Sales Executive Loc1-B' })).toBeInTheDocument(),
      );
      expect(screen.getByRole('option', { name: /assign to myself/i })).toBeInTheDocument();
    });

    it('AC5: submitting with a consultant selected sends assignedOwnerId', async () => {
      mockedApi.getConsultants.mockResolvedValue([
        { userId: 'dse-b', displayName: 'Dealer Sales Executive Loc1-B' },
      ]);
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-114-assigned',
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        status: 'New',
        ownerId: 'dse-b',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });

      renderForm();
      const user = userEvent.setup();
      await fillMandatoryFields(user);
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Dealer Sales Executive Loc1-B' })).toBeInTheDocument(),
      );
      await user.selectOptions(screen.getByLabelText(/assign to consultant/i), 'dse-b');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(mockedApi.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ assignedOwnerId: 'dse-b' }),
      );
    });
  });

  /**
   * RED->GREEN — issue #118 (AC4): optional `onSuccess` prop, used by the
   * New Lead slide-over panel (LandingPage) to auto-close itself shortly
   * after a successful creation. `vi.useFakeTimers()` (the approach used
   * elsewhere in this suite, e.g. useSchedulerSlots.spec.tsx) hangs here
   * when combined with userEvent's full form-fill + React Query's own
   * internal timer usage, so this instead spies on `window.setTimeout`
   * scoped to exactly the SUCCESS_AUTO_CLOSE_MS delay — every other
   * setTimeout call (Testing Library's own polling included) passes
   * through untouched. This keeps the assertion fully deterministic (the
   * captured callback is invoked directly, no real 1.5s wall-clock wait)
   * without destabilizing the rest of the interaction.
   */
  describe('onSuccess auto-close (issue #118, AC4)', () => {
    function spyOnSuccessAutoCloseTimer() {
      const originalSetTimeout = window.setTimeout;
      let capturedCallback: (() => void) | null = null;
      const spy = vi
        .spyOn(window, 'setTimeout')
        .mockImplementation(((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === SUCCESS_AUTO_CLOSE_MS) {
            capturedCallback = fn as () => void;
            return 0 as unknown as ReturnType<typeof setTimeout>;
          }
          return originalSetTimeout(fn as TimerHandler, delay, ...args);
        }) as typeof setTimeout);
      return {
        spy,
        getCapturedCallback: () => capturedCallback,
      };
    }

    it('calls onSuccess ~1.5s after a successful creation, once the success message has shown', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-panel-1',
        customerName: 'Panel Test',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });
      const onSuccess = vi.fn();
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <NewLeadForm onSuccess={onSuccess} />
        </QueryClientProvider>,
      );

      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'Panel Test');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      const capturedCallback = getCapturedCallback();
      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(onSuccess).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('does not call onSuccess when the prop is omitted (standalone /leads/new page behavior unchanged)', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-standalone-1',
        customerName: 'No Panel',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      renderForm();

      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/customer name/i), 'No Panel');
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/lead created|success/i)).toBeInTheDocument();
      // No onSuccess prop was passed, so NewLeadForm never schedules the
      // SUCCESS_AUTO_CLOSE_MS timer at all — nothing was captured.
      expect(getCapturedCallback()).toBeNull();

      spy.mockRestore();
    });
  });
});
