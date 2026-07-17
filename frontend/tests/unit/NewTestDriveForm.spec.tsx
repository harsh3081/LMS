/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #34. Component tests
 * for NewTestDriveForm (AC1/AC3/AC6), with useEnquiries/useDemoVehicles/
 * useVehicleModels and the api client mocked — mirrors NewEnquiryForm's test
 * conventions (the real HTTP path is proven by the backend Supertest suite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewTestDriveForm } from '../../src/components/NewTestDriveForm';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getMyEnquiries: vi.fn(),
      getDemoVehicles: vi.fn(),
      getVehicleModels: vi.fn(),
      bookTestDrive: vi.fn(),
    },
  };
});

const mockedApi = vi.mocked(api, true);

function renderForm(initialValues?: { vehicleId?: string; date?: string; time?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NewTestDriveForm initialValues={initialValues} />
    </QueryClientProvider>,
  );
}

describe('NewTestDriveForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyEnquiries.mockResolvedValue([
      {
        enquiryId: 'enq-1',
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
      },
    ]);
    mockedApi.getDemoVehicles.mockResolvedValue([{ vehicleId: 'v1', modelId: 101, variant: 'LX', locationId: 'loc-1' }]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback LX' }]);
  });

  it('AC1: renders the Enquiry, Vehicle, Date, Start Time fields and a submit control', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: /walk-in customer/i })).toBeInTheDocument());

    expect(screen.getByLabelText(/customer.*enquiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/demo vehicle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^date$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book test drive/i })).toBeInTheDocument();
  });

  it('AC6: submitting entirely empty shows inline errors for every mandatory field and does not call the API', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: /walk-in customer/i })).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /book test drive/i }));

    expect(await screen.findByText(/customer is required/i)).toBeInTheDocument();
    expect(screen.getByText(/vehicle is required/i)).toBeInTheDocument();
    expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    expect(screen.getByText(/start time is required/i)).toBeInTheDocument();
    expect(mockedApi.bookTestDrive).not.toHaveBeenCalled();
  });

  it('AC1/AC3: submitting valid data calls bookTestDrive with a computed 30-minute UTC slot and shows the booking reference', async () => {
    mockedApi.bookTestDrive.mockResolvedValue({
      testDriveId: 'td-1',
      enquiryId: 'enq-1',
      vehicleId: 'v1',
      slotStart: '2026-08-01T10:00:00.000Z',
      slotEnd: '2026-08-01T10:30:00.000Z',
      status: 'Booked',
      remarks: null,
      bookedBy: 'dse-1',
      locationId: 'loc-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: /walk-in customer/i })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/customer.*enquiry/i), 'enq-1');
    await user.selectOptions(screen.getByLabelText(/demo vehicle/i), 'v1');
    await user.type(screen.getByLabelText(/^date$/i), '2026-08-01');
    await user.type(screen.getByLabelText(/start time/i), '10:00');
    await user.click(screen.getByRole('button', { name: /book test drive/i }));

    expect(await screen.findByText(/booking reference: td-1/i)).toBeInTheDocument();
    expect(mockedApi.bookTestDrive).toHaveBeenCalledWith({
      enquiryId: 'enq-1',
      vehicleId: 'v1',
      slotStart: '2026-08-01T10:00:00.000Z',
      slotEnd: '2026-08-01T10:30:00.000Z',
    });
  });

  it('AC2: maps a server 400 operating-hours field error (slotStart) onto the time field', async () => {
    mockedApi.bookTestDrive.mockRejectedValue(
      new ApiError(400, [{ field: 'slotStart', message: 'slotStart must be within dealership operating hours' }], 'Bad request'),
    );

    renderForm();
    await waitFor(() => expect(screen.getByRole('option', { name: /walk-in customer/i })).toBeInTheDocument());
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/customer.*enquiry/i), 'enq-1');
    await user.selectOptions(screen.getByLabelText(/demo vehicle/i), 'v1');
    await user.type(screen.getByLabelText(/^date$/i), '2026-08-01');
    await user.type(screen.getByLabelText(/start time/i), '05:00');
    await user.click(screen.getByRole('button', { name: /book test drive/i }));

    expect(await screen.findByText(/operating hours/i)).toBeInTheDocument();
  });

  it('issue #35 AC4: pre-fills vehicle/date/time from initialValues, leaving enquiryId blank', async () => {
    renderForm({ vehicleId: 'v1', date: '2026-08-01', time: '10:00' });
    await waitFor(() => expect(screen.getByRole('option', { name: /walk-in customer/i })).toBeInTheDocument());

    expect(screen.getByLabelText(/customer.*enquiry/i)).toHaveValue('');
    expect(screen.getByLabelText(/demo vehicle/i)).toHaveValue('v1');
    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-08-01');
    expect(screen.getByLabelText(/start time/i)).toHaveValue('10:00');
  });
});
