/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #26. Component tests
 * for NewEnquiryForm (AC1/AC2/AC3), with useLeadSources/useVehicleModels and
 * the api client mocked — mirrors NewLeadForm/ConvertLeadForm's test
 * conventions (the real HTTP path is proven by the backend Supertest suite).
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

describe('NewEnquiryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue([{ sourceId: 1, name: 'Walk-in' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
    mockedApi.checkDuplicates.mockResolvedValue([]);
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
      mockedApi.createDirectEnquiry.mockResolvedValue({
        enquiryId: 'enq-optional-name',
        leadId: null,
        entryType: 'DIRECT',
        customerName: null,
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

      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.type(screen.getByLabelText(/budget/i), '300000');
      await user.type(screen.getByLabelText(/variant/i), 'LX');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
      expect(screen.queryByText(/customer name.*required|required.*customer name/i)).not.toBeInTheDocument();
      expect(mockedApi.createDirectEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: undefined }),
      );
    });
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
      await user.type(screen.getByLabelText(/variant/i), 'LX');
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
      mockedApi.createDirectEnquiry.mockResolvedValue({
        enquiryId: 'enq-duplicate-proceed',
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

    async function fillValidForm(user: ReturnType<typeof userEvent.setup>, customerName: string) {
      await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
      await user.type(screen.getByLabelText(/customer name/i), customerName);
      await user.type(screen.getByLabelText(/mobile/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/source/i), '1');
      await user.selectOptions(screen.getByLabelText(/model/i), '101');
      await user.type(screen.getByLabelText(/budget/i), '300000');
      await user.type(screen.getByLabelText(/variant/i), 'LX');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'false');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'true');
    }

    it('calls onSuccess ~1.5s after a successful creation, once the success message has shown', async () => {
      mockedApi.createDirectEnquiry.mockResolvedValue({
        enquiryId: 'enq-panel-1',
        leadId: null,
        entryType: 'DIRECT',
        customerName: 'Panel Test',
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
      const onSuccess = vi.fn();
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <NewEnquiryForm onSuccess={onSuccess} />
        </QueryClientProvider>,
      );

      await fillValidForm(user, 'Panel Test');
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
      mockedApi.createDirectEnquiry.mockResolvedValue({
        enquiryId: 'enq-standalone-1',
        leadId: null,
        entryType: 'DIRECT',
        customerName: 'No Panel',
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
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      renderForm();

      await fillValidForm(user, 'No Panel');
      await user.click(screen.getByRole('button', { name: /submit|create|save/i }));

      expect(await screen.findByText(/enquiry created/i)).toBeInTheDocument();
      // No onSuccess prop was passed, so NewEnquiryForm never schedules the
      // SUCCESS_AUTO_CLOSE_MS timer at all — nothing was captured.
      expect(getCapturedCallback()).toBeNull();

      spy.mockRestore();
    });
  });
});
