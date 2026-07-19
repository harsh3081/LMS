/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #134 rewrite of the
 * original 8-field, single-column NewEnquiryForm.spec.tsx (issue #26).
 * Component tests for the new 8-section sectioned form: section/nav
 * rendering, the EDITABLE Section 0 "Customer Details" (including the new
 * Source placement), the unchanged required-ness of the config-driven 4
 * fields + the 4 statically-required qualifying fields (AC3), optional-field
 * submission mapping (AC4/AC5), duplicate-mobile warning (issue #29),
 * config-driven mandatory fields (issue #27), and onSuccess auto-close
 * (issue #130) — with the api client mocked (the real HTTP path is proven
 * by the backend Supertest suite). Mirrors ConvertLeadForm.spec.tsx's test
 * shape closely for the sectioned-form coverage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewEnquiryForm, SUCCESS_AUTO_CLOSE_MS } from '../../src/components/NewEnquiryForm';
import { api, ApiError, DuplicateMatch } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      getConsultants: vi.fn(),
      createDirectEnquiry: vi.fn(),
      getFieldConfig: vi.fn(),
      // issue #29 (AC1/AC5) — mirrors NewLeadForm.spec.tsx's mock exactly.
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

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewEnquiryForm />
    </QueryClientProvider>,
  );
}

/** Mirrors ConvertLeadForm.spec.tsx's identical helper (issue #132) —
 * deterministic control over NewEnquiryForm's own SUCCESS_AUTO_CLOSE_MS
 * onSuccess timer, no real wall-clock wait. */
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

function successResponse(overrides: Record<string, unknown> = {}) {
  return {
    enquiryId: 'enq-direct-1',
    leadId: null,
    entryType: 'DIRECT' as const,
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
    ...overrides,
  };
}

async function fillMandatoryFields(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
  await user.type(screen.getByLabelText(/customer name/i), 'Walk-in Customer');
  await user.type(screen.getByLabelText(/mobile/i), '9876543210');
  await user.selectOptions(screen.getByLabelText(/source/i), '1');
  await user.selectOptions(screen.getByLabelText(/model/i), '101');
  await user.type(screen.getByLabelText(/budget/i), '300000');
  await user.type(screen.getByLabelText(/^variant$/i), 'LX');
  await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
  await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
}

describe('NewEnquiryForm (issue #134 sectioned rewrite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.getConsultants.mockResolvedValue([{ userId: 'consultant-1', displayName: 'DSE One' }]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
  });

  it('AC1: renders all 8 sections in the side nav', async () => {
    renderForm();
    for (const label of [
      'Customer Details',
      'Vehicle Information',
      'Qualification',
      'Commercial',
      'Finance',
      'Exchange Evaluation',
      'Test Drive & Engagement',
      'Document Checklist',
    ]) {
      expect(await screen.findAllByText(label)).not.toHaveLength(0);
    }
  });

  it('AC1: Section 0 (Customer Details) is EDITABLE — Full Name/Email/Customer Type/Mobile/City/Pin Code/Preferred Language/Source all render as inputs, not read-only text', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred language/i)).toBeInTheDocument();
    // Source is grouped into Customer Details for a Direct Enquiry (no Lead
    // already captured it, unlike Convert-to-Enquiry) — see NOTES.md.
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  it('AC1: Section 1 (Vehicle Information) renders Model of Interest plus the qualifying fields', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

    expect(screen.getByLabelText(/model of interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^variant$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fuel type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^transmission$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exchange interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/finance interest/i)).toBeInTheDocument();
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

  it('AC1/AC2: submitting only the mandatory fields calls createDirectEnquiry and shows success — every new field is optional', async () => {
    mockedApi.createDirectEnquiry.mockResolvedValue(successResponse());

    renderForm();
    const user = userEvent.setup();
    await fillMandatoryFields(user);
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

  it('AC3 client: rejects an invalid pin code', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/pin code/i), '12');
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/valid 6-digit india pin code/i)).toBeInTheDocument();
    expect(mockedApi.createDirectEnquiry).not.toHaveBeenCalled();
  });

  it('AC3: maps a server 400 field error onto the matching form field', async () => {
    mockedApi.createDirectEnquiry.mockRejectedValue(
      new ApiError(400, [{ field: 'budget', message: 'budget must be a positive integer' }], 'Bad request'),
    );

    renderForm();
    const user = userEvent.setup();
    await fillMandatoryFields(user);
    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    expect(await screen.findByText(/budget must be a positive integer/i)).toBeInTheDocument();
  });

  it('AC5: a fully populated submission maps Customer Details + every section field into the CreateDirectEnquiryInput payload', async () => {
    // This test fills ~23 fields sequentially via userEvent (realistic
    // keystroke/change simulation) — comfortably under vitest's default
    // 5000ms test timeout in isolation, but can exceed it under full-suite
    // parallel CPU contention; an explicit longer timeout keeps it robust
    // regardless of machine load, mirroring how heavy multi-field tests are
    // handled elsewhere (e.g. NewLeadForm.spec.tsx's own ~20-field test).
    mockedApi.createDirectEnquiry.mockResolvedValue(successResponse());

    renderForm();
    const user = userEvent.setup();
    await fillMandatoryFields(user);

    await user.type(screen.getByLabelText(/^email$/i), 'asha.rao@example.com');
    await user.selectOptions(screen.getByLabelText(/customer type/i), 'Individual');
    await user.type(screen.getByLabelText(/^city$/i), 'Pune');
    await user.type(screen.getByLabelText(/pin code/i), '411001');
    await user.selectOptions(screen.getByLabelText(/preferred language/i), 'Hindi');

    await user.selectOptions(screen.getByLabelText(/fuel type/i), 'Petrol');
    await user.selectOptions(screen.getByLabelText(/^transmission$/i), 'Manual');

    await user.selectOptions(screen.getByLabelText(/contact verified/i), 'OTP Verified');
    await user.selectOptions(screen.getByLabelText(/intent rating/i), 'Hot');

    await user.type(screen.getByLabelText(/quotation number/i), 'QT-1001');
    await user.selectOptions(screen.getByLabelText(/insurance preference/i), 'Dealer In-house');

    await user.selectOptions(screen.getByLabelText(/financier/i), 'HDFC Bank');

    await user.selectOptions(screen.getByLabelText(/evaluation status/i), 'Completed');

    await user.selectOptions(screen.getByLabelText(/test drive status/i), 'Scheduled');
    await user.selectOptions(screen.getByLabelText(/next action owner/i), 'consultant-1');

    await user.click(screen.getByLabelText(/pan card verified/i));

    await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

    await waitFor(() => expect(mockedApi.createDirectEnquiry).toHaveBeenCalled());
    const [input] = mockedApi.createDirectEnquiry.mock.calls[0];
    expect(input.email).toBe('asha.rao@example.com');
    expect(input.customerType).toBe('Individual');
    expect(input.city).toBe('Pune');
    expect(input.pinCode).toBe('411001');
    expect(input.preferredLanguage).toBe('Hindi');
    expect(input.fuelType).toBe('Petrol');
    expect(input.transmission).toBe('Manual');
    expect(input.contactVerified).toBe('OTP Verified');
    expect(input.intentRating).toBe('Hot');
    expect(input.quotationNumber).toBe('QT-1001');
    expect(input.insurancePreference).toBe('Dealer In-house');
    expect(input.financier).toBe('HDFC Bank');
    expect(input.exchangeEvaluationStatus).toBe('Completed');
    expect(input.testDriveStatus).toBe('Scheduled');
    expect(input.nextActionOwnerId).toBe('consultant-1');
    expect(input.panCardVerified).toBe(true);
  }, 15000);

  it('reuses useConsultants() for the Next Action Owner dropdown', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    expect(await screen.findByRole('option', { name: 'DSE One' })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------
  // ADDED (issue #27, FR-04) — mandatory-ness of the Lead-equivalent fields
  // is config-driven (AC3), mirrors NewLeadForm.spec.tsx exactly.
  // -----------------------------------------------------------------
  describe('config-driven mandatory fields (issue #27)', () => {
    it('AC3: does not show a required error for customerName when configured optional, and submits without it', async () => {
      mockedApi.getFieldConfig.mockResolvedValue([
        { fieldName: 'customerName', label: 'Customer Name', mandatory: false, updatedBy: null, updatedAt: null },
        { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'sourceId', label: 'Source', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
      ]);
      mockedApi.createDirectEnquiry.mockResolvedValue(successResponse({ enquiryId: 'enq-optional-name', customerName: null }));

      renderForm();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.type(screen.getByLabelText(/budget/i), '300000');
      await user.type(screen.getByLabelText(/^variant$/i), 'LX');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      // Widened findByText timeout (default 1000ms) — this test fills 7
      // fields sequentially before submitting, which can push the final
      // assertion past the default under full-suite parallel CPU
      // contention; the extra headroom keeps it robust without weakening
      // the assertion itself.
      expect(await screen.findByText(/enquiry created/i, {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.queryByText(/customer name.*required|required.*customer name/i)).not.toBeInTheDocument();
      expect(mockedApi.createDirectEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: undefined }),
      );
    }, 10000);
  });

  // -----------------------------------------------------------------
  // ADDED (issue #29, FR-06) — duplicate-mobile real-time warning, mirrors
  // NewLeadForm.spec.tsx's equivalent block exactly.
  // -----------------------------------------------------------------
  describe('duplicate-mobile warning (issue #29)', () => {
    const oneMatch: DuplicateMatch[] = [
      { id: 'enquiry-existing-1', type: 'ENQUIRY', label: 'Existing Walk-in', status: 'New' },
    ];

    async function fillValidFormExceptMobile(user: ReturnType<typeof userEvent.setup>) {
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/customer name/i), 'Walk-in Customer');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.type(screen.getByLabelText(/budget/i), '300000');
      await user.type(screen.getByLabelText(/^variant$/i), 'LX');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
    }

    it('AC2: shows a warning listing the matching record(s) when a duplicate is found', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      renderForm();
      const user = userEvent.setup();
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());

      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();

      expect(await screen.findByTestId('duplicate-warning')).toBeInTheDocument();
      expect(screen.getByText(/existing walk-in/i)).toBeInTheDocument();
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

      expect(mockedApi.createDirectEnquiry).not.toHaveBeenCalled();
    });

    it('AC3: "Proceed anyway" creates the Enquiry with acknowledgeDuplicate: true', async () => {
      mockedApi.checkDuplicates.mockResolvedValue(oneMatch);
      mockedApi.createDirectEnquiry.mockResolvedValue(successResponse({ enquiryId: 'enq-duplicate-proceed' }));

      renderForm();
      const user = userEvent.setup();
      await fillValidFormExceptMobile(user);
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.tab();
      await screen.findByTestId('duplicate-warning');

      await user.click(screen.getByRole('button', { name: /proceed anyway/i }));

      expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
      expect(mockedApi.createDirectEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({ mobile: '9876543210', acknowledgeDuplicate: true }),
      );
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
      expect(mockedApi.createDirectEnquiry).not.toHaveBeenCalled();
    });
  });

  /**
   * RED->GREEN — issue #130 (mirrors NewLeadForm.spec.tsx's "onSuccess
   * auto-close" block, issue #118, exactly): optional `onSuccess` prop, used
   * by the new Enquiry Management slide-over panel to auto-close itself
   * shortly after a successful creation. Same targeted `window.setTimeout`
   * spy approach as NewLeadForm.spec.tsx — deterministic control over the
   * SUCCESS_AUTO_CLOSE_MS auto-close timer, no real wall-clock wait.
   */
  describe('onSuccess auto-close (issue #130)', () => {
    it('calls onSuccess ~1.5s after a successful creation, once the success message has shown', async () => {
      mockedApi.createDirectEnquiry.mockResolvedValue(successResponse({ enquiryId: 'enq-panel-1', customerName: 'Panel Test' }));
      const onSuccess = vi.fn();
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <NewEnquiryForm onSuccess={onSuccess} />
        </QueryClientProvider>,
      );

      await fillMandatoryFields(user);
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      const capturedCallback = getCapturedCallback();
      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(onSuccess).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('does not call onSuccess when the prop is omitted (standalone usage unchanged)', async () => {
      mockedApi.createDirectEnquiry.mockResolvedValue(successResponse({ enquiryId: 'enq-standalone-1', customerName: 'No Panel' }));
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      renderForm();

      await fillMandatoryFields(user);
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
      // No onSuccess prop was passed, so NewEnquiryForm never schedules the
      // SUCCESS_AUTO_CLOSE_MS timer at all — nothing was captured.
      expect(getCapturedCallback()).toBeNull();

      spy.mockRestore();
    });
  });
});
