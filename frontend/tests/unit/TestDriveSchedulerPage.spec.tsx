/**
 * RED->GREEN — issue #35 AC1/AC3/AC5. TestDriveSchedulerPage wires the
 * vehicle switcher (AC5), date control (AC1), and the polling grid (AC3)
 * together — mirrors BookTestDrivePage/UpcomingTestDrivesPage's structure,
 * with useDemoVehicles/useVehicleModels/api.getScheduler mocked (the real
 * HTTP path is proven by the backend Supertest suite).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TestDriveSchedulerPage } from '../../src/pages/TestDriveSchedulerPage';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getDemoVehicles: vi.fn(),
      getVehicleModels: vi.fn(),
      getScheduler: vi.fn(),
    },
  };
});
const mockedApi = vi.mocked(api, true);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/test-drives/scheduler']}>
        <TestDriveSchedulerPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TestDriveSchedulerPage (issue #35)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
    mockedApi.getDemoVehicles.mockResolvedValue([
      { vehicleId: 'v1', modelId: 101, variant: 'LX', locationId: 'loc-1' },
      { vehicleId: 'v2', modelId: 101, variant: 'VXi (O)', locationId: 'loc-1' },
    ]);
    mockedApi.getVehicleModels.mockResolvedValue([{ modelId: 101, name: 'Compact Hatchback' }]);
    mockedApi.getScheduler.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AC1/AC5: renders the heading, vehicle switcher (auto-selecting the first vehicle), and today\'s date by default', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('option', { name: /compact hatchback — lx/i })).toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /test drive scheduler/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/demo vehicle/i)).toHaveValue('v1');
    expect(screen.getByLabelText(/^date$/i)).toHaveValue('2026-08-15');
    await waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalledWith({
      vehicleId: 'v1',
      from: '2026-08-15T00:00:00.000Z',
      to: '2026-08-15T23:59:59.999Z',
    }));
  });

  it('AC1: "Next Day"/"Previous Day" shift the queried date range', async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalled());
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /next day/i }));
    await waitFor(() =>
      expect(mockedApi.getScheduler).toHaveBeenCalledWith({
        vehicleId: 'v1',
        from: '2026-08-16T00:00:00.000Z',
        to: '2026-08-16T23:59:59.999Z',
      }),
    );

    await user.click(screen.getByRole('button', { name: /previous day/i }));
    await user.click(screen.getByRole('button', { name: /previous day/i }));
    await waitFor(() =>
      expect(mockedApi.getScheduler).toHaveBeenCalledWith({
        vehicleId: 'v1',
        from: '2026-08-14T00:00:00.000Z',
        to: '2026-08-14T23:59:59.999Z',
      }),
    );
  });

  it('AC5: switching the vehicle re-queries the scheduler for the newly selected vehicle', async () => {
    renderPage();
    await waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 'v1' })));
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/demo vehicle/i), 'v2');
    await waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 'v2' })));
  });

  it('renders the scheduler grid once a vehicle is selected', async () => {
    renderPage();
    expect(await screen.findByRole('table', { name: /test drive scheduler/i })).toBeInTheDocument();
  });
});
