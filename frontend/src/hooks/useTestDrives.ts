import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, CreateTestDriveInput, SchedulerQuery, TestDrive } from '../api/client';

/** NEW (issue #34, AC5). */
export const UPCOMING_TEST_DRIVES_QUERY_KEY = ['test-drives', 'upcoming'];

/** The calling DSE's own upcoming Test Drive bookings (GET
 * /api/v1/test-drives/upcoming), ascending by slot as returned by the
 * backend. Consumed by UpcomingTestDrivesPage. Mirrors
 * useUpcomingFollowups exactly. */
export function useUpcomingTestDrives() {
  return useQuery({ queryKey: UPCOMING_TEST_DRIVES_QUERY_KEY, queryFn: () => api.getUpcomingTestDrives() });
}

/**
 * Book-a-Test-Drive mutation (issue #34, AC1-AC6). On success, prepends the
 * created booking into the cached "upcoming" list — mirrors
 * useCreateDirectEnquiry's synchronous cache-update convention (no full page
 * reload/refetch).
 */
export function useBookTestDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestDriveInput) => api.bookTestDrive(input),
    onSuccess: (created: TestDrive) => {
      queryClient.setQueryData<TestDrive[]>(UPCOMING_TEST_DRIVES_QUERY_KEY, (existing) => [
        created,
        ...(existing ?? []),
      ]);
    },
  });
}

/** AC3 ("real time (or near real time)... without manual refresh") pragmatic
 * interpretation — issue #35. No WebSocket/SSE/push infrastructure exists
 * anywhere in this codebase (verified, mirrors the identical ADR-007 gap
 * #34/#31 already flagged); a short-interval poll via React Query's
 * `refetchInterval` satisfies "near real time... without manual refresh"
 * without a disproportionate infra investment. See NOTES.md. */
export const SCHEDULER_POLL_INTERVAL_MS = 20_000;

export const SCHEDULER_QUERY_KEY = (query: SchedulerQuery | null) => [
  'test-drives',
  'scheduler',
  query?.vehicleId,
  query?.from,
  query?.to,
];

/** The scheduler grid's data source (issue #35, GET /api/v1/test-drives?
 * vehicleId=&from=&to=, AC1/AC2/AC5) — every BOOKED slot for one vehicle
 * within one date range, polled every SCHEDULER_POLL_INTERVAL_MS so a
 * booking made by another DSE shows up without a manual refresh (AC3).
 * `query` is `null` until a vehicle/date have been selected (the scheduler
 * page's initial render) — the query is disabled until then, mirroring
 * react-query's own `enabled` convention for "don't fetch yet". */
export function useSchedulerSlots(query: SchedulerQuery | null) {
  return useQuery({
    queryKey: SCHEDULER_QUERY_KEY(query),
    queryFn: () => api.getScheduler(query as SchedulerQuery),
    enabled: query !== null,
    refetchInterval: SCHEDULER_POLL_INTERVAL_MS,
  });
}
