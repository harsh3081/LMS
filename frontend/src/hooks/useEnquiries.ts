import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ConvertLeadInput, CreateDirectEnquiryInput, Enquiry, Lead } from '../api/client';
import { LEADS_QUERY_KEY } from './useLeads';

export const ENQUIRIES_QUERY_KEY = ['enquiries'];

/**
 * Convert-a-Lead-into-an-Enquiry mutation (issue #25, tech-design.md
 * Component 6). On success, removes the source Lead from the cached queue
 * (filtered by `leadId`, matching the response's `leadId`) so the SPA
 * reflects the Lead leaving the open queue immediately (AC5) without a full
 * page reload or refetch — mirroring useCreateLead's synchronous cache
 * update pattern.
 */
export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, input }: { leadId: string; input: ConvertLeadInput }) => api.convertLead(leadId, input),
    onSuccess: (created: Enquiry) => {
      queryClient.setQueryData<Lead[]>(LEADS_QUERY_KEY, (existing) =>
        (existing ?? []).filter((lead) => lead.leadId !== created.leadId),
      );
    },
  });
}

/** Own-Enquiries list (Direct + Converted alike, issue #26 AC5). */
export function useEnquiries() {
  return useQuery({ queryKey: ENQUIRIES_QUERY_KEY, queryFn: api.getMyEnquiries });
}

/**
 * Create-a-Direct-Enquiry mutation (issue #26). On success, prepends the
 * created Enquiry directly into the cached list — mirrors useCreateLead's
 * synchronous cache-update convention (no full page reload/refetch).
 */
export function useCreateDirectEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDirectEnquiryInput) => api.createDirectEnquiry(input),
    onSuccess: (created: Enquiry) => {
      queryClient.setQueryData<Enquiry[]>(ENQUIRIES_QUERY_KEY, (existing) => [created, ...(existing ?? [])]);
    },
  });
}
