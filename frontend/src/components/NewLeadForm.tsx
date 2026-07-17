import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useCreateLead } from '../hooks/useLeads';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { ApiError, CreateLeadInput, DuplicateMatch } from '../api/client';
import { Button, FormField, Select, TextInput } from './ui';
import { DuplicateWarning } from './DuplicateWarning';

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
  const duplicateCheck = useDuplicateCheck();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // issue #29 (AC1/AC2/AC3/AC5): matches from GET /api/v1/duplicates for the
  // currently entered mobile number, and whether the DSE has dismissed the
  // resulting warning and chosen to proceed anyway.
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

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

  const mobileRegistration = register('mobile', {
    required: mobileMandatory ? 'Mobile is required' : false,
    validate: (value) =>
      !value || INDIA_MOBILE_REGEX.test(value) || 'Enter a valid 10-digit mobile number (leading 6-9)',
  });

  /** AC1/AC5: real-time, synchronous check as the DSE finishes entering the
   * mobile number (on blur) — not a batch job, no page reload. A
   * network/API failure here is swallowed deliberately: the duplicate check
   * is advisory only and must never block or interrupt data entry. */
  async function handleMobileBlur(value: string) {
    if (!INDIA_MOBILE_REGEX.test(value)) return;
    try {
      const matches = await duplicateCheck.mutateAsync(value);
      setDuplicateMatches(matches);
      setDuplicateAcknowledged(false);
    } catch {
      // advisory only — see comment above
    }
  }

  /** AC3: the duplicate check never blocks server-side — this client-side
   * gate is the ONLY place creation is withheld, and only until the DSE
   * explicitly acknowledges the warning (or edits the mobile number away
   * from the matched value, which clears `duplicateMatches` on change). */
  async function performCreate(values: FormValues, acknowledged: boolean) {
    if (duplicateMatches.length > 0 && !acknowledged) {
      return;
    }
    setSuccessMessage(null);
    setFormError(null);
    const input: CreateLeadInput = {
      customerName: values.customerName || undefined,
      mobile: values.mobile || undefined,
      sourceId: values.sourceId ? Number(values.sourceId) : undefined,
      modelId: values.modelId ? Number(values.modelId) : undefined,
      acknowledgeDuplicate: duplicateMatches.length > 0 ? true : undefined,
    };
    try {
      await createLead.mutateAsync(input);
      setSuccessMessage('Lead created successfully.');
      setDuplicateMatches([]);
      setDuplicateAcknowledged(false);
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
  }

  const onSubmit = handleSubmit((values) => performCreate(values, duplicateAcknowledged));
  const onProceedAnyway = handleSubmit((values) => performCreate(values, true));

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
          {...mobileRegistration}
          onChange={(e) => {
            void mobileRegistration.onChange(e);
            setDuplicateMatches([]);
            setDuplicateAcknowledged(false);
          }}
          onBlur={(e) => {
            void mobileRegistration.onBlur(e);
            void handleMobileBlur(e.target.value);
          }}
        />
      </FormField>

      <DuplicateWarning
        matches={duplicateMatches}
        acknowledged={duplicateAcknowledged}
        onProceed={() => {
          setDuplicateAcknowledged(true);
          void onProceedAnyway();
        }}
        onCancel={() => {
          setDuplicateMatches([]);
          setDuplicateAcknowledged(false);
        }}
      />

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
