import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/** Simple config/env feature-toggle read path (tech-design.md, CC-10). */
export function useFeatureFlags() {
  return useQuery({ queryKey: ['config'], queryFn: api.getConfig });
}
