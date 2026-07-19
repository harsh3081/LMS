/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #124 rewrite of the
 * original 4-field ConvertLeadForm.spec.tsx (Task 4.4.1, issue #25).
 * Component tests for the new 8-section sectioned form: section/nav
 * rendering, read-only Customer Information pre-fill (Section 0), editable
 * Vehicle Information pre-fill (Section 1), the unchanged required-ness of
 * the original 4 fields (AC3), optional-field submission mapping (AC4), and
 * server field-error mapping — with the api client mocked (the real HTTP
 * path is proven by the backend Supertest suite).
 *
 * MODIFIED (issue #132): `onConverted` no longer fires synchronously — it is
 * now scheduled via `setTimeout(SUCCESS_AUTO_CLOSE_MS)`, mirroring
 * NewLeadForm's issue #118 `onSuccess` mechanism exactly. The "AC4/AC5"
 * success test below was updated to control that timer deterministically
 * (same targeted `window.setTimeout` spy pattern as
 * NewLeadForm.spec.tsx's "onSuccess auto-close" block) instead of a bare
 * `waitFor`, and a new "onConverted auto-close" describe block was added,
 * mirroring NewLeadForm.spec.tsx's equivalent block.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvertLeadForm, SUCCESS_AUTO_CLOSE_MS } from '../../src/components/ConvertLeadForm';
import { api, ApiError } from '../../src/api/client';
import type { Lead } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      convertLead: vi.fn(),
      getLead: vi.fn(),
      getVehicleModels: vi.fn(),
      getConsultants: vi.fn(),
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
  email: 'asha@example.com',
  customerType: 'Individual',
  city: 'Pune',
  pinCode: '411001',
  preferredLanguage: 'English',
  variant: 'LX',
  fuelType: 'Petrol',
  transmission: 'Manual',
};

function renderForm(onConverted?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConvertLeadForm leadId="lead-1" onConverted={onConverted} />
    </QueryClientProvider>,
  );
}

/** issue #132 (mirrors NewLeadForm.spec.tsx's identical helper for its
 * `onSuccess` timer, issue #118): spies on `window.setTimeout` scoped to
 * exactly the SUCCESS_AUTO_CLOSE_MS delay so the pending onConverted call
 * can be captured and invoked directly — deterministic, no real 1.5s
 * wall-clock wait — while every other setTimeout call (Testing Library's
 * own polling included) passes through untouched. */
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

describe('ConvertLeadForm (issue #124 sectioned rewrite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getLead.mockResolvedValue(fullLead);
    mockedApi.getVehicleModels.mockResolvedValue([
      { modelId: 101, name: 'Compact Hatchback LX' },
      { modelId: 102, name: 'Sedan VX' },
    ]);
    mockedApi.getConsultants.mockResolvedValue([{ userId: 'consultant-1', displayName: 'DSE One' }]);
  });

  it('AC2: renders all 8 sections in the side nav', async () => {
    renderForm();
    for (const label of [
      'Customer Information',
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

  it('AC1: Section 0 (Customer Information) renders the Lead\'s data read-only, sourced from useLead', async () => {
    renderForm();
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('411001')).toBeInTheDocument();
    // Read-only — no input/select control exists for these fields.
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it('AC1: Section 1 (Vehicle Information) is pre-filled from the Lead but remains editable', async () => {
    renderForm();
    const variantInput = await screen.findByLabelText(/^variant$/i) as HTMLInputElement;
    await waitFor(() => expect(variantInput.value).toBe('LX'));

    const modelSelect = screen.getByLabelText(/model of interest/i) as HTMLSelectElement;
    await waitFor(() => expect(modelSelect.value).toBe('101'));

    const fuelSelect = screen.getByLabelText(/fuel type/i) as HTMLSelectElement;
    await waitFor(() => expect(fuelSelect.value).toBe('Petrol'));

    const transmissionSelect = screen.getByLabelText(/^transmission$/i) as HTMLSelectElement;
    await waitFor(() => expect(transmissionSelect.value).toBe('Manual'));

    // Still editable.
    const user = userEvent.setup();
    await user.clear(variantInput);
    await user.type(variantInput, 'VXi (O) CVT');
    expect(variantInput.value).toBe('VXi (O) CVT');
  });

  it('EVAL-AC3-01..04: submitting with the 4 original required fields empty shows inline errors and does not call convertLead', async () => {
    renderForm();
    const user = userEvent.setup();
    await screen.findByText('Asha Rao');
    // `variant` is pre-filled from the Lead once it loads (Section 1) —
    // clear it explicitly to exercise its own "still required" behavior,
    // same as a DSE who deletes the pre-filled value.
    const variantInput = screen.getByLabelText(/^variant$/i);
    await user.clear(variantInput);
    await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

    expect(await screen.findByText(/variant.*required|required.*variant/i)).toBeInTheDocument();
    expect(screen.getByText(/budget.*required|required.*budget/i)).toBeInTheDocument();
    expect(screen.getByText(/exchange interest.*required|required.*exchange interest/i)).toBeInTheDocument();
    expect(screen.getByText(/finance interest.*required|required.*finance interest/i)).toBeInTheDocument();
    expect(mockedApi.convertLead).not.toHaveBeenCalled();
  });

  const invalidBudgetCases = [
    { label: 'zero', value: '0' },
    { label: 'negative', value: '-50000' },
    { label: 'decimal', value: '500000.5' },
  ];
  for (const { label, value } of invalidBudgetCases) {
    it(`EVAL-AC3 client: rejects invalid budget — ${label}`, async () => {
      renderForm();
      const user = userEvent.setup();
      await screen.findByText('Asha Rao');

      await user.type(screen.getByLabelText(/budget/i), value);
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
      await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

      expect(await screen.findByText(/budget.*positive|positive.*budget|valid.*budget/i)).toBeInTheDocument();
      expect(mockedApi.convertLead).not.toHaveBeenCalled();
    });
  }

  it('AC4/AC5: submitting only the 4 original required fields succeeds — every new field is optional', async () => {
    const onConverted = vi.fn();
    const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
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

    renderForm(onConverted);
    const user = userEvent.setup();
    await screen.findByText('Asha Rao');
    // variant is already pre-filled ('LX') by the Lead — only budget/exchange/finance need entering.
    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

    await waitFor(() => expect(mockedApi.convertLead).toHaveBeenCalled());
    const [, input] = mockedApi.convertLead.mock.calls[0];
    expect(input.budget).toBe(500000);
    expect(input.variant).toBe('LX');
    expect(input.exchangeInterest).toBe(true);
    expect(input.financeInterest).toBe(false);
    // Optional fields never touched by the DSE are omitted (undefined), not
    // sent as empty strings.
    expect(input.colorFirstPreference).toBeUndefined();
    expect(input.intentRating).toBeUndefined();
    expect(input.panCardVerified).toBeUndefined();

    expect(await screen.findByText(/converted|enquiry created|success/i)).toBeInTheDocument();
    // onConverted is deferred behind SUCCESS_AUTO_CLOSE_MS (issue #132) —
    // not called yet immediately after the success message appears.
    expect(onConverted).not.toHaveBeenCalled();

    const capturedCallback = getCapturedCallback();
    expect(capturedCallback).not.toBeNull();
    await act(async () => capturedCallback!());
    expect(onConverted).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('AC5: a fully populated submission maps every section field into the ConvertLeadInput payload', async () => {
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

    renderForm();
    const user = userEvent.setup();
    await screen.findByText('Asha Rao');

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');

    await user.selectOptions(screen.getByLabelText(/contact verified/i), 'OTP Verified');
    await user.selectOptions(screen.getByLabelText(/intent rating/i), 'Hot');
    await user.selectOptions(screen.getByLabelText(/showroom visits so far/i), '2');

    await user.type(screen.getByLabelText(/quotation number/i), 'QT-1001');
    await user.selectOptions(screen.getByLabelText(/insurance preference/i), 'Dealer In-house');

    await user.selectOptions(screen.getByLabelText(/financier/i), 'HDFC Bank');

    await user.selectOptions(screen.getByLabelText(/evaluation status/i), 'Completed');

    await user.selectOptions(screen.getByLabelText(/test drive status/i), 'Scheduled');
    await user.selectOptions(screen.getByLabelText(/next action owner/i), 'consultant-1');

    await user.click(screen.getByLabelText(/pan card verified/i));

    await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

    await waitFor(() => expect(mockedApi.convertLead).toHaveBeenCalled());
    const [leadIdArg, input] = mockedApi.convertLead.mock.calls[0];
    expect(leadIdArg).toBe('lead-1');
    expect(input.contactVerified).toBe('OTP Verified');
    expect(input.intentRating).toBe('Hot');
    expect(input.showroomVisits).toBe('2');
    expect(input.quotationNumber).toBe('QT-1001');
    expect(input.insurancePreference).toBe('Dealer In-house');
    expect(input.financier).toBe('HDFC Bank');
    expect(input.exchangeEvaluationStatus).toBe('Completed');
    expect(input.testDriveStatus).toBe('Scheduled');
    expect(input.nextActionOwnerId).toBe('consultant-1');
    expect(input.panCardVerified).toBe(true);
  });

  it('EVAL-AC3-07: maps a server 400 field error onto the matching form field', async () => {
    mockedApi.convertLead.mockRejectedValue(
      new ApiError(400, [{ field: 'budget', message: 'budget must be a positive integer' }], 'Bad request'),
    );

    renderForm();
    const user = userEvent.setup();
    await screen.findByText('Asha Rao');

    await user.type(screen.getByLabelText(/budget/i), '500000');
    await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
    await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
    await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));

    expect(await screen.findByText(/budget must be a positive integer/i)).toBeInTheDocument();
  });

  it('reuses useConsultants() for the Next Action Owner dropdown', async () => {
    renderForm();
    await screen.findByText('Asha Rao');
    expect(await screen.findByRole('option', { name: 'DSE One' })).toBeInTheDocument();
  });

  /**
   * RED->GREEN — issue #132: optional `onConverted` prop, used by the
   * LeadQueue per-row Convert to Enquiry slide-over panel to auto-close
   * itself shortly after a successful conversion. Mirrors NewLeadForm's
   * identical "onSuccess auto-close" block (issue #118) exactly, including
   * its rationale for spying on `window.setTimeout` rather than
   * `vi.useFakeTimers()` (documented on that file).
   */
  describe('onConverted auto-close (issue #132)', () => {
    function successResponse() {
      return {
        enquiryId: 'enq-1',
        leadId: 'lead-1',
        entryType: 'CONVERTED' as const,
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
      };
    }

    async function submitMinimalValidForm(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByText('Asha Rao');
      await user.type(screen.getByLabelText(/budget/i), '500000');
      await user.selectOptions(screen.getByLabelText(/exchange interest/i), 'true');
      await user.selectOptions(screen.getByLabelText(/finance interest/i), 'false');
      await user.click(screen.getByRole('button', { name: /convert to enquiry/i }));
    }

    it('calls onConverted ~1.5s after a successful conversion, once the success message has shown', async () => {
      mockedApi.convertLead.mockResolvedValue(successResponse());
      const onConverted = vi.fn();
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      renderForm(onConverted);

      await submitMinimalValidForm(user);

      expect(await screen.findByText(/converted|enquiry created|success/i)).toBeInTheDocument();
      expect(onConverted).not.toHaveBeenCalled();

      const capturedCallback = getCapturedCallback();
      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(onConverted).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('does not call onConverted when the prop is omitted', async () => {
      mockedApi.convertLead.mockResolvedValue(successResponse());
      const { spy, getCapturedCallback } = spyOnSuccessAutoCloseTimer();
      const user = userEvent.setup();
      renderForm();

      await submitMinimalValidForm(user);

      expect(await screen.findByText(/converted|enquiry created|success/i)).toBeInTheDocument();
      // No onConverted prop was passed, so ConvertLeadForm never schedules
      // the SUCCESS_AUTO_CLOSE_MS timer at all — nothing was captured.
      expect(getCapturedCallback()).toBeNull();

      spy.mockRestore();
    });
  });
});
