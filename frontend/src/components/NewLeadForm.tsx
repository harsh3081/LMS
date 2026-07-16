import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useCreateLead } from '../hooks/useLeads';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { ApiError, CreateLeadInput } from '../api/client';
import { Button, FormField, Select, TextInput } from './ui';

/** Mirrors the frozen server-side India-mobile rule exactly (AC4):
 * backend/src/common/mobile.util.ts INDIA_MOBILE_REGEX. Duplicated here
 * (rather than shared across the two independent app packages) so the
 * client can validate inline without a network round-trip; both sides are
 * covered by their own test suite asserting the identical boundary cases. */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

type FormValues = {
  customerName: string;
  mobile: string;
  sourceId: string;
  modelId: string;
};

export function NewLeadForm() {
  const { data: sources } = useLeadSources();
  const { data: models } = useVehicleModels();
  const { data: fieldConfig } = useFieldConfig();
  const createLead = useCreateLead();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // AC3: mandatory-ness is config-driven (issue #27, FR-04) — defaults to
  // required while the config is loading/unknown (fail-safe, matches the
  // pre-#27 hardcoded behavior).
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
  } = useForm<FormValues>({ defaultValues: { customerName: '', mobile: '', sourceId: '', modelId: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: CreateLeadInput = {
      customerName: values.customerName || undefined,
      mobile: values.mobile || undefined,
      sourceId: values.sourceId ? Number(values.sourceId) : undefined,
      modelId: values.modelId ? Number(values.modelId) : undefined,
    };
    try {
      await createLead.mutateAsync(input);
      setSuccessMessage('Lead created successfully.');
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          const key = fieldError.field as keyof FormValues;
          if (key === 'customerName' || key === 'mobile' || key === 'sourceId' || key === 'modelId') {
            setError(key, { type: 'server', message: fieldError.message });
          }
        }
        if (!err.fieldErrors.length) {
          setFormError(err.message);
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Failed to create lead.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="New Lead" className="space-y-1">
      <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
        <TextInput
          id="customerName"
          {...register('customerName', {
            required: customerNameMandatory ? 'Customer name is required' : false,
          })}
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
        <Button type="submit" disabled={createLead.isPending}>
          Create Lead
        </Button>
      </div>
    </form>
  );
}
