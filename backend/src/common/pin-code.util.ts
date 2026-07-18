/**
 * India 6-digit postal (PIN) code format rule (issue #114, AC3): exactly 6
 * digits, leading digit 1-9 (no Indian PIN code starts with 0). Mirrors
 * mobile.util.ts's INDIA_MOBILE_REGEX precedent exactly — pure,
 * dependency-free so it is testable in isolation before any framework/DB
 * wiring exists, and reused by both CreateLeadDto's `@Matches` decorator and
 * migration 1700000000016-AddLeadCustomerDetails's defense-in-depth CHECK
 * constraint (kept as a literal string there — SQL CHECK expressions cannot
 * import a TS regex — but expressed identically: `^[1-9][0-9]{5}$`).
 */
export const INDIA_PIN_CODE_REGEX = /^[1-9][0-9]{5}$/;

export function isValidIndiaPinCode(value: unknown): value is string {
  return typeof value === 'string' && INDIA_PIN_CODE_REGEX.test(value);
}
