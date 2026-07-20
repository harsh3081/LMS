import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useCreateLead } from '../hooks/useLeads';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { ApiError, CreateLeadInput } from '../api/client';
import { Button, Checkbox, FormField, Select, TextInput, Textarea } from './ui';

/** Mirrors the frozen server-side India-mobile rule exactly (AC4):
 * backend/src/common/mobile.util.ts INDIA_MOBILE_REGEX. Duplicated here
 * (rather than shared across the two independent app packages) so the
 * client can validate inline without a network round-trip; both sides are
 * covered by their own test suite asserting the identical boundary cases. */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

type FormValues = {
  customerName: string;
  mobile: string;
  email: string;
  modelId: string;
  sourceId: string;
  remarks: string;
  communicationConsentVerified: boolean;
};

const DEFAULT_VALUES: FormValues = {
  customerName: '',
  mobile: '',
  email: '',
  modelId: '',
  sourceId: '',
  remarks: '',
  communicationConsentVerified: false,
};

function strOrUndefined(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/** issue #118 (AC4): when rendered inside the New-Lead slide-over panel, the
 * panel should close itself shortly after a successful creation rather than
 * staying open — but the "Lead created successfully." confirmation should
 * still be visible for a beat first. 1.5s is long enough to read a short
 * confirmation but short enough not to feel stuck. Re-exported/reused by
 * ConvertLeadForm.tsx and NewEnquiryForm.tsx — keep this name/value stable. */
export const SUCCESS_AUTO_CLOSE_MS = 1500;

export interface NewLeadFormProps {
  /** Optional — called ~1.5s after a successful Lead creation (once the
   * success message has been shown), letting a parent (e.g. the New Lead
   * slide-over panel) close itself. */
  onSuccess?: () => void;
}

/** Simplified New Lead form (direct user request) — replaces the former
 * 6-section, 20+-field form (issues #114/#118/#120/#122) with exactly the 6
 * fields a DSE actually needs to capture a walk-in/call lead on the spot:
 * Customer Name, Phone Number, Email, Model Interest, Lead Source, Notes.
 *
 * The dropped fields (Customer Type/City/Pin Code/Preferred Language,
 * Vehicle Interest details, the whole Exchange Vehicle and Finance
 * sections, Referrer Name, Assign to Consultant, First Follow-up Date, and
 * the duplicate-mobile warning UI) are NOT deleted from the data model —
 * every one of those Lead columns/DTO fields stays fully intact and
 * reachable via ConvertLeadForm/the Lead Detail page. They're simply not
 * collected at initial-capture time anymore; a DSE can fill them in later
 * during conversion.
 *
 * One field that could NOT be dropped: `communicationConsentVerified`. It
 * is a hard, backend-enforced compliance gate (TRAI DND relevance —
 * CreateLeadDto rejects any request where it isn't literally `true`, no
 * `@IsOptional()`), not just a UI nicety — omitting it from this form would
 * make every submission fail with a 400. Kept as a single compact checkbox
 * below Notes.
 */
export function NewLeadForm({ onSuccess }: NewLeadFormProps = {}) {
  const { data: sources } = useLeadSources();
  const { data: models } = useVehicleModels();
  const { data: fieldConfig } = useFieldConfig();
  const createLead = useCreateLead();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // issue #118 (AC4): tracks the pending auto-close timer so it can be
  // cleared on unmount (e.g. the panel is closed/re-opened before the timer
  // fires) — avoids calling onSuccess or touching state after unmount.
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // AC3 (issue #27): mandatory-ness of these 4 fields is config-driven,
  // still admin-editable via the Field Configuration page — defaults to
  // required while the config is loading/unknown (fail-safe).
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
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: CreateLeadInput = {
      customerName: strOrUndefined(values.customerName),
      mobile: strOrUndefined(values.mobile),
      email: strOrUndefined(values.email),
      modelId: values.modelId === '' ? undefined : Number(values.modelId),
      sourceId: values.sourceId === '' ? undefined : Number(values.sourceId),
      remarks: strOrUndefined(values.remarks),
      communicationConsentVerified: values.communicationConsentVerified,
    };
    try {
      await createLead.mutateAsync(input);
      setSuccessMessage('Lead created successfully.');
      reset();
      if (onSuccess) {
        successTimeoutRef.current = setTimeout(() => {
          onSuccess();
        }, SUCCESS_AUTO_CLOSE_MS);
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const fieldError of err.fieldErrors) {
          const key = fieldError.field as keyof FormValues;
          if (key in DEFAULT_VALUES) {
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
    <form onSubmit={onSubmit} noValidate aria-label="New Lead" className="space-y-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
        <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
          <TextInput
            id="customerName"
            placeholder="Enter full name"
            {...register('customerName', {
              required: customerNameMandatory ? 'Customer name is required' : false,
            })}
          />
        </FormField>

        <FormField label="Phone Number" htmlFor="mobile" error={errors.mobile?.message}>
          <TextInput
            id="mobile"
            placeholder="+91 XXXXX XXXXX"
            {...register('mobile', {
              required: mobileMandatory ? 'Phone number is required' : false,
              validate: (value) =>
                !value || INDIA_MOBILE_REGEX.test(value) || 'Enter a valid 10-digit mobile number (leading 6-9)',
            })}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Email Address" htmlFor="email" error={errors.email?.message}>
            <TextInput id="email" type="email" placeholder="customer@email.com" {...register('email')} />
          </FormField>
        </div>

        <FormField label="Model Interest" htmlFor="modelId" error={errors.modelId?.message}>
          <Select
            id="modelId"
            {...register('modelId', { required: modelIdMandatory ? 'Model is required' : false })}
          >
            <option value="">Select Model</option>
            {(models ?? []).map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Lead Source" htmlFor="sourceId" error={errors.sourceId?.message}>
          <Select
            id="sourceId"
            {...register('sourceId', { required: sourceIdMandatory ? 'Source is required' : false })}
          >
            <option value="">Select Source</option>
            {(sources ?? []).map((s) => (
              <option key={s.sourceId} value={s.sourceId}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Notes" htmlFor="remarks" error={errors.remarks?.message}>
            <Textarea id="remarks" placeholder="Additional information…" {...register('remarks')} />
          </FormField>
        </div>
      </div>

      <div className="flex items-start gap-2 py-1">
        <Checkbox
          id="communicationConsentVerified"
          {...register('communicationConsentVerified', {
            required: 'Consent must be confirmed before the lead can be submitted',
          })}
        />
        <label htmlFor="communicationConsentVerified" className="text-sm text-slate-700">
          Customer consents to receive calls, SMS, and WhatsApp communication regarding this enquiry.
        </label>
      </div>
      {errors.communicationConsentVerified && (
        <span role="alert" className="block text-sm text-red-600">
          {errors.communicationConsentVerified.message}
        </span>
      )}

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
