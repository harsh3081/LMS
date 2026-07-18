import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, CreateLeadInput, Lead } from '../api/client';

export const LEADS_QUERY_KEY = ['leads'];
/** NEW (issue #116, AC2). */
export const LEAD_QUERY_KEY = (leadId: string) => ['leads', leadId];

/** Owner-scoped Lead queue (AC6). */
export function useLeads() {
  return useQuery({ queryKey: LEADS_QUERY_KEY, queryFn: api.getMyLeads });
}

/** NEW (issue #116, AC2) — single-Lead detail read, backing LeadDetailPage.
 * `enabled: !!leadId` mirrors this codebase's other id-guarded hooks
 * (e.g. useFollowups(enquiryId)) — skips the request entirely when the
 * route param isn't available yet. */
export function useLead(leadId: string | undefined) {
  return useQuery({
    queryKey: LEAD_QUERY_KEY(leadId ?? ''),
    queryFn: () => api.getLead(leadId as string),
    enabled: !!leadId,
  });
}

/**
 * Create-Lead mutation. On success, prepends the created Lead directly into
 * the cached queue (AC6: "appears immediately ... without a full page
 * reload") rather than only invalidating-and-refetching, so the UI updates
 * synchronously with the mutation response.
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => api.createLead(input),
    onSuccess: (created: Lead) => {
      queryClient.setQueryData<Lead[]>(LEADS_QUERY_KEY, (existing) => [created, ...(existing ?? [])]);
    },
  });
}
