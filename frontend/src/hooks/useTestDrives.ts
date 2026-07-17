import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, CreateTestDriveInput, TestDrive } from '../api/client';

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
