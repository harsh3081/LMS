import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useConvertLead } from '../hooks/useEnquiries';
import { useLead } from '../hooks/useLeads';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useConsultants } from '../hooks/useConsultants';
import {
  ApiError,
  CONTACT_VERIFIED_OPTIONS,
  ConvertLeadInput,
  EXCHANGE_EVALUATION_STATUSES,
  FINANCE_APPLICATION_STATUSES,
  FINANCIER_OPTIONS,
  FUEL_TYPES,
  INSURANCE_PREFERENCES,
  INTENT_RATINGS,
  QUOTATION_SHARED_VIA_OPTIONS,
  SHOWROOM_VISIT_OPTIONS,
  TEST_DRIVE_STATUSES,
  TRANSMISSIONS,
  WARRANTY_INTEREST_OPTIONS,
} from '../api/client';
import { Button, Checkbox, DetailField, FormField, Select, TextInput, Textarea } from './ui';
import { LeadFormSectionNav, LeadFormSection } from './LeadFormSectionNav';
import { SUCCESS_AUTO_CLOSE_MS } from './NewLeadForm';

/** issue #132: re-exported so callers (e.g. the LeadQueue per-row Convert to
 * Enquiry slide-over panel and this file's own spec) can import the
 * auto-close delay from ConvertLeadForm directly, without reaching into
 * NewLeadForm's module. The constant itself is NOT duplicated — see the
 * import above and NOTES.md ("ConvertLeadForm delayed-close mechanism") for
 * why reusing NewLeadForm's single exported value was judged cleaner than
 * defining a second, identically-valued constant here. Mirrors
 * NewEnquiryForm.tsx's identical re-export (issue #130). */
export { SUCCESS_AUTO_CLOSE_MS };

/** Positive-integer-only pattern (whole rupees) — mirrors the frozen
 * server-side rule exactly (AC3): backend/src/enquiries/dto/convert-lead.dto.ts
 * (`@IsInt` + `@IsPositive`). Duplicated here (rather than shared across the
 * two independent app packages) so the client can validate inline without a
 * network round-trip, same convention as NewLeadForm's INDIA_MOBILE_REGEX. */
const POSITIVE_INTEGER_REGEX = /^\d+$/;

const NOT_PROVIDED = '—';

/** issue #124 "Navigation" — one entry per form section, in display order;
 * also the source of the `id` each section wrapper carries for
 * LeadFormSectionNav's IntersectionObserver to find. Section 0 (Customer
 * Information) is included in the nav even though it carries no form
 * fields — it is still a visible, navigable section of the page. */
const SECTIONS: LeadFormSection[] = [
  { id: 'section-customer-information', label: 'Customer Information' },
  { id: 'section-vehicle-information', label: 'Vehicle Information' },
  { id: 'section-qualification', label: 'Qualification' },
  { id: 'section-commercial', label: 'Commercial' },
  { id: 'section-finance', label: 'Finance' },
  { id: 'section-exchange-evaluation', label: 'Exchange Evaluation' },
  { id: 'section-test-drive-engagement', label: 'Test Drive & Engagement' },
  { id: 'section-document-checklist', label: 'Document Checklist' },
];

type FormValues = {
  budget: string;
  variant: string;
  exchangeInterest: '' | 'true' | 'false';
  financeInterest: '' | 'true' | 'false';

  modelId: string;
  fuelType: string;
  transmission: string;
  colorFirstPreference: string;
  colorSecondPreference: string;
  accessoriesInterest: string;
  competitorConsideration: string;

  contactVerified: string;
  intentRating: string;
  expectedClosureDate: string;
  showroomVisits: string;

  quotationNumber: string;
  quotedOnRoadPrice: string;
  discountDiscussed: string;
  insurancePreference: string;
  extendedWarrantyInterest: string;
  corporateDiscountEligible: string;

  financeApplicationStatus: string;
  financier: string;
  loanAmountSought: string;
  tenureAndEmiDiscussed: string;

  exchangeEvaluationStatus: string;
  exchangeEvaluatedBy: string;
  exchangeEvaluatedPrice: string;
  exchangeCustomerExpectation: string;

  testDriveStatus: string;
  testDriveDateTime: string;
  quotationSharedVia: string;
  nextActionOwnerId: string;
  testDriveFeedback: string;

  panCardVerified: boolean;
  addressProofVerified: boolean;
  incomeProofVerified: boolean;
  gstDetailsVerified: boolean;
};

const DEFAULT_VALUES: FormValues = {
  budget: '',
  variant: '',
  exchangeInterest: '',
  financeInterest: '',
  modelId: '',
  fuelType: '',
  transmission: '',
  colorFirstPreference: '',
  colorSecondPreference: '',
  accessoriesInterest: '',
  competitorConsideration: '',
  contactVerified: '',
  intentRating: '',
  expectedClosureDate: '',
  showroomVisits: '',
  quotationNumber: '',
  quotedOnRoadPrice: '',
  discountDiscussed: '',
  insurancePreference: '',
  extendedWarrantyInterest: '',
  corporateDiscountEligible: '',
  financeApplicationStatus: '',
  financier: '',
  loanAmountSought: '',
  tenureAndEmiDiscussed: '',
  exchangeEvaluationStatus: '',
  exchangeEvaluatedBy: '',
  exchangeEvaluatedPrice: '',
  exchangeCustomerExpectation: '',
  testDriveStatus: '',
  testDriveDateTime: '',
  quotationSharedVia: '',
  nextActionOwnerId: '',
  testDriveFeedback: '',
  panCardVerified: false,
  addressProofVerified: false,
  incomeProofVerified: false,
  gstDetailsVerified: false,
};

function numberOrUndefined(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

function strOrUndefined(value: string): string | undefined {
  return value === '' ? undefined : value;
}

function displayText(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : NOT_PROVIDED;
}

export interface ConvertLeadFormProps {
  leadId: string;
  /** Optional — called ~1.5s (SUCCESS_AUTO_CLOSE_MS) after a successful
   * conversion (once the "Enquiry created successfully." message has been
   * shown), letting a parent (e.g. the LeadQueue per-row Convert to Enquiry
   * slide-over panel, issue #132) close itself. Mirrors NewLeadForm's
   * `onSuccess` prop / NewEnquiryForm's `onSuccess` prop exactly (issue
   * #118/#130) — the delay exists so the success message is visible for a
   * beat rather than flashing and vanishing the instant the panel closes. */
  onConverted?: () => void;
}

/**
 * Sectioned "Convert to Enquiry" form (issue #124 — rewrite of the original
 * 4-field inline `ConvertLeadForm`). Mirrors NewLeadForm's structure (issue
 * #114/#120): a side-nav (`LeadFormSectionNav`, reused unmodified) + one
 * `<section>` per SECTIONS entry, each laid out in NewLeadForm's exact
 * 2-column grid convention (`grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2`,
 * wide elements via `md:col-span-2`).
 *
 * Section 0 ("Customer Information") is READ-ONLY — sourced from
 * `useLead(leadId)` (the existing GET /api/v1/leads/:leadId endpoint, issue
 * #116) via the `DetailField` primitive (issue #116), and is NOT part of the
 * submitted `ConvertLeadInput` payload at all (AC1). Section 1 ("Vehicle
 * Information") is EDITABLE but pre-filled as form defaults from the same
 * Lead's `modelId`/`variant`/`fuelType`/`transmission` once it loads (a
 * one-time `reset()` call in a `useEffect`, guarded so it only fires once —
 * see the `prefilledRef` below — so it never clobbers something the DSE has
 * already started typing if the Lead query happens to re-resolve).
 *
 * `budget`/`variant`/`exchangeInterest`/`financeInterest` keep their EXACT
 * original required-ness and client-side validation (AC3) — every other
 * field is optional (AC4), mirroring ConvertLeadDto's server-side contract.
 *
 * MODIFIED (issue #132): this form now renders inside a right-docked
 * `SlideOver` panel (LeadQueue's per-row "Convert to Enquiry" action) rather
 * than a dedicated `/leads/:leadId/convert` page. `onConverted` used to fire
 * synchronously the instant conversion succeeded, which would have made the
 * success message flash and vanish instantly if wired straight to close a
 * panel — this now uses the same delayed-close mechanism as
 * NewLeadForm/NewEnquiryForm (`successTimeoutRef` + `SUCCESS_AUTO_CLOSE_MS`),
 * scheduled only when `onConverted` was actually passed, and cleared on
 * unmount. This component's internal 8-section field layout/logic is
 * otherwise unchanged.
 */
export function ConvertLeadForm({ leadId, onConverted }: ConvertLeadFormProps) {
  const { data: lead } = useLead(leadId);
  const { data: models } = useVehicleModels();
  const { data: consultants } = useConsultants();
  const convertLead = useConvertLead();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // issue #132 (mirrors NewLeadForm's issue #118 AC4): tracks the pending
  // auto-close timer so it can be cleared on unmount (e.g. the slide-over
  // panel is closed/re-opened before the timer fires) — avoids calling
  // onConverted or touching state after unmount.
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  // Pre-fill Section 1 (Vehicle Information) from the Lead once it loads —
  // only ever once (AC1: "pre-filled ... via the existing Lead-detail
  // endpoint"), so a background refetch of the Lead never overwrites
  // in-progress edits.
  useEffect(() => {
    if (!lead) return;
    reset((current) => ({
      ...current,
      modelId: current.modelId || (lead.modelId != null ? String(lead.modelId) : ''),
      variant: current.variant || lead.variant || '',
      fuelType: current.fuelType || lead.fuelType || '',
      transmission: current.transmission || lead.transmission || '',
    }));
    // `reset` is stable across renders (react-hook-form guarantee) — omitted
    // from deps deliberately, mirrors NewLeadForm's SlideOver-close-timer
    // effect's same convention for a stable function reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead]);

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMessage(null);
    setFormError(null);
    const input: ConvertLeadInput = {
      budget: Number(values.budget),
      variant: values.variant,
      exchangeInterest: values.exchangeInterest === 'true',
      financeInterest: values.financeInterest === 'true',

      modelId: numberOrUndefined(values.modelId),
      fuelType: strOrUndefined(values.fuelType) as ConvertLeadInput['fuelType'],
      transmission: strOrUndefined(values.transmission) as ConvertLeadInput['transmission'],
      colorFirstPreference: strOrUndefined(values.colorFirstPreference),
      colorSecondPreference: strOrUndefined(values.colorSecondPreference),
      accessoriesInterest: strOrUndefined(values.accessoriesInterest),
      competitorConsideration: strOrUndefined(values.competitorConsideration),

      contactVerified: strOrUndefined(values.contactVerified) as ConvertLeadInput['contactVerified'],
      intentRating: strOrUndefined(values.intentRating) as ConvertLeadInput['intentRating'],
      expectedClosureDate: strOrUndefined(values.expectedClosureDate),
      showroomVisits: strOrUndefined(values.showroomVisits) as ConvertLeadInput['showroomVisits'],

      quotationNumber: strOrUndefined(values.quotationNumber),
      quotedOnRoadPrice: numberOrUndefined(values.quotedOnRoadPrice),
      discountDiscussed: strOrUndefined(values.discountDiscussed),
      insurancePreference: strOrUndefined(values.insurancePreference) as ConvertLeadInput['insurancePreference'],
      extendedWarrantyInterest: strOrUndefined(
        values.extendedWarrantyInterest,
      ) as ConvertLeadInput['extendedWarrantyInterest'],
      corporateDiscountEligible: strOrUndefined(values.corporateDiscountEligible),

      financeApplicationStatus: strOrUndefined(
        values.financeApplicationStatus,
      ) as ConvertLeadInput['financeApplicationStatus'],
      financier: strOrUndefined(values.financier) as ConvertLeadInput['financier'],
      loanAmountSought: numberOrUndefined(values.loanAmountSought),
      tenureAndEmiDiscussed: strOrUndefined(values.tenureAndEmiDiscussed),

      exchangeEvaluationStatus: strOrUndefined(
        values.exchangeEvaluationStatus,
      ) as ConvertLeadInput['exchangeEvaluationStatus'],
      exchangeEvaluatedBy: strOrUndefined(values.exchangeEvaluatedBy),
      exchangeEvaluatedPrice: numberOrUndefined(values.exchangeEvaluatedPrice),
      exchangeCustomerExpectation: numberOrUndefined(values.exchangeCustomerExpectation),

      testDriveStatus: strOrUndefined(values.testDriveStatus) as ConvertLeadInput['testDriveStatus'],
      testDriveDateTime: values.testDriveDateTime ? new Date(values.testDriveDateTime).toISOString() : undefined,
      quotationSharedVia: strOrUndefined(values.quotationSharedVia) as ConvertLeadInput['quotationSharedVia'],
      nextActionOwnerId: strOrUndefined(values.nextActionOwnerId),
      testDriveFeedback: strOrUndefined(values.testDriveFeedback),

      panCardVerified: values.panCardVerified || undefined,
      addressProofVerified: values.addressProofVerified || undefined,
      incomeProofVerified: values.incomeProofVerified || undefined,
      gstDetailsVerified: values.gstDetailsVerified || undefined,
    };

    try {
      await convertLead.mutateAsync({ leadId, input });
      setSuccessMessage('Lead converted — Enquiry created successfully.');
      if (onConverted) {
        successTimeoutRef.current = setTimeout(() => {
          onConverted();
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
        setFormError(err instanceof Error ? err.message : 'Failed to convert lead.');
      }
    }
  });

  return (
    <div className="flex gap-6">
      <div className="hidden shrink-0 basis-56 md:block">
        <LeadFormSectionNav sections={SECTIONS} />
      </div>

      <form onSubmit={onSubmit} noValidate aria-label="Convert to Enquiry" className="min-w-0 flex-1 space-y-6">
        <section id="section-customer-information" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Customer Information</h2>
          <p className="text-sm text-slate-500">Read-only — captured on the Lead.</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <DetailField label="Full Name">{displayText(lead?.customerName)}</DetailField>
            <DetailField label="Mobile">{displayText(lead?.mobile)}</DetailField>
            <DetailField label="Email">{displayText(lead?.email)}</DetailField>
            <DetailField label="Customer Type">{displayText(lead?.customerType)}</DetailField>
            <DetailField label="City">{displayText(lead?.city)}</DetailField>
            <DetailField label="Pin Code">{displayText(lead?.pinCode)}</DetailField>
            <DetailField label="Preferred Language">{displayText(lead?.preferredLanguage)}</DetailField>
          </div>
        </section>

        <section id="section-vehicle-information" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Vehicle Information</h2>
          <p className="text-sm text-slate-500">Pre-filled from the Lead — confirm or change as needed.</p>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Model of Interest" htmlFor="modelId" error={errors.modelId?.message}>
              <Select id="modelId" {...register('modelId')}>
                <option value="">Select a model</option>
                {(models ?? []).map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Variant" htmlFor="variant" error={errors.variant?.message}>
              <TextInput id="variant" {...register('variant', { required: 'Variant is required' })} />
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

            <FormField
              label="Color — First Preference"
              htmlFor="colorFirstPreference"
              error={errors.colorFirstPreference?.message}
            >
              <TextInput id="colorFirstPreference" {...register('colorFirstPreference')} />
            </FormField>

            <FormField
              label="Color — Second Preference"
              htmlFor="colorSecondPreference"
              error={errors.colorSecondPreference?.message}
            >
              <TextInput id="colorSecondPreference" {...register('colorSecondPreference')} />
            </FormField>

            <FormField
              label="Accessories Interest"
              htmlFor="accessoriesInterest"
              error={errors.accessoriesInterest?.message}
            >
              <TextInput id="accessoriesInterest" {...register('accessoriesInterest')} />
            </FormField>

            <FormField
              label="Competitor Consideration"
              htmlFor="competitorConsideration"
              error={errors.competitorConsideration?.message}
            >
              <TextInput id="competitorConsideration" {...register('competitorConsideration')} />
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

            <FormField label="Exchange Interest" htmlFor="exchangeInterest" error={errors.exchangeInterest?.message}>
              <Select
                id="exchangeInterest"
                {...register('exchangeInterest', { required: 'Exchange interest is required' })}
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </FormField>

            <FormField label="Finance Interest" htmlFor="financeInterest" error={errors.financeInterest?.message}>
              <Select
                id="financeInterest"
                {...register('financeInterest', { required: 'Finance interest is required' })}
              >
                <option value="">Select</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </FormField>
          </div>
        </section>

        <section id="section-qualification" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Qualification</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Contact Verified" htmlFor="contactVerified" error={errors.contactVerified?.message}>
              <Select id="contactVerified" {...register('contactVerified')}>
                <option value="">Select</option>
                {CONTACT_VERIFIED_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Intent Rating" htmlFor="intentRating" error={errors.intentRating?.message}>
              <Select id="intentRating" {...register('intentRating')}>
                <option value="">Select</option>
                {INTENT_RATINGS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Expected Closure Date"
              htmlFor="expectedClosureDate"
              error={errors.expectedClosureDate?.message}
            >
              <TextInput id="expectedClosureDate" type="date" {...register('expectedClosureDate')} />
            </FormField>

            <FormField label="Showroom Visits So Far" htmlFor="showroomVisits" error={errors.showroomVisits?.message}>
              <Select id="showroomVisits" {...register('showroomVisits')}>
                <option value="">Select</option>
                {SHOWROOM_VISIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </section>

        <section id="section-commercial" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Commercial</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Quotation Number" htmlFor="quotationNumber" error={errors.quotationNumber?.message}>
              <TextInput id="quotationNumber" {...register('quotationNumber')} />
            </FormField>

            <FormField
              label="Quoted On-Road Price (INR)"
              htmlFor="quotedOnRoadPrice"
              error={errors.quotedOnRoadPrice?.message}
            >
              <TextInput id="quotedOnRoadPrice" type="number" min={0} {...register('quotedOnRoadPrice')} />
            </FormField>

            <FormField label="Discount Discussed" htmlFor="discountDiscussed" error={errors.discountDiscussed?.message}>
              <TextInput id="discountDiscussed" {...register('discountDiscussed')} />
            </FormField>

            <FormField
              label="Insurance Preference"
              htmlFor="insurancePreference"
              error={errors.insurancePreference?.message}
            >
              <Select id="insurancePreference" {...register('insurancePreference')}>
                <option value="">Select</option>
                {INSURANCE_PREFERENCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Extended Warranty / AMC"
              htmlFor="extendedWarrantyInterest"
              error={errors.extendedWarrantyInterest?.message}
            >
              <Select id="extendedWarrantyInterest" {...register('extendedWarrantyInterest')}>
                <option value="">Select</option>
                {WARRANTY_INTEREST_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Corporate Discount Eligible"
              htmlFor="corporateDiscountEligible"
              error={errors.corporateDiscountEligible?.message}
            >
              <TextInput id="corporateDiscountEligible" {...register('corporateDiscountEligible')} />
            </FormField>
          </div>
        </section>

        <section id="section-finance" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Finance</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField
              label="Application Status"
              htmlFor="financeApplicationStatus"
              error={errors.financeApplicationStatus?.message}
            >
              <Select id="financeApplicationStatus" {...register('financeApplicationStatus')}>
                <option value="">Select</option>
                {FINANCE_APPLICATION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Financier" htmlFor="financier" error={errors.financier?.message}>
              <Select id="financier" {...register('financier')}>
                <option value="">Select</option>
                {FINANCIER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Loan Amount Sought (INR)"
              htmlFor="loanAmountSought"
              error={errors.loanAmountSought?.message}
            >
              <TextInput id="loanAmountSought" type="number" min={0} {...register('loanAmountSought')} />
            </FormField>

            <FormField
              label="Tenure and EMI Discussed"
              htmlFor="tenureAndEmiDiscussed"
              error={errors.tenureAndEmiDiscussed?.message}
            >
              <TextInput id="tenureAndEmiDiscussed" {...register('tenureAndEmiDiscussed')} />
            </FormField>
          </div>
        </section>

        <section id="section-exchange-evaluation" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Exchange Evaluation</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField
              label="Evaluation Status"
              htmlFor="exchangeEvaluationStatus"
              error={errors.exchangeEvaluationStatus?.message}
            >
              <Select id="exchangeEvaluationStatus" {...register('exchangeEvaluationStatus')}>
                <option value="">Select</option>
                {EXCHANGE_EVALUATION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Evaluated By" htmlFor="exchangeEvaluatedBy" error={errors.exchangeEvaluatedBy?.message}>
              <TextInput id="exchangeEvaluatedBy" {...register('exchangeEvaluatedBy')} />
            </FormField>

            <FormField
              label="Evaluated Price (INR)"
              htmlFor="exchangeEvaluatedPrice"
              error={errors.exchangeEvaluatedPrice?.message}
            >
              <TextInput id="exchangeEvaluatedPrice" type="number" min={0} {...register('exchangeEvaluatedPrice')} />
            </FormField>

            <FormField
              label="Customer Expectation (INR)"
              htmlFor="exchangeCustomerExpectation"
              error={errors.exchangeCustomerExpectation?.message}
            >
              <TextInput
                id="exchangeCustomerExpectation"
                type="number"
                min={0}
                {...register('exchangeCustomerExpectation')}
              />
            </FormField>
          </div>
        </section>

        <section id="section-test-drive-engagement" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Test Drive & Engagement</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Test Drive Status" htmlFor="testDriveStatus" error={errors.testDriveStatus?.message}>
              <Select id="testDriveStatus" {...register('testDriveStatus')}>
                <option value="">Select</option>
                {TEST_DRIVE_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Test Drive Date" htmlFor="testDriveDateTime" error={errors.testDriveDateTime?.message}>
              <TextInput id="testDriveDateTime" type="datetime-local" {...register('testDriveDateTime')} />
            </FormField>

            <FormField
              label="Quotation Shared Via"
              htmlFor="quotationSharedVia"
              error={errors.quotationSharedVia?.message}
            >
              <Select id="quotationSharedVia" {...register('quotationSharedVia')}>
                <option value="">Select</option>
                {QUOTATION_SHARED_VIA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Next Action Owner"
              htmlFor="nextActionOwnerId"
              error={errors.nextActionOwnerId?.message}
            >
              <Select id="nextActionOwnerId" {...register('nextActionOwnerId')}>
                <option value="">Select a consultant</option>
                {(consultants ?? []).map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.displayName}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="md:col-span-2">
              <FormField
                label="Test Drive Feedback / Remarks"
                htmlFor="testDriveFeedback"
                error={errors.testDriveFeedback?.message}
              >
                <Textarea id="testDriveFeedback" {...register('testDriveFeedback')} />
              </FormField>
            </div>
          </div>
        </section>

        <section id="section-document-checklist" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Document Checklist</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
            <div className="flex items-center gap-2 py-1">
              <Checkbox id="panCardVerified" {...register('panCardVerified')} />
              <label htmlFor="panCardVerified" className="text-sm text-slate-700">
                PAN Card verified
              </label>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox id="addressProofVerified" {...register('addressProofVerified')} />
              <label htmlFor="addressProofVerified" className="text-sm text-slate-700">
                Address proof verified
              </label>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox id="incomeProofVerified" {...register('incomeProofVerified')} />
              <label htmlFor="incomeProofVerified" className="text-sm text-slate-700">
                Income proof verified
              </label>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox id="gstDetailsVerified" {...register('gstDetailsVerified')} />
              <label htmlFor="gstDetailsVerified" className="text-sm text-slate-700">
                GST details verified (corporate)
              </label>
            </div>
          </div>
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
          <Button type="submit" disabled={convertLead.isPending}>
            Convert to Enquiry
          </Button>
        </div>
      </form>
    </div>
  );
}
