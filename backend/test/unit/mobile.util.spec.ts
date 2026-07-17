/**
 * RED phase (Inside-Out, Core Domain Layer) — Task 2.1.1
 * India 10-digit mobile rule incl. boundaries.
 * No external dependencies — pure function test.
 */
import { isValidIndiaMobile, INDIA_MOBILE_REGEX, normalizeIndiaMobile } from '../../src/common/mobile.util';

describe('isValidIndiaMobile', () => {
  it('accepts a valid 10-digit mobile with leading 6-9', () => {
    expect(isValidIndiaMobile('9876543210')).toBe(true);
    expect(isValidIndiaMobile('6000000000')).toBe(true);
  });

  it('rejects a 9-digit (too short) mobile', () => {
    expect(isValidIndiaMobile('987654321')).toBe(false);
  });

  it('rejects an 11-digit (too long) mobile', () => {
    expect(isValidIndiaMobile('98765432101')).toBe(false);
  });

  it('rejects a disallowed leading digit (0-5)', () => {
    expect(isValidIndiaMobile('5876543210')).toBe(false);
    expect(isValidIndiaMobile('0876543210')).toBe(false);
  });

  it('rejects a non-numeric mobile', () => {
    expect(isValidIndiaMobile('98765abcde')).toBe(false);
  });

  it('rejects country-code-prefixed numbers (not stripped)', () => {
    expect(isValidIndiaMobile('+919876543210')).toBe(false);
    expect(isValidIndiaMobile('919876543210')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidIndiaMobile(9876543210)).toBe(false);
    expect(isValidIndiaMobile(null)).toBe(false);
    expect(isValidIndiaMobile(undefined)).toBe(false);
  });

  it('exposes the exact regex used for client/server parity', () => {
    expect(INDIA_MOBILE_REGEX.source).toBe('^[6-9]\\d{9}$');
  });
});

/**
 * RED phase (Inside-Out, Core Domain Layer) — issue #29 Task 1.1
 * Duplicate-detection normalization (AC7: exact match on normalized mobile).
 */
describe('normalizeIndiaMobile', () => {
  it('returns an already-normalized 10-digit number unchanged', () => {
    expect(normalizeIndiaMobile('9876543210')).toBe('9876543210');
  });

  it('strips surrounding whitespace', () => {
    expect(normalizeIndiaMobile('  9876543210  ')).toBe('9876543210');
  });

  it('strips internal spaces/dashes/parens a DSE might type or paste', () => {
    expect(normalizeIndiaMobile('98765 43210')).toBe('9876543210');
    expect(normalizeIndiaMobile('98765-43210')).toBe('9876543210');
    expect(normalizeIndiaMobile('(987) 654-3210')).toBe('9876543210');
  });

  it('does not re-validate shape — a country-code-prefixed value normalizes to more than 10 digits', () => {
    expect(normalizeIndiaMobile('+91 98765 43210')).toBe('919876543210');
    expect(isValidIndiaMobile(normalizeIndiaMobile('+91 98765 43210'))).toBe(false);
  });
});
