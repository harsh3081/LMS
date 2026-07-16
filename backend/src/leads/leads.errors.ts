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

/** Thrown by LeadsService.reassignOwner (issue #28, AC4) when the target
 * Lead does not exist. No controller/endpoint calls reassignOwner yet in
 * this Story — defined now (rather than an ad-hoc generic Error) so a
 * future TL-reassignment Story can map this to 404 without touching this
 * Story's contract. */
export class LeadReassignTargetNotFoundError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Lead not found');
    this.name = 'LeadReassignTargetNotFoundError';
  }
}
