/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #30 (AC1-AC5).
 * Component tests for LogFollowupForm, with the api client mocked — mirrors
 * ConvertLeadForm.spec.tsx's structure (the real HTTP path is proven by the
 * backend Supertest suite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LogFollowupForm } from '../../src/components/LogFollowupForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      logFollowup: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

function renderForm(onLogged?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LogFollowupForm enquiryId="enq-1" onLogged={onLogged} />
    </QueryClientProvider>,
  );
}

describe('LogFollowupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC1/AC2: renders the follow-up type selector, remarks field, and a submit control', () => {
    renderForm();
    expect(screen.getByLabelText(/follow-up type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remarks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log follow-up|submit|save/i })).toBeInTheDocument();
  });

  it('AC1: the type selector offers Home Visit, Showroom Visit, and Call', () => {
    renderForm();
    expect(screen.getByRole('option', { name: 'Home Visit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Showroom Visit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Call' })).toBeInTheDocument();
  });

  it('AC4: submitting without selecting a type shows an inline error and does not call the API', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/remarks/i), 'Customer wants a test drive.');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/follow-up type is required/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).not.toHaveBeenCalled();
  });

  it('AC2/AC3: submitting without remarks shows an inline error and does not call the API', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Home Visit');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/remarks are required/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).not.toHaveBeenCalled();
  });

  it('AC2/AC3: whitespace-only remarks is rejected client-side (not meaningful free text)', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), '   ');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/remarks are required/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).not.toHaveBeenCalled();
  });

  // ---- issue #31: Next Follow-up Date / Enquiry Outcome (AC1-AC4) ----
  it('AC1/AC2/AC3/AC5: submitting valid data (incl. next follow-up date) calls logFollowup and shows success', async () => {
    const onLogged = vi.fn();
    mockedApi.logFollowup.mockResolvedValue({
      followupId: 'followup-1',
      enquiryId: 'enq-1',
      type: 'Home Visit',
      remarks: 'Discussed financing options.',
      loggedBy: 'dse-1',
      locationId: 'loc-1',
      loggedAt: new Date().toISOString(),
      nextFollowUpAt: '2026-08-01T00:00:00.000Z',
      resultingStatus: null,
    });

    renderForm(onLogged);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Home Visit');
    await user.type(screen.getByLabelText(/remarks/i), 'Discussed financing options.');
    await user.type(screen.getByLabelText(/next follow-up date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/follow-up logged/i)).toBeInTheDocument();
    expect(mockedApi.logFollowup).toHaveBeenCalledWith('enq-1', {
      type: 'Home Visit',
      remarks: 'Discussed financing options.',
      nextFollowUpAt: '2026-08-01',
    });
    await waitFor(() => expect(onLogged).toHaveBeenCalled());
  });

  it('AC2: submitting without a next follow-up date or an enquiry outcome shows an inline error and does not call the API', async () => {
    renderForm();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'Left a voicemail.');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(
      await screen.findByText(/next follow-up date is required unless the enquiry is marked lost or booked/i),
    ).toBeInTheDocument();
    expect(mockedApi.logFollowup).not.toHaveBeenCalled();
  });

  it.each(['Lost', 'Booked'])(
    'AC2: selecting enquiry outcome "%s" allows submitting without a next follow-up date',
    async (status) => {
      mockedApi.logFollowup.mockResolvedValue({
        followupId: 'followup-2',
        enquiryId: 'enq-1',
        type: 'Call',
        remarks: 'Closing this out.',
        loggedBy: 'dse-1',
        locationId: 'loc-1',
        loggedAt: new Date().toISOString(),
        nextFollowUpAt: null,
        resultingStatus: status,
      });

      renderForm();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
      await user.type(screen.getByLabelText(/remarks/i), 'Closing this out.');
      await user.selectOptions(screen.getByLabelText(/enquiry outcome/i), status);
      await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

      expect(await screen.findByText(/follow-up logged/i)).toBeInTheDocument();
      expect(mockedApi.logFollowup).toHaveBeenCalledWith('enq-1', {
        type: 'Call',
        remarks: 'Closing this out.',
        enquiryStatus: status,
      });
    },
  );

  // ---- issue #33: Update Enquiry Status as Part of a Follow-up (AC1/AC4) ----
  it('AC1: the Enquiry Outcome selector offers Hot, Warm, Cold, Lost, and Booked', () => {
    renderForm();
    for (const status of ['Hot', 'Warm', 'Cold', 'Lost', 'Booked']) {
      expect(screen.getByRole('option', { name: status })).toBeInTheDocument();
    }
  });

  it.each(['Hot', 'Warm', 'Cold'])(
    'AC4: selecting the non-terminal enquiry outcome "%s" WITHOUT a next follow-up date still shows the required error (does not waive AC4)',
    async (status) => {
      renderForm();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
      await user.type(screen.getByLabelText(/remarks/i), 'Marking interest level.');
      await user.selectOptions(screen.getByLabelText(/enquiry outcome/i), status);
      await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

      expect(
        await screen.findByText(/next follow-up date is required unless the enquiry is marked lost or booked/i),
      ).toBeInTheDocument();
      expect(mockedApi.logFollowup).not.toHaveBeenCalled();
    },
  );

  it.each(['Hot', 'Warm', 'Cold'])(
    'AC1: selecting the non-terminal enquiry outcome "%s" WITH a next follow-up date submits successfully',
    async (status) => {
      mockedApi.logFollowup.mockResolvedValue({
        followupId: 'followup-3',
        enquiryId: 'enq-1',
        type: 'Call',
        remarks: 'Marking interest level.',
        loggedBy: 'dse-1',
        locationId: 'loc-1',
        loggedAt: new Date().toISOString(),
        nextFollowUpAt: '2026-09-15T00:00:00.000Z',
        resultingStatus: status,
      });

      renderForm();
      const user = userEvent.setup();
      await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
      await user.type(screen.getByLabelText(/remarks/i), 'Marking interest level.');
      await user.type(screen.getByLabelText(/next follow-up date/i), '2026-09-15');
      await user.selectOptions(screen.getByLabelText(/enquiry outcome/i), status);
      await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

      expect(await screen.findByText(/follow-up logged/i)).toBeInTheDocument();
      expect(mockedApi.logFollowup).toHaveBeenCalledWith('enq-1', {
        type: 'Call',
        remarks: 'Marking interest level.',
        nextFollowUpAt: '2026-09-15',
        enquiryStatus: status,
      });
    },
  );

  it('maps a server 400 field error onto the matching form field', async () => {
    mockedApi.logFollowup.mockRejectedValue(
      new ApiError(400, [{ field: 'remarks', message: 'remarks is required' }], 'Bad request'),
    );

    renderForm();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'x');
    await user.type(screen.getByLabelText(/next follow-up date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/remarks is required/i)).toBeInTheDocument();
  });

  it('maps a server 400 nextFollowUpAt field error onto the matching form field', async () => {
    mockedApi.logFollowup.mockRejectedValue(
      new ApiError(
        400,
        [{ field: 'nextFollowUpAt', message: 'nextFollowUpAt is required unless enquiryStatus is Lost or Booked' }],
        'Bad request',
      ),
    );

    renderForm();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'Discussed financing options.');
    await user.type(screen.getByLabelText(/next follow-up date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByText(/nextfollowupat is required/i)).toBeInTheDocument();
  });

  it('surfaces a non-field-error (e.g. 404 enquiry not found) as a form-level alert', async () => {
    mockedApi.logFollowup.mockRejectedValue(new ApiError(404, [], 'Enquiry not found'));

    renderForm();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/follow-up type/i), 'Call');
    await user.type(screen.getByLabelText(/remarks/i), 'Discussed financing options.');
    await user.type(screen.getByLabelText(/next follow-up date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /log follow-up|submit|save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enquiry not found/i);
  });
});
