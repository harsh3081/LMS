import { useEffect, useState } from 'react';
import { useFieldConfig, useUpdateFieldConfig } from '../hooks/useFieldConfig';
import { ApiError } from '../api/client';
import { Button, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from './ui';

/**
 * Admin field-configuration screen (issue #27 AC1/AC2/AC3/AC5): lists every
 * configurable field with a mandatory/optional toggle and a single Save
 * action that PUTs every toggle in one call (FieldConfigService.updateMany
 * applies them atomically and audit-logs each change, AC5).
 *
 * PUT /api/v1/field-config is capability-gated server-side
 * (`manage-field-config`, 403 for anyone else) — this page does not attempt
 * to hide itself from non-admin users client-side (there is currently no
 * endpoint exposing the caller's own capabilities to the SPA), so a 403 on
 * Save is surfaced as an explicit permission error instead (see NOTES.md
 * "Known gaps").
 */
export function FieldConfigForm() {
  const { data: fieldConfig, isLoading } = useFieldConfig();
  const updateFieldConfig = useUpdateFieldConfig();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (fieldConfig) {
      setToggles(Object.fromEntries(fieldConfig.map((f) => [f.fieldName, f.mandatory])));
    }
  }, [fieldConfig]);

  const onSave = async () => {
    setSuccessMessage(null);
    setFormError(null);
    try {
      await updateFieldConfig.mutateAsync({
        fields: Object.entries(toggles).map(([fieldName, mandatory]) => ({ fieldName, mandatory })),
      });
      setSuccessMessage('Field configuration saved.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setFormError('You do not have permission to update the field configuration.');
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to save field configuration.');
      }
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading configuration…</p>;

  return (
    <div>
      <Table aria-label="Field Configuration">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Field</TableHeaderCell>
            <TableHeaderCell>Mandatory</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(fieldConfig ?? []).map((field) => {
            const checkboxId = `mandatory-${field.fieldName}`;
            return (
              <TableRow key={field.fieldName}>
                <TableCell className="font-medium text-slate-900">{field.label}</TableCell>
                <TableCell>
                  <label htmlFor={checkboxId} className="inline-flex items-center gap-2">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={toggles[field.fieldName] ?? field.mandatory}
                      onChange={(e) =>
                        setToggles((current) => ({ ...current, [field.fieldName]: e.target.checked }))
                      }
                    />
                    <span>Mandatory</span>
                  </label>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {formError && (
        <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      {successMessage && (
        <div role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="pt-4">
        <Button type="button" onClick={onSave} disabled={updateFieldConfig.isPending}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
