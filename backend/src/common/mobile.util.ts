/**
 * India 10-digit mobile format rule (frozen, spec.md / tech-design.md AC4):
 * exactly 10 digits, leading digit 6-9, country-code prefixes rejected (not stripped).
 *
 * Pure, dependency-free so it is testable in isolation (Inside-Out RED phase,
 * Core Domain Layer) before any framework/DB wiring exists.
 */
export const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/;

export function isValidIndiaMobile(value: unknown): value is string {
  return typeof value === 'string' && INDIA_MOBILE_REGEX.test(value);
}

/**
 * Duplicate-detection normalization (issue #29, AC7: "exact match on
 * normalized mobile number — no fuzzy matching"). Strips any non-digit
 * characters (spaces/dashes/parens a DSE might type or paste) and trims
 * whitespace, so `'98765 43210'` and `'9876543210'` are recognized as the
 * same number for duplicate lookups. Deliberately does NOT re-validate the
 * India-mobile shape (leading 6-9, 10 digits) — callers that need format
 * validation still use isValidIndiaMobile/INDIA_MOBILE_REGEX separately;
 * this is pure normalization so it stays reusable even for a
 * not-yet-fully-typed in-progress value.
 */
export function normalizeIndiaMobile(value: string): string {
  return value.trim().replace(/\D/g, '');
}
