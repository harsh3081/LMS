import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLeadSources } from '../hooks/useLeadSources';
import { useVehicleModels } from '../hooks/useVehicleModels';
import { useConsultants } from '../hooks/useConsultants';
import { useCreateDirectEnquiry } from '../hooks/useEnquiries';
import { useFieldConfig, isFieldMandatory } from '../hooks/useFieldConfig';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import {
  ApiError,
  CONTACT_VERIFIED_OPTIONS,
  CreateDirectEnquiryInput,
  CUSTOMER_TYPES,
  DuplicateMatch,
  EXCHANGE_EVALUATION_STATUSES,
  FINANCE_APPLICATION_STATUSES,
  FINANCIER_OPTIONS,
  FUEL_TYPES,
  INSURANCE_PREFERENCES,
  INTENT_RATINGS,
  PREFERRED_LANGUAGES,
  QUOTATION_SHARED_VIA_OPTIONS,
  SHOWROOM_VISIT_OPTIONS,
  TEST_DRIVE_STATUSES,
  TRANSMISSIONS,
  WARRANTY_INTEREST_OPTIONS,
} from '../api/client';
import { Button, Checkbox, FormField, Select, TextInput, Textarea } from './ui';
import { DuplicateWarning } from './DuplicateWarning';
import { LeadFormSectionNav, LeadFormSection } from './LeadFormSectionNav';
import { SUCCESS_AUTO_CLOSE_MS } from './NewLeadForm';

/** issue #130: re-exported so callers (e.g. the Enquiry Management
 * slide-over panel and this file's own spec) can import the auto-close
 * delay from NewEnquiryForm directly, without reaching into NewLeadForm's
 * module. The constant itself is NOT duplicated — see the import above and
 * NOTES.md ("NewEnquiryForm onSuccess mechanism") for why reusing
 * NewLeadForm's single exported value was judged cleaner than defining a
 * second, identically-valued constant here. */
export { SUCCESS_AUTO_CLOSE_MS };

/** Mirrors NewLeadForm's INDIA_MOBILE_REGEX exactly (AC3, server rule:
 * backend/src/common/mobile.util.ts). */
const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Mirrors NewLeadForm's INDIA_PIN_CODE_REGEX exactly (issue #134, server
 * rule: backend/src/common/pin-code.util.ts). */
const INDIA_PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

/** Mirrors ConvertLeadForm's POSITIVE_INTEGER_REGEX exactly (AC3, server
 * rule: backend/src/enquiries/dto/create-direct-enquiry.dto.ts). */
const POSITIVE_INTEGER_REGEX = /^\d+$/;

/** issue #134 "Navigation" — one entry per form section, in display order;
 * also the source of the `id` each section wrapper carries for
 * LeadFormSectionNav's IntersectionObserver to find. Mirrors
 * ConvertLeadForm's own SECTIONS exactly, except Section 0 is "Customer
 * Details" (editable here — see NOTES.md) rather than "Customer
 * Information" (read-only there). */
const SECTIONS: LeadFormSection[] = [
  { id: 'section-customer-details', label: 'Customer Details' },
  { id: 'section-vehicle-information', label: 'Vehicle Information' },
  { id: 'section-qualification', label: 'Qualification' },
  { id: 'section-commercial', label: 'Commercial' },
  { id: 'section-finance', label: 'Finance' },
  { id: 'section-exchange-evaluation', label: 'Exchange Evaluation' },
  { id: 'section-test-drive-engagement', label: 'Test Drive & Engagement' },
  { id: 'section-document-checklist', label: 'Document Checklist' },
];

type FormValues = {
  customerName: string;
  email: string;
  customerType: string;
  mobile: string;
  city: string;
  pinCode: string;
  preferredLanguage: string;
  sourceId: string;

  modelId: string;
  variant: string;
  fuelType: string;
  transmission: string;
  colorFirstPreference: string;
  colorSecondPreference: string;
  accessoriesInterest: string;
  competitorConsideration: string;
  budget: string;
  exchangeInterest: '' | 'true' | 'false';
  financeInterest: '' | 'true' | 'false';

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
  customerName: '',
  email: '',
  customerType: '',
  mobile: '',
  city: '',
  pinCode: '',
  preferredLanguage: '',
  sourceId: '',
  modelId: '',
  variant: '',
  fuelType: '',
  transmission: '',
  colorFirstPreference: '',
  colorSecondPreference: '',
  accessoriesInterest: '',
  competitorConsideration: '',
  budget: '',
  exchangeInterest: '',
  financeInterest: '',
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

/**
 * "New Enquiry" form (issue #26, "Create a Direct Enquiry (Walk-in/
 * Referred)"). REWRITTEN (issue #134, "Redesign New Enquiry form to match
 * Convert-to-Enquiry's 8-section structure") — mirrors ConvertLeadForm.tsx's
 * structure exactly: a side-nav (`LeadFormSectionNav`) + one `<section>` per
 * SECTIONS entry, each laid out in the same 2-column grid convention.
 *
 * The one structural difference from ConvertLeadForm: Section 0 ("Customer
 * Details") is EDITABLE here, not read-only — a Direct Enquiry has no
 * parent Lead to pre-fill Customer Information from (unlike Convert-to-
 * Enquiry, where the Lead already captured it). It captures the same field
 * set NewLeadForm's own Customer Details section captures (Full Name/
 * Email/Customer Type/Mobile/City/Pin Code/Preferred Language), PLUS
 * "Source" (sourceId) grouped into this same section — Convert-to-Enquiry
 * has no Source section since the Lead already captured it, but a Direct
 * Enquiry still needs to capture it somewhere, and the issue calls for
 * grouping it into Customer Details rather than giving it its own section.
 * See NOTES.md for the full rationale.
 *
 * Section 1 ("Vehicle Information") onward is a field-for-field, dropdown-
 * for-dropdown mirror of ConvertLeadForm.tsx's own Sections 1-7 (including
 * budget/variant/exchangeInterest/financeInterest grouped into Section 1,
 * exactly as ConvertLeadForm does).
 *
 * `customerName`/`mobile`/`sourceId`/`modelId` mandatory-ness stays
 * config-driven (issue #27, FR-04) exactly as before; `budget`/`variant`/
 * `exchangeInterest`/`financeInterest` stay statically required exactly as
 * before; every other field is optional, mirroring
 * CreateDirectEnquiryDto's server-side contract.
 *
 * MODIFIED (issue #29): mobile-duplicate check on blur, mirrors NewLeadForm
 * exactly — see that file's comments for the full design rationale.
 * MODIFIED (issue #130): optional `onSuccess` prop, mirroring NewLeadForm's
 * exact issue #118 auto-close mechanism (timeout ref + cleanup-on-unmount),
 * so this form can be used inside a slide-over panel (the Enquiry
 * Management page) that closes itself shortly after a successful creation.
 */
export interface NewEnquiryFormProps {
  /** Optional — called ~1.5s (SUCCESS_AUTO_CLOSE_MS) after a successful
   * Enquiry creation (once the success message has been shown), letting a
   * parent (e.g. the New Enquiry slide-over panel) close itself. Mirrors
   * NewLeadForm's `onSuccess` prop exactly (issue #118). */
  onSuccess?: () => void;
}

export function NewEnquiryForm({ onSuccess }: NewEnquiryFormProps = {}) {
  const { data: sources } = useLeadSources();
  const { data: models } = useVehicleModels();
  const { data: consultants } = useConsultants();
  const { data: fieldConfig } = useFieldConfig();
  const createDirectEnquiry = useCreateDirectEnquiry();
  const duplicateCheck = useDuplicateCheck();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  // issue #130 (mirrors NewLeadForm's issue #118 AC4): tracks the pending
  // auto-close timer so it can be cleared on unmount (e.g. the panel is
  // closed/re-opened before the timer fires) — avoids calling onSuccess or
  // touching state after unmount.
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

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
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const mobileRegistration = register('mobile', {
    required: mobileMandatory ? 'Mobile is required' : false,
    validate: (value) =>
      !value || INDIA_MOBILE_REGEX.test(value) || 'Enter a valid 10-digit mobile number (leading 6-9)',
  });

  /** issue #29 (AC1/AC5) — mirrors NewLeadForm.handleMobileBlur exactly. */
  async function handleMobileBlur(value: string) {
    if (!INDIA_MOBILE_REGEX.test(value)) return;
    try {
      const matches = await duplicateCheck.mutateAsync(value);
      setDuplicateMatches(matches);
      setDuplicateAcknowledged(false);
    } catch {
      // advisory only — a failed check must never block data entry
    }
  }

  /** issue #29 (AC3) — mirrors NewLeadForm.performCreate exactly. */
  async function performCreate(values: FormValues, acknowledged: boolean) {
    if (duplicateMatches.length > 0 && !acknowledged) {
      return;
    }
    setSuccessMessage(null);
    setFormError(null);
    const input: CreateDirectEnquiryInput = {
      customerName: values.customerName || undefined,
      mobile: values.mobile || undefined,
      sourceId: values.sourceId ? Number(values.sourceId) : undefined,
      modelId: values.modelId ? Number(values.modelId) : undefined,

      email: strOrUndefined(values.email),
      customerType: strOrUndefined(values.customerType) as CreateDirectEnquiryInput['customerType'],
      city: strOrUndefined(values.city),
      pinCode: strOrUndefined(values.pinCode),
      preferredLanguage: strOrUndefined(values.preferredLanguage) as CreateDirectEnquiryInput['preferredLanguage'],

      budget: Number(values.budget),
      variant: values.variant,
      exchangeInterest: values.exchangeInterest === 'true',
      financeInterest: values.financeInterest === 'true',

      fuelType: strOrUndefined(values.fuelType) as CreateDirectEnquiryInput['fuelType'],
      transmission: strOrUndefined(values.transmission) as CreateDirectEnquiryInput['transmission'],
      colorFirstPreference: strOrUndefined(values.colorFirstPreference),
      colorSecondPreference: strOrUndefined(values.colorSecondPreference),
      accessoriesInterest: strOrUndefined(values.accessoriesInterest),
      competitorConsideration: strOrUndefined(values.competitorConsideration),

      contactVerified: strOrUndefined(values.contactVerified) as CreateDirectEnquiryInput['contactVerified'],
      intentRating: strOrUndefined(values.intentRating) as CreateDirectEnquiryInput['intentRating'],
      expectedClosureDate: strOrUndefined(values.expectedClosureDate),
      showroomVisits: strOrUndefined(values.showroomVisits) as CreateDirectEnquiryInput['showroomVisits'],

      quotationNumber: strOrUndefined(values.quotationNumber),
      quotedOnRoadPrice: numberOrUndefined(values.quotedOnRoadPrice),
      discountDiscussed: strOrUndefined(values.discountDiscussed),
      insurancePreference: strOrUndefined(values.insurancePreference) as CreateDirectEnquiryInput['insurancePreference'],
      extendedWarrantyInterest: strOrUndefined(
        values.extendedWarrantyInterest,
      ) as CreateDirectEnquiryInput['extendedWarrantyInterest'],
      corporateDiscountEligible: strOrUndefined(values.corporateDiscountEligible),

      financeApplicationStatus: strOrUndefined(
        values.financeApplicationStatus,
      ) as CreateDirectEnquiryInput['financeApplicationStatus'],
      financier: strOrUndefined(values.financier) as CreateDirectEnquiryInput['financier'],
      loanAmountSought: numberOrUndefined(values.loanAmountSought),
      tenureAndEmiDiscussed: strOrUndefined(values.tenureAndEmiDiscussed),

      exchangeEvaluationStatus: strOrUndefined(
        values.exchangeEvaluationStatus,
      ) as CreateDirectEnquiryInput['exchangeEvaluationStatus'],
      exchangeEvaluatedBy: strOrUndefined(values.exchangeEvaluatedBy),
      exchangeEvaluatedPrice: numberOrUndefined(values.exchangeEvaluatedPrice),
      exchangeCustomerExpectation: numberOrUndefined(values.exchangeCustomerExpectation),

      testDriveStatus: strOrUndefined(values.testDriveStatus) as CreateDirectEnquiryInput['testDriveStatus'],
      testDriveDateTime: values.testDriveDateTime ? new Date(values.testDriveDateTime).toISOString() : undefined,
      quotationSharedVia: strOrUndefined(values.quotationSharedVia) as CreateDirectEnquiryInput['quotationSharedVia'],
      nextActionOwnerId: strOrUndefined(values.nextActionOwnerId),
      testDriveFeedback: strOrUndefined(values.testDriveFeedback),

      panCardVerified: values.panCardVerified || undefined,
      addressProofVerified: values.addressProofVerified || undefined,
      incomeProofVerified: values.incomeProofVerified || undefined,
      gstDetailsVerified: values.gstDetailsVerified || undefined,

      acknowledgeDuplicate: duplicateMatches.length > 0 ? true : undefined,
    };
    try {
      await createDirectEnquiry.mutateAsync(input);
      setSuccessMessage('Enquiry created successfully.');
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
        setFormError(err instanceof Error ? err.message : 'Failed to create enquiry.');
      }
    }
  }

  const onSubmit = handleSubmit((values) => performCreate(values, duplicateAcknowledged));
  const onProceedAnyway = handleSubmit((values) => performCreate(values, true));

  return (
    <div className="flex gap-6">
      <div className="hidden shrink-0 basis-56 md:block">
        <LeadFormSectionNav sections={SECTIONS} />
      </div>

      <form onSubmit={onSubmit} noValidate aria-label="New Enquiry" className="min-w-0 flex-1 space-y-6">
        <section id="section-customer-details" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Customer Details</h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
            <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
              <TextInput
                id="customerName"
                {...register('customerName', { required: customerNameMandatory ? 'Customer name is required' : false })}
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
          </div>
        </section>

        <section id="section-vehicle-information" className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Vehicle Information</h2>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
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
          <Button type="submit" disabled={createDirectEnquiry.isPending}>
            Create Enquiry
          </Button>
        </div>
      </form>
    </div>
  );
}
