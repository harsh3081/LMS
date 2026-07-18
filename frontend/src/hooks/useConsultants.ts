import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/** GET /api/v1/consultants — the caller's own location's DSE roster, for
 * the New Lead form's "Assign to Consultant" dropdown (issue #114, AC5).
 * Mirrors useDemoVehicles/useLeadSources' structure exactly. */
export function useConsultants() {
  return useQuery({ queryKey: ['consultants'], queryFn: api.getConsultants });
}
