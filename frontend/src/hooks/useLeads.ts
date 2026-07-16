import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, CreateLeadInput, Lead } from '../api/client';

export const LEADS_QUERY_KEY = ['leads'];

/** Owner-scoped Lead queue (AC6). */
export function useLeads() {
  return useQuery({ queryKey: LEADS_QUERY_KEY, queryFn: api.getMyLeads });
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
