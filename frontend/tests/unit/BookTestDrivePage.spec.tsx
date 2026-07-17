/**
 * RED->GREEN — issue #34 AC1. BookTestDrivePage renders the heading and the
 * booking form — mirrors NewEnquiryPage's smoke-test convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { BookTestDrivePage } from '../../src/pages/BookTestDrivePage';
import { api } from '../../src/api/client';

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

function renderPage(initialEntry = '/test-drives/new') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BookTestDrivePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookTestDrivePage (issue #34 AC1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyEnquiries.mockResolvedValue([]);
    mockedApi.getDemoVehicles.mockResolvedValue([]);
    mockedApi.getVehicleModels.mockResolvedValue([]);
  });

  it('renders the heading and the booking form', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /book a test drive/i })).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.getMyEnquiries).toHaveBeenCalled());
    expect(screen.getByRole('form', { name: /book a test drive/i })).toBeInTheDocument();
  });

  it('issue #35 AC4: pre-fills vehicle/date/time from the vehicleId/date/time query params (Scheduler "Book" link)', async () => {
    mockedApi.getDemoVehicles.mockResolvedValue([{ vehicleId: 'v1', modelId: 101, variant: 'LX', locationId: 'loc-1' }]);
    renderPage('/test-drives/new?vehicleId=v1&date=2026-08-01&time=10:00');

    await waitFor(() => expect(screen.getByLabelText(/demo vehicle/i)).toHaveValue('v1'));
    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-08-01');
    expect(screen.getByLabelText(/start time/i)).toHaveValue('10:00');
    // enquiryId is deliberately never pre-filled (see NewTestDriveForm's comment).
    expect(screen.getByLabelText(/customer.*enquiry/i)).toHaveValue('');
  });
});
