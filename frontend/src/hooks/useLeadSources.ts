import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useLeadSources() {
  return useQuery({ queryKey: ['lead-sources'], queryFn: api.getLeadSources });
}
