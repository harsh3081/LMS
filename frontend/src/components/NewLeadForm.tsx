import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useConsultants } from '../hooks/useConsultants';
import { useCreateLead } from '../hooks/useLeads';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import {
  ApiError,
  BUYING_TIMELINES,
  CreateLeadInput,
  CUSTOMER_TYPES,
  DuplicateMatch,
  FUEL_TYPES,
  PAYMENT_MODES,
  PREFERRED_LANGUAGES,
  TRANSMISSIONS,
} from '../api/client';
import { Button, Checkbox, FormField, Select, TextInput, Textarea } from './ui';
import { DuplicateWarning } from './DuplicateWarning';
import { LeadFormSectionNav, LeadFormSection } from './LeadFormSectionNav';

/** Mirrors the frozen server-side India-mobile rule exactly (AC4):
 * backend/src/common/mobile.util.ts INDIA_MOBILE_REGEX. Duplicated here
 * (rather than shared across the two independent app packages) so the
 * client can validate inline without a network round-trip; both sides are
 * covered by their own test suite asserting the identical boundary cases. */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Mirrors backend/src/common/pin-code.util.ts INDIA_PIN_CODE_REGEX exactly
 * (issue #114, AC3). */
const INDIA_PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

/** issue #114 "Navigation" / AC1 / AC7 — one entry per form section, in
 * display order; also the source of the `id` each section wrapper carries
 * for LeadFormSectionNav's IntersectionObserver to find. */
const SECTIONS: LeadFormSection[] = [
  { id: 'section-customer-details', label: 'Customer Details' },
  { id: 'section-vehicle-interest', label: 'Vehicle Interest' },
  { id: 'section-exchange-vehicle', label: 'Exchange Vehicle' },
  { id: 'section-finance', label: 'Finance' },
  { id: 'section-source-assignment', label: 'Source & Assignment' },
  { id: 'section-followup-consent', label: 'Follow-up & Consent' },
];

/** The `lead_sources` seed row "Referrer Name relevant only when source =
 * Referral" is keyed off, matched by NAME (not a hardcoded id) so this stays
 * correct regardless of exactly which sourceId the seed data assigns —
 * mirrors migrations/1700000000004-SeedMasterData.ts's `'Referral'` string
 * exactly. Client-side conditional display only (AC2: every new field,
 * including referrerName, stays independently optional server-side — see
 * backend/src/leads/leads.service.ts's comment). */
const REFERRAL_SOURCE_NAME = 'Referral';

type FormValues = {
  customerName: string;
  mobile: string;
  sourceId: string;
  modelId: string;

  email: string;
  customerType: string;
  city: string;
  pinCode: string;
  preferredLanguage: string;

  variant: string;
  fuelType: string;
  transmission: string;
  budgetMin: string;
  budgetMax: string;
  buyingTimeline: string;

  exchangeInterest: boolean;
  currentVehicle: string;
  kmsDriven: string;
  registrationNumber: string;
  expectedValue: string;

  paymentMode: string;
  preferredFinancer: string;
  downPaymentCapacity: string;

  referrerName: string;
  assignedOwnerId: string;

  firstFollowUpAt: string;
  remarks: string;
  communicationConsentVerified: boolean;
};

const DEFAULT_VALUES: FormValues = {
  customerName: '',
  mobile: '',
  sourceId: '',
  modelId: '',
  email: '',
  customerType: '',
  city: '',
  pinCode: '',
  preferredLanguage: '',
  variant: '',
  fuelType: '',
  transmission: '',
  budgetMin: '',
  budgetMax: '',
  buyingTimeline: '',
  exchangeInterest: false,
  currentVehicle: '',
  kmsDriven: '',
  registrationNumber: '',
  expectedValue: '',
  paymentMode: '',
  preferredFinancer: '',
  downPaymentCapacity: '',
  referrerName: '',
  assignedOwnerId: '',
  firstFollowUpAt: '',
  remarks: '',
  communicationConsentVerified: false,
};

function numberOrUndefined(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

function strOrUndefined(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/** issue #118 (AC4): when rendered inside the New-Lead slide-over panel, the
 * panel should close itself shortly after a successful creation rather than
 * staying open — but the "Lead created successfully." confirmation should
 * still be visible for a beat first, matching how the standalone
 * `/leads/new` page has always shown that message. 1.5s is long enough to
 * read a short confirmation but short enough not to feel stuck. See
 * .phoenix-os/project/specs/118/NOTES.md for the fuller rationale. */
export const SUCCESS_AUTO_CLOSE_MS = 1500;

export interface NewLeadFormProps {
  /** Optional — called ~1.5s after a successful Lead creation (once the
   * success message has been shown), letting a parent (e.g. the New Lead
   * slide-over panel) close itself. The standalone `/leads/new` page does
   * not pass this and keeps its existing behavior unchanged: the success
   * message stays until the DSE submits again or navigates away. */
  onSuccess?: () => void;
}

export function NewLeadForm({ onSuccess }: NewLeadFormProps = {}) {
  const { data: sources } = useLeadSources();
  const { data: models } = useVehicleModels();
  const { data: consultants } = useConsultants();
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
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const mobileRegistration = register('mobile', {
    required: mobileMandatory ? 'Mobile is required' : false,
    validate: (value) =>
      !value || INDIA_MOBILE_REGEX.test(value) || 'Enter a valid 10-digit mobile number (leading 6-9)',
  });

  // issue #114: "Referrer Name relevant only when source = Referral" (AC2, client-side only).
  const selectedSourceId = watch('sourceId');
  const referralSourceId = (sources ?? []).find((s) => s.name === REFERRAL_SOURCE_NAME)?.sourceId;
  const showReferrerName = referralSourceId !== undefined && String(referralSourceId) === selectedSourceId;

  // Exchange Vehicle detail fields are only shown once the DSE checks
  // "Customer has a vehicle to exchange" — client-side only, mirrors
  // showReferrerName's conditional-display pattern exactly. The fields stay
  // independently optional server-side either way.
  const showExchangeDetails = watch('exchangeInterest');

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
      customerName: strOrUndefined(values.customerName),
      mobile: strOrUndefined(values.mobile),
      sourceId: numberOrUndefined(values.sourceId),
      modelId: numberOrUndefined(values.modelId),

      email: strOrUndefined(values.email),
      customerType: strOrUndefined(values.customerType) as CreateLeadInput['customerType'],
      city: strOrUndefined(values.city),
      pinCode: strOrUndefined(values.pinCode),
      preferredLanguage: strOrUndefined(values.preferredLanguage) as CreateLeadInput['preferredLanguage'],

      variant: strOrUndefined(values.variant),
      fuelType: strOrUndefined(values.fuelType) as CreateLeadInput['fuelType'],
      transmission: strOrUndefined(values.transmission) as CreateLeadInput['transmission'],
      budgetMin: numberOrUndefined(values.budgetMin),
      budgetMax: numberOrUndefined(values.budgetMax),
      buyingTimeline: strOrUndefined(values.buyingTimeline) as CreateLeadInput['buyingTimeline'],

      exchangeInterest: values.exchangeInterest || undefined,
      currentVehicle: strOrUndefined(values.currentVehicle),
      kmsDriven: numberOrUndefined(values.kmsDriven),
      registrationNumber: strOrUndefined(values.registrationNumber),
      expectedValue: numberOrUndefined(values.expectedValue),

      paymentMode: strOrUndefined(values.paymentMode) as CreateLeadInput['paymentMode'],
      preferredFinancer: strOrUndefined(values.preferredFinancer),
      downPaymentCapacity: numberOrUndefined(values.downPaymentCapacity),

      referrerName: strOrUndefined(values.referrerName),
      assignedOwnerId: strOrUndefined(values.assignedOwnerId),

      firstFollowUpAt: values.firstFollowUpAt ? new Date(values.firstFollowUpAt).toISOString() : undefined,
      remarks: strOrUndefined(values.remarks),
      communicationConsentVerified: values.communicationConsentVerified,

      acknowledgeDuplicate: duplicateMatches.length > 0 ? true : undefined,
    };
    try {
      await createLead.mutateAsync(input);
      setSuccessMessage('Lead created successfully.');
      setDuplicateMatches([]);
      setDuplicateAcknowledged(false);
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
  }

  const onSubmit = handleSubmit((values) => performCreate(values, duplicateAcknowledged));
  const onProceedAnyway = handleSubmit((values) => performCreate(values, true));

  return (
    <div className="flex gap-6">
      <div className="hidden shrink-0 basis-48 md:block">
        <LeadFormSectionNav sections={SECTIONS} />
      </div>

      <form onSubmit={onSubmit} noValidate aria-label="New Lead" className="min-w-0 flex-1 space-y-6">
        <section id="section-customer-details" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Customer Details
          </h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
              <TextInput
                id="customerName"
                {...register('customerName', {
                  required: customerNameMandatory ? 'Customer name is required' : false,
                })}
              />
            </FormField>

            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <TextInput id="email" type="email" {...register('email')} />
            </FormField>

            <FormField label="Customer Type" htmlFor="customerType" error={errors.customerType?.message}>
              <Select id="customerType" {...register('customerType')}>
                <option value="">Select a customer type</option>
                {CUSTOMER_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
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

            <div className="md:col-span-2">
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
            </div>

            <FormField label="City" htmlFor="city" error={errors.city?.message}>
              <TextInput id="city" {...register('city')} />
            </FormField>

            <FormField label="Pin Code" htmlFor="pinCode" error={errors.pinCode?.message}>
              <TextInput
                id="pinCode"
                {...register('pinCode', {
                  validate: (value) =>
                    !value || INDIA_PIN_CODE_REGEX.test(value) || 'Enter a valid 6-digit India pin code',
                })}
              />
            </FormField>

            <FormField
              label="Preferred Language"
              htmlFor="preferredLanguage"
              error={errors.preferredLanguage?.message}
            >
              <Select id="preferredLanguage" {...register('preferredLanguage')}>
                <option value="">Select a language</option>
                {PREFERRED_LANGUAGES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>

        <section id="section-vehicle-interest" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Vehicle Interest
          </h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Model of Interest" htmlFor="modelId" error={errors.modelId?.message}>
              <Select
                id="modelId"
                {...register('modelId', { required: modelIdMandatory ? 'Model is required' : false })}
              >
                <option value="">Select a model</option>
                {(models ?? []).map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Variant" htmlFor="variant" error={errors.variant?.message}>
              <TextInput id="variant" {...register('variant')} />
            </FormField>

            <FormField label="Fuel Type" htmlFor="fuelType" error={errors.fuelType?.message}>
              <Select id="fuelType" {...register('fuelType')}>
                <option value="">Select a fuel type</option>
                {FUEL_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Transmission" htmlFor="transmission" error={errors.transmission?.message}>
              <Select id="transmission" {...register('transmission')}>
                <option value="">Select a transmission</option>
                {TRANSMISSIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Budget Min (INR)" htmlFor="budgetMin" error={errors.budgetMin?.message}>
              <TextInput id="budgetMin" type="number" min={0} {...register('budgetMin')} />
            </FormField>

            <FormField label="Budget Max (INR)" htmlFor="budgetMax" error={errors.budgetMax?.message}>
              <TextInput id="budgetMax" type="number" min={0} {...register('budgetMax')} />
            </FormField>

            <FormField label="Buying Timeline" htmlFor="buyingTimeline" error={errors.buyingTimeline?.message}>
              <Select id="buyingTimeline" {...register('buyingTimeline')}>
                <option value="">Select a timeline</option>
                {BUYING_TIMELINES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>

        <section id="section-exchange-vehicle" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Exchange Vehicle
          </h2>
          <p className="text-sm text-slate-500">Optional — only relevant if the customer has a vehicle to exchange.</p>

          <div className="flex items-center gap-2 py-1">
            <Checkbox id="exchangeInterest" {...register('exchangeInterest')} />
            <label htmlFor="exchangeInterest" className="text-sm text-slate-700">
              Customer has a vehicle to exchange
            </label>
          </div>

          {showExchangeDetails && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
              <FormField label="Current Vehicle" htmlFor="currentVehicle" error={errors.currentVehicle?.message}>
                <TextInput id="currentVehicle" {...register('currentVehicle')} />
              </FormField>

              <FormField label="KMs Driven" htmlFor="kmsDriven" error={errors.kmsDriven?.message}>
                <TextInput id="kmsDriven" type="number" min={0} {...register('kmsDriven')} />
              </FormField>

              <FormField
                label="Registration Number"
                htmlFor="registrationNumber"
                error={errors.registrationNumber?.message}
              >
                <TextInput id="registrationNumber" {...register('registrationNumber')} />
              </FormField>

              <FormField label="Expected Value (INR)" htmlFor="expectedValue" error={errors.expectedValue?.message}>
                <TextInput id="expectedValue" type="number" min={0} {...register('expectedValue')} />
              </FormField>
            </div>
          )}
        </section>

        <section id="section-finance" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Finance
          </h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Payment Mode" htmlFor="paymentMode" error={errors.paymentMode?.message}>
              <Select id="paymentMode" {...register('paymentMode')}>
                <option value="">Select a payment mode</option>
                {PAYMENT_MODES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Preferred Financer"
              htmlFor="preferredFinancer"
              error={errors.preferredFinancer?.message}
            >
              <TextInput id="preferredFinancer" {...register('preferredFinancer')} />
            </FormField>

            <FormField
              label="Down Payment Capacity (INR)"
              htmlFor="downPaymentCapacity"
              error={errors.downPaymentCapacity?.message}
            >
              <TextInput id="downPaymentCapacity" type="number" min={0} {...register('downPaymentCapacity')} />
            </FormField>
          </div>
        </section>

        <section id="section-source-assignment" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Source & Assignment
          </h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Source" htmlFor="sourceId" error={errors.sourceId?.message}>
              <Select
                id="sourceId"
                {...register('sourceId', { required: sourceIdMandatory ? 'Source is required' : false })}
              >
                <option value="">Select a source</option>
                {(sources ?? []).map((s) => (
                  <option key={s.sourceId} value={s.sourceId}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {showReferrerName && (
              <FormField label="Referrer Name" htmlFor="referrerName" error={errors.referrerName?.message}>
                <TextInput id="referrerName" {...register('referrerName')} />
              </FormField>
            )}

            <FormField label="Assign to Consultant" htmlFor="assignedOwnerId" error={errors.assignedOwnerId?.message}>
              <Select id="assignedOwnerId" {...register('assignedOwnerId')}>
                <option value="">Assign to myself (default)</option>
                {(consultants ?? []).map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.displayName}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>

        <section id="section-followup-consent" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            Follow-up & Consent
          </h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField
              label="First Follow-up Date"
              htmlFor="firstFollowUpAt"
              error={errors.firstFollowUpAt?.message}
            >
              <TextInput id="firstFollowUpAt" type="date" {...register('firstFollowUpAt')} />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Remarks" htmlFor="remarks" error={errors.remarks?.message}>
                <Textarea id="remarks" {...register('remarks')} />
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
              Customer consents to receive calls, SMS, and WhatsApp communication regarding this enquiry. DND status
              verified.
            </label>
          </div>
          {errors.communicationConsentVerified && (
            <span role="alert" className="block text-sm text-red-600">
              {errors.communicationConsentVerified.message}
            </span>
          )}
        </section>

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
    </div>
  );
}
