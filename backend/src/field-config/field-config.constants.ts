/**
 * The configurable field set (issue #27 AC1/AC6). Scoped deliberately to the
 * four fields present on BOTH CreateLeadDto and CreateDirectEnquiryDto (the
 * "Lead-equivalent mandatory fields" shared convention already established
 * by issue #26) — these are exactly the fields AC6 names as the default
 * mandatory set, and the only ones a single toggle can consistently govern
 * across both intake forms without special-casing per-form fields (budget/
 * variant/exchangeInterest/financeInterest exist only on the Enquiry side
 * and stay statically required, unchanged from #25/#26). This keeps the
 * design minimal per this fast-tracked Story's scope; widening the
 * configurable set to per-form-only fields is a documented follow-up (see
 * NOTES.md "Known gaps").
 */
export const CONFIGURABLE_FIELD_KEYS = ['customerName', 'mobile', 'sourceId', 'modelId'] as const;

export type ConfigurableFieldKey = (typeof CONFIGURABLE_FIELD_KEYS)[number];

/** Human-readable labels for the admin configuration screen (AC1). */
export const FIELD_LABELS: Record<ConfigurableFieldKey, string> = {
  customerName: 'Customer Name',
  mobile: 'Mobile Number',
  sourceId: 'Source',
  modelId: 'Model of Interest',
};

/** AC6: "Default configuration ships with name, mobile number, source, and
 * model of interest marked mandatory" — i.e. every configurable field
 * defaults to mandatory=true. */
export const DEFAULT_MANDATORY: Record<ConfigurableFieldKey, boolean> = {
  customerName: true,
  mobile: true,
  sourceId: true,
  modelId: true,
};

export function isConfigurableFieldKey(value: string): value is ConfigurableFieldKey {
  return (CONFIGURABLE_FIELD_KEYS as readonly string[]).includes(value);
}
