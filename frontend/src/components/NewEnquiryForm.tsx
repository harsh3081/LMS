import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useCreateDirectEnquiry } from '../hooks/useEnquiries';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { ApiError, CreateDirectEnquiryInput } from '../api/client';
import { Button, FormField, Select, TextInput } from './ui';

/** Mirrors NewLeadForm's INDIA_MOBILE_REGEX exactly (AC3, server rule:
 * backend/src/common/mobile.util.ts). */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Mirrors ConvertLeadForm's POSITIVE_INTEGER_REGEX exactly (AC3, server
 * rule: backend/src/enquiries/dto/create-direct-enquiry.dto.ts). */
const POSITIVE_INTEGER_REGEX = /^\d+$/;

type FormValues = {
  customerName: string;
  mobile: string;
  sourceId: string;
  modelId: string;
  budget: string;
  variant: string;
  exchangeInterest: '' | 'true' | 'false';
  financeInterest: '' | 'true' | 'false';
};

/**
 * "New Enquiry" form (issue #26, "Create a Direct Enquiry (Walk-in/
 * Referred)") — captures all Lead-equivalent mandatory fields (AC2, mirrors
 * NewLeadForm) plus the qualifying details (AC2, mirrors ConvertLeadForm) in
 * one step, independent of any existing Lead (AC1). Submission is blocked
 * client-side if any mandatory field is missing/invalid (AC3), mirroring the
 * server-side CreateDirectEnquiryDto validation exactly.
 */
export function NewEnquiryForm() {
  const { data: sources } = useLeadSources();
  const { data: models } = useVehicleModels();
  const { data: fieldConfig } = useFieldConfig();
  const createDirectEnquiry = useCreateDirectEnquiry();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // AC3: mandatory-ness for the Lead-equivalent fields is config-driven
  // (issue #27, FR-04, mirrors NewLeadForm exactly). The qualifying-details
  // fields (budget/variant/exchangeInterest/financeInterest) stay statically
  // required, unchanged.
  const customerNameMandatory = isFieldMandatory(fieldConfig, 'customerName');
  const mobileMandatory = isFieldMandatory(fieldConfig, 'mobile');
  const sourceIdMandatory = isFieldMandatory(fieldConfig, 'sourceId');
  const modelIdMandatory = isFieldMandatory(fieldConfig, 'modelId');

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      customerName: '',
      mobile: '',
      sourceId: '',
      modelId: '',
      budget: '',
      variant: '',
      exchangeInterest: '',
      financeInterest: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: CreateDirectEnquiryInput = {
      customerName: values.customerName || undefined,
      mobile: values.mobile || undefined,
      sourceId: values.sourceId ? Number(values.sourceId) : undefined,
      modelId: values.modelId ? Number(values.modelId) : undefined,
      budget: Number(values.budget),
      variant: values.variant,
      exchangeInterest: values.exchangeInterest === 'true',
      financeInterest: values.financeInterest === 'true',
    };
    try {
      await createDirectEnquiry.mutateAsync(input);
      setSuccessMessage('Enquiry created successfully.');
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          const key = fieldError.field as keyof FormValues;
          if (key in values) {
            setError(key, { type: 'server', message: fieldError.message });
          }
        }
        if (!err.fieldErrors.length) {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to create enquiry.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="New Enquiry" className="space-y-1">
      <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
        <TextInput
          id="customerName"
          {...register('customerName', { required: customerNameMandatory ? 'Customer name is required' : false })}
        />
      </FormField>

      <FormField label="Mobile Number" htmlFor="mobile" error={errors.mobile?.message}>
        <TextInput
          id="mobile"
          {...register('mobile', {
            required: mobileMandatory ? 'Mobile is required' : false,
            validate: (value) =>
              !value || INDIA_MOBILE_REGEX.test(value) || 'Enter a valid 10-digit mobile number (leading 6-9)',
          })}
        />
      </FormField>

      <FormField label="Source" htmlFor="sourceId" error={errors.sourceId?.message}>
        <Select id="sourceId" {...register('sourceId', { required: sourceIdMandatory ? 'Source is required' : false })}>
          <option value="">Select a source</option>
          {(sources ?? []).map((s) => (
            <option key={s.sourceId} value={s.sourceId}>
              {s.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Model of Interest" htmlFor="modelId" error={errors.modelId?.message}>
        <Select id="modelId" {...register('modelId', { required: modelIdMandatory ? 'Model is required' : false })}>
          <option value="">Select a model</option>
          {(models ?? []).map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.name}
            </option>
          ))}
        </Select>
      </FormField>

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
        <Button type="submit" disabled={createDirectEnquiry.isPending}>
          Create Enquiry
        </Button>
      </div>
    </form>
  );
}
