/**
 * Simple `{ field, message }[]` error shape (tech-design.md Integration
 * Points, resolved — "no elaborate error envelope this Story").
 */
export interface FieldError {
  field: string;
  message: string;
}

/** Thrown for referential-validation failures (AC5): sourceId/modelId not
 * found in their respective masters. Mapped to 400 by the controller. */
export class ReferentialValidationError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Referential validation failed');
    this.name = 'ReferentialValidationError';
  }
}
