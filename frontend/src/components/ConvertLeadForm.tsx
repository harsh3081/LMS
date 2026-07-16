import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useConvertLead } from '../hooks/useEnquiries';
import { ApiError, ConvertLeadInput } from '../api/client';
import { Button, FormField, Select, TextInput } from './ui';

/** Positive-integer-only pattern (whole rupees) — mirrors the frozen
 * server-side rule exactly (AC3): backend/src/enquiries/dto/convert-lead.dto.ts
 * (`@IsInt` + `@IsPositive`). Duplicated here (rather than shared across the
 * two independent app packages) so the client can validate inline without a
 * network round-trip, same convention as NewLeadForm's INDIA_MOBILE_REGEX. */
const POSITIVE_INTEGER_REGEX = /^\d+$/;

type FormValues = {
  budget: string;
  variant: string;
  exchangeInterest: '' | 'true' | 'false';
  financeInterest: '' | 'true' | 'false';
};

export interface ConvertLeadFormProps {
  leadId: string;
  /** Called after a successful conversion (e.g. to collapse the inline panel). */
  onConverted?: () => void;
}

/**
 * Inline "Convert to Enquiry" qualifying-details form (issue #25,
 * tech-design.md Component 6) — rendered inline under a queue row (no new
 * route, resolved Clarification). Mirrors NewLeadForm's structure: 4
 * qualifying fields, inline validation matching the server rules, submit/
 * success/error handling, and server field-error mapping via `setError`.
 */
export function ConvertLeadForm({ leadId, onConverted }: ConvertLeadFormProps) {
  const convertLead = useConvertLead();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { budget: '', variant: '', exchangeInterest: '', financeInterest: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: ConvertLeadInput = {
      budget: Number(values.budget),
      variant: values.variant,
      exchangeInterest: values.exchangeInterest === 'true',
      financeInterest: values.financeInterest === 'true',
    };
    try {
      await convertLead.mutateAsync({ leadId, input });
      setSuccessMessage('Lead converted — Enquiry created successfully.');
      reset();
      onConverted?.();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          const key = fieldError.field as keyof FormValues;
          if (key === 'budget' || key === 'variant' || key === 'exchangeInterest' || key === 'financeInterest') {
            setError(key, { type: 'server', message: fieldError.message });
          }
        }
        if (!err.fieldErrors.length) {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to convert lead.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Convert to Enquiry" className="space-y-1">
      <FormField label="Budget (INR)" htmlFor="budget" error={errors.budget?.message}>
        <TextInput
          id="budget"
          {...register('budget', {
            required: 'Budget is required',
            validate: (value) =>
              (POSITIVE_INTEGER_REGEX.test(value) && Number(value) > 0) || 'Budget must be a positive integer',
          })}
        />
      </FormField>

      <FormField label="Variant" htmlFor="variant" error={errors.variant?.message}>
        <TextInput id="variant" {...register('variant', { required: 'Variant is required' })} />
      </FormField>

      <FormField label="Exchange Interest" htmlFor="exchangeInterest" error={errors.exchangeInterest?.message}>
        <Select id="exchangeInterest" {...register('exchangeInterest', { required: 'Exchange interest is required' })}>
          <option value="">Select</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </FormField>

      <FormField label="Finance Interest" htmlFor="financeInterest" error={errors.financeInterest?.message}>
        <Select id="financeInterest" {...register('financeInterest', { required: 'Finance interest is required' })}>
          <option value="">Select</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
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
        <Button type="submit" disabled={convertLead.isPending}>
          Convert
        </Button>
      </div>
    </form>
  );
}
