/**
 * REWRITTEN (direct user request) — NewLeadForm was simplified from a
 * 6-section, 20+-field form down to exactly 6 fields (Customer Name, Phone
 * Number, Email, Model Interest, Lead Source, Notes) plus the one field that
 * could not be dropped: the `communicationConsentVerified` compliance
 * checkbox (a hard backend gate, not a UI nicety — see NewLeadForm.tsx's
 * class doc comment). This file replaces the old spec, which covered fields
 * (Exchange Vehicle, Finance, Referrer Name, Assign to Consultant, the
 * duplicate-mobile warning UI, etc.) that no longer exist in this form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewLeadForm, SUCCESS_AUTO_CLOSE_MS } from '../../src/components/NewLeadForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      getLeadSources: vi.fn(),
      getVehicleModels: vi.fn(),
      createLead: vi.fn(),
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

function renderForm(props?: { onSuccess?: () => void }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewLeadForm {...props} />
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

async function fillMandatoryFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
  await user.type(screen.getByLabelText(/phone number/i), '9876543210');
  await user.selectOptions(screen.getByLabelText(/model interest/i), '101');
  await user.selectOptions(screen.getByLabelText(/lead source/i), '1');
  await user.click(screen.getByLabelText(/customer consents/i));
}

describe('NewLeadForm (simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getFieldConfig.mockResolvedValue(ALL_MANDATORY_FIELD_CONFIG);
    mockedApi.getLeadSources.mockResolvedValue(sources);
    mockedApi.getVehicleModels.mockResolvedValue(models);
  });

  it('renders exactly the 6 simple fields plus the consent checkbox and a submit control', async () => {
    renderForm();
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/model interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/lead source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer consents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument();
  });

  it('does not render any of the dropped sections/fields', () => {
    renderForm();
    expect(screen.queryByLabelText(/city/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pin code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/customer type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/preferred language/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/variant/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fuel type/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/transmission/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/budget/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/buying timeline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exchange vehicle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/finance/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/referrer name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assign to consultant/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/first follow-up date/i)).not.toBeInTheDocument();
  });

  it('source and model dropdowns populate from the read paths', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Walk-in' })).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Referral' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Compact Hatchback LX' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sedan GT' })).toBeInTheDocument();
  });

  it('submitting entirely empty shows required errors for the 4 mandatory fields and consent, and does not call createLead', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/source is required/i)).toBeInTheDocument();
    expect(screen.getByText(/model is required/i)).toBeInTheDocument();
    expect(screen.getByText(/consent must be confirmed/i)).toBeInTheDocument();
    expect(mockedApi.createLead).not.toHaveBeenCalled();
  });

  it('rejects an invalid mobile number', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/phone number/i), '12345');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/enter a valid 10-digit mobile number/i)).toBeInTheDocument();
    expect(mockedApi.createLead).not.toHaveBeenCalled();
  });

  it('blocks submission while consent is unchecked, even with every other field valid', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/phone number/i), '9876543210');
    await user.selectOptions(screen.getByLabelText(/model interest/i), '101');
    await user.selectOptions(screen.getByLabelText(/lead source/i), '1');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/consent must be confirmed/i)).toBeInTheDocument();
    expect(mockedApi.createLead).not.toHaveBeenCalled();
  });

  it('submits the 6 fields plus consent, mapped onto CreateLeadInput, and shows a success message', async () => {
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

    await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
    await user.type(screen.getByLabelText(/phone number/i), '9876543210');
    await user.type(screen.getByLabelText(/email address/i), 'asha@example.com');
    await user.selectOptions(screen.getByLabelText(/model interest/i), '101');
    await user.selectOptions(screen.getByLabelText(/lead source/i), '1');
    await user.type(screen.getByLabelText(/notes/i), 'Interested in a test drive.');
    await user.click(screen.getByLabelText(/customer consents/i));
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/lead created successfully/i)).toBeInTheDocument();
    expect(mockedApi.createLead).toHaveBeenCalledWith({
      customerName: 'Asha Rao',
      mobile: '9876543210',
      email: 'asha@example.com',
      modelId: 101,
      sourceId: 1,
      remarks: 'Interested in a test drive.',
      communicationConsentVerified: true,
    });
  });

  it('maps a server 400 field error onto the matching form field', async () => {
    mockedApi.createLead.mockRejectedValue(
      new ApiError(400, [{ field: 'mobile', message: 'mobile already exists' }], 'Bad Request'),
    );
    renderForm();
    const user = userEvent.setup();
    await fillMandatoryFields(user);
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText('mobile already exists')).toBeInTheDocument();
    expect(mockedApi.createLead).toHaveBeenCalledTimes(1);
  });

  describe('config-driven mandatory fields (issue #27)', () => {
    it('does not show a required error for a field configured optional, and submits without it', async () => {
      mockedApi.getFieldConfig.mockResolvedValue([
        { fieldName: 'customerName', label: 'Customer Name', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'mobile', label: 'Mobile Number', mandatory: true, updatedBy: null, updatedAt: null },
        { fieldName: 'sourceId', label: 'Source', mandatory: false, updatedBy: null, updatedAt: null },
        { fieldName: 'modelId', label: 'Model of Interest', mandatory: true, updatedBy: null, updatedAt: null },
      ]);
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-2',
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
      await waitFor(() => expect(mockedApi.getFieldConfig).toHaveBeenCalled());

      await user.type(screen.getByLabelText(/customer name/i), 'Asha Rao');
      await user.type(screen.getByLabelText(/phone number/i), '9876543210');
      await user.selectOptions(screen.getByLabelText(/model interest/i), '101');
      await user.click(screen.getByLabelText(/customer consents/i));
      await user.click(screen.getByRole('button', { name: /create lead/i }));

      expect(screen.queryByText(/source is required/i)).not.toBeInTheDocument();
      expect(await screen.findByText(/lead created successfully/i)).toBeInTheDocument();
    });
  });

  describe('onSuccess auto-close (issue #118, AC4)', () => {
    it('calls onSuccess ~1.5s after a successful creation, once the success message has shown', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-3',
        customerName: 'Asha Rao',
        mobile: '9876543210',
        sourceId: 1,
        modelId: 101,
        status: 'New',
        ownerId: 'owner-1',
        locationId: 'loc-1',
        createdAt: new Date().toISOString(),
      });
      const onSuccess = vi.fn();

      const originalSetTimeout = window.setTimeout;
      let capturedCallback: (() => void) | null = null;
      const setTimeoutSpy = vi
        .spyOn(window, 'setTimeout')
        .mockImplementation(((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === SUCCESS_AUTO_CLOSE_MS) {
            capturedCallback = fn as () => void;
            return 0 as unknown as ReturnType<typeof setTimeout>;
          }
          return originalSetTimeout(fn as TimerHandler, delay, ...args);
        }) as typeof setTimeout);

      renderForm({ onSuccess });
      const user = userEvent.setup();
      await fillMandatoryFields(user);
      await user.click(screen.getByRole('button', { name: /create lead/i }));

      expect(await screen.findByText(/lead created successfully/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      expect(capturedCallback).not.toBeNull();
      await act(async () => capturedCallback!());
      expect(onSuccess).toHaveBeenCalledTimes(1);

      setTimeoutSpy.mockRestore();
    });

    it('does not call onSuccess when the prop is omitted (standalone usage unchanged)', async () => {
      mockedApi.createLead.mockResolvedValue({
        leadId: 'lead-4',
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
      await user.click(screen.getByRole('button', { name: /create lead/i }));

      expect(await screen.findByText(/lead created successfully/i)).toBeInTheDocument();
    });
  });
});
