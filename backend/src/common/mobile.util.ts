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
