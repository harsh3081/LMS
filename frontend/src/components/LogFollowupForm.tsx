import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLogFollowup } from '../hooks/useFollowups';
import { ApiError, LogFollowupInput } from '../api/client';
import { Button, FormField, Select, TextInput, Textarea } from './ui';

/** Mirrors backend/src/followups/entities/followup.entity.ts FOLLOWUP_TYPES
 * exactly (AC1) — duplicated client-side so the <Select> options render
 * without a network round-trip, same convention as every other
 * client-side-mirrored server rule in this codebase (e.g. NewEnquiryForm's
 * INDIA_MOBILE_REGEX). */
const FOLLOWUP_TYPES = ['Home Visit', 'Showroom Visit', 'Call'] as const;

/** NEW (issue #31, AC2) — mirrors
 * backend/src/enquiries/entities/enquiry.entity.ts ENQUIRY_TERMINAL_STATUSES
 * exactly. Deliberately just these two values (not the full status
 * vocabulary) — this form is not a general enquiry-status-update surface;
 * see .phoenix-os/project/specs/31/NOTES.md. */
const ENQUIRY_TERMINAL_STATUSES = ['Lost', 'Booked'] as const;

type FormValues = {
  type: '' | (typeof FOLLOWUP_TYPES)[number];
  remarks: string;
  nextFollowUpAt: string;
  enquiryStatus: '' | (typeof ENQUIRY_TERMINAL_STATUSES)[number];
};

export interface LogFollowupFormProps {
  enquiryId: string;
  /** Called after a successful log (e.g. to collapse an inline panel). */
  onLogged?: () => void;
}

/**
 * "Log a Follow-up" form (issue #30 AC1-AC5, extended by issue #31 AC1-AC4)
 * — a follow-up type selector (Home Visit / Showroom Visit / Call, AC1/AC4,
 * required), a mandatory free-text remarks field (AC2/AC3), a Next
 * Follow-up Date picker, and an "Enquiry Outcome" selector for the terminal-
 * status exception (AC2: "unless Enquiry status is set to a terminal state
 * (Lost/Booked)"). The Next Follow-up Date is required UNLESS an outcome is
 * selected — mirrors LogFollowupDto/FollowupsService's cross-field rule
 * exactly (backend/src/followups/followups.service.ts
 * assertNextFollowUpOrTerminalStatus). Mirrors ConvertLeadForm's structure
 * (inline qualifying-details form scoped to one parent record, server
 * field-error mapping via `setError`).
 */
export function LogFollowupForm({ enquiryId, onLogged }: LogFollowupFormProps) {
  const logFollowup = useLogFollowup(enquiryId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { type: '', remarks: '', nextFollowUpAt: '', enquiryStatus: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: LogFollowupInput = {
      type: values.type as LogFollowupInput['type'],
      remarks: values.remarks,
      ...(values.nextFollowUpAt ? { nextFollowUpAt: values.nextFollowUpAt } : {}),
      ...(values.enquiryStatus ? { enquiryStatus: values.enquiryStatus } : {}),
    };
    try {
      await logFollowup.mutateAsync(input);
      setSuccessMessage('Follow-up logged successfully.');
      reset();
      onLogged?.();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          const key = fieldError.field as keyof FormValues;
          if (key === 'type' || key === 'remarks' || key === 'nextFollowUpAt' || key === 'enquiryStatus') {
            setError(key, { type: 'server', message: fieldError.message });
          }
        }
        if (!err.fieldErrors.length) {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to log follow-up.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Log Follow-up" className="space-y-1">
      <FormField label="Follow-up Type" htmlFor="type" error={errors.type?.message}>
        <Select id="type" {...register('type', { required: 'Follow-up type is required' })}>
          <option value="">Select a type</option>
          {FOLLOWUP_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Remarks" htmlFor="remarks" error={errors.remarks?.message}>
        <Textarea
          id="remarks"
          {...register('remarks', {
            required: 'Remarks are required',
            validate: (value) => value.trim().length > 0 || 'Remarks are required',
          })}
        />
      </FormField>

      <FormField label="Next Follow-up Date" htmlFor="nextFollowUpAt" error={errors.nextFollowUpAt?.message}>
        <TextInput
          id="nextFollowUpAt"
          type="date"
          {...register('nextFollowUpAt', {
            validate: (value, formValues) =>
              value || formValues.enquiryStatus
                ? true
                : 'Next follow-up date is required unless the enquiry is marked Lost or Booked',
          })}
        />
      </FormField>

      <FormField label="Enquiry Outcome (optional)" htmlFor="enquiryStatus" error={errors.enquiryStatus?.message}>
        <Select id="enquiryStatus" {...register('enquiryStatus')}>
          <option value="">Keep enquiry open</option>
          {ENQUIRY_TERMINAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </FormField>

      {formError && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      {successMessage && (
        <div role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="pt-3">
        <Button type="submit" disabled={logFollowup.isPending}>
          Log Follow-up
        </Button>
      </div>
    </form>
  );
}
