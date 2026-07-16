import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { FieldError } from '../leads/leads.errors';

/** Flattens class-validator's nested ValidationError[] into the simple
 * `{field,message}[]` array (tech-design.md Integration Points, resolved). */
export function toFieldErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = error.constraints ? Object.values(error.constraints).map((message) => ({ field: path, message })) : [];
    const nested = error.children && error.children.length ? toFieldErrors(error.children, path) : [];
    return [...own, ...nested];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException(toFieldErrors(errors));
}
