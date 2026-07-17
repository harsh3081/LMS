import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Followup, LogFollowupInput } from '../api/client';

export const FOLLOWUPS_QUERY_KEY = (enquiryId: string) => ['followups', enquiryId];

/** Follow-up history for one Enquiry (issue #30 AC5). Not yet consumed by
 * any page in this Story — provisioned for the future #32 ("role-scoped
 * follow-up history timeline") Story, and exercised directly by
 * useFollowups.spec.tsx so the read path is proven now. */
export function useFollowups(enquiryId: string) {
  return useQuery({ queryKey: FOLLOWUPS_QUERY_KEY(enquiryId), queryFn: () => api.getFollowups(enquiryId) });
}

/**
 * Log-a-Follow-up mutation (issue #30). On success, prepends the created
 * Follow-up into the cached per-Enquiry list — mirrors useCreateDirectEnquiry's
 * synchronous cache-update convention (no full page reload/refetch).
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
    },
  });
}
