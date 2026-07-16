import { FieldError } from '../leads/leads.errors';

/** Thrown when a Create-Lead/Create-Direct-Enquiry submission omits a field
 * that FieldConfigService currently has configured as mandatory (AC4).
 * Mapped to 400 by MandatoryFieldValidationExceptionFilter. */
export class MandatoryFieldValidationError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Mandatory field validation failed');
    this.name = 'MandatoryFieldValidationError';
  }
}

/** Thrown when a PUT /api/v1/field-config payload names a field outside
 * CONFIGURABLE_FIELD_KEYS. Mapped to 400 by UnknownFieldConfigExceptionFilter. */
export class UnknownFieldConfigError extends Error {
  constructor(public readonly errors: FieldError[]) {
    super('Unknown field-config key');
    this.name = 'UnknownFieldConfigError';
  }
}
