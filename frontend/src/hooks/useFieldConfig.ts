import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, FieldConfigEntry, UpdateFieldConfigInput } from '../api/client';

export const FIELD_CONFIG_QUERY_KEY = ['field-config'];

/**
 * Reads the current mandatory-field configuration (issue #27, FR-04).
 * Consumed by both the admin FieldConfigPage (AC1/AC2) and the intake forms
 * (NewLeadForm/NewEnquiryForm, AC3) — one query key/cache entry so a save on
 * the admin page and a form's read stay in sync without extra plumbing.
 */
export function useFieldConfig() {
  return useQuery({ queryKey: FIELD_CONFIG_QUERY_KEY, queryFn: api.getFieldConfig });
}

/** Looks up whether `fieldName` is currently mandatory. Defaults to `true`
 * (fail-safe / matches the pre-#27 hardcoded behavior) while the config is
 * still loading or if the field is unknown, so a form never briefly renders
 * "everything optional" during the initial fetch. */
export function isFieldMandatory(config: FieldConfigEntry[] | undefined, fieldName: string): boolean {
  const entry = config?.find((f) => f.fieldName === fieldName);
  return entry ? entry.mandatory : true;
}

/** Admin save mutation (AC2) — invalidates the shared query so every open
 * form/page picks up the change without a manual refresh (AC3: "at next
 * load"). */
export function useUpdateFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFieldConfigInput) => api.updateFieldConfig(input),
    onSuccess: (updated: FieldConfigEntry[]) => {
      queryClient.setQueryData<FieldConfigEntry[]>(FIELD_CONFIG_QUERY_KEY, updated);
    },
  });
}
