import { ValueTransformer } from 'typeorm';

/**
 * Normalizes jsonb column round-tripping across drivers: node-postgres
 * auto-parses jsonb into JS values, but some TypeORM driver adapters (e.g.
 * the pg-mem test substitute used by this Story's Jest harness — see
 * test/support/test-data-source.ts) return the raw jsonb text instead. This
 * transformer guarantees a consistent JS object/array on read regardless of
 * driver, without changing write behavior (TypeORM always stringifies jsonb
 * parameters on write).
 */
export const jsonbTransformer: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: unknown) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  },
};
