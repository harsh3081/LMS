import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Followup, LogFollowupInput } from '../api/client';

export const FOLLOWUPS_QUERY_KEY = (enquiryId: string) => ['followups', enquiryId];
/** NEW (issue #31, AC4). */
export const UPCOMING_FOLLOWUPS_QUERY_KEY = ['followups', 'upcoming'];

/** Follow-up history for one Enquiry (issue #30 AC5). Not yet consumed by
 * any page in this Story — provisioned for the future #32 ("role-scoped
 * follow-up history timeline") Story, and exercised directly by
 * useFollowups.spec.tsx so the read path is proven now. */
export function useFollowups(enquiryId: string) {
  return useQuery({ queryKey: FOLLOWUPS_QUERY_KEY(enquiryId), queryFn: () => api.getFollowups(enquiryId) });
}

/** NEW (issue #31, AC4) — the calling DSE's own upcoming/overdue Follow-up
 * reminders (GET /api/v1/follow-ups/upcoming), most-overdue-first as
 * returned by the backend. Consumed by UpcomingFollowupsPage. */
export function useUpcomingFollowups() {
  return useQuery({ queryKey: UPCOMING_FOLLOWUPS_QUERY_KEY, queryFn: () => api.getUpcomingFollowups() });
}

/**
 * Log-a-Follow-up mutation (issue #30, extended by issue #31 AC1-AC4). On
 * success, prepends the created Follow-up into the cached per-Enquiry list
 * — mirrors useCreateDirectEnquiry's synchronous cache-update convention (no
 * full page reload/refetch) — and invalidates the "my upcoming follow-ups"
 * list (issue #31 AC4) so a newly scheduled/cleared reminder is reflected
 * next time that list is viewed, without over-engineering a second
 * synchronous cache splice for a cross-Enquiry list here.
 */
export function useLogFollowup(enquiryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogFollowupInput) => api.logFollowup(enquiryId, input),
    onSuccess: (created: Followup) => {
      queryClient.setQueryData<Followup[]>(FOLLOWUPS_QUERY_KEY(enquiryId), (existing) => [
        created,
        ...(existing ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: UPCOMING_FOLLOWUPS_QUERY_KEY });
    },
  });
}
