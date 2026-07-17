import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * On-demand duplicate-mobile lookup (issue #29, AC1/AC5: real-time, as part
 * of the create flow, not a batch job). Triggered imperatively by
 * NewLeadForm/NewEnquiryForm on the mobile field's blur — a `useMutation`
 * (imperative `.mutateAsync`) fits this better than `useQuery`'s
 * declarative on-mount/key-driven model, since there is no natural query
 * key to keep fresh; each blur is its own one-shot check.
 */
export function useDuplicateCheck() {
  return useMutation({ mutationFn: (mobile: string) => api.checkDuplicates(mobile) });
}
