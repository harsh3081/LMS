/**
 * RED->GREEN (Inside-Out, Data/Query Layer) — issue #35 AC3. Verifies the
 * scheduler's polling-based "near real time... without manual refresh"
 * interpretation actually refetches on an interval, using fake timers per
 * the orchestrator's explicit instruction (no real wall-clock waits).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSchedulerSlots, SCHEDULER_POLL_INTERVAL_MS } from '../../src/hooks/useTestDrives';
import { api } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return { ...actual, api: { ...actual.api, getScheduler: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSchedulerSlots (issue #35 AC1/AC3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getScheduler.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch when query is null (no vehicle/date selected yet)', () => {
    renderHook(() => useSchedulerSlots(null), { wrapper });
    expect(mockedApi.getScheduler).not.toHaveBeenCalled();
  });

  it('fetches immediately once a query is provided', async () => {
    renderHook(
      () => useSchedulerSlots({ vehicleId: 'v1', from: '2026-08-01T00:00:00.000Z', to: '2026-08-01T23:59:59.999Z' }),
      { wrapper },
    );
    await waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalledTimes(1));
  });

  it('AC3: refetches automatically after SCHEDULER_POLL_INTERVAL_MS elapses, without any manual refresh trigger', async () => {
    vi.useFakeTimers();
    renderHook(
      () => useSchedulerSlots({ vehicleId: 'v1', from: '2026-08-01T00:00:00.000Z', to: '2026-08-01T23:59:59.999Z' }),
      { wrapper },
    );

    await vi.waitFor(() => expect(mockedApi.getScheduler).toHaveBeenCalledTimes(1));

    await act(() => vi.advanceTimersByTimeAsync(SCHEDULER_POLL_INTERVAL_MS));
    expect(mockedApi.getScheduler).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(SCHEDULER_POLL_INTERVAL_MS));
    expect(mockedApi.getScheduler).toHaveBeenCalledTimes(3);
  });
});
