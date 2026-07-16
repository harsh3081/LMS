import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LeadNotFoundError, LeadAlreadyConvertedError } from '../enquiries/enquiries.errors';

/** Maps the convert-action eligibility errors (issue #25) to the simple
 * `{field,message}[]` body, analogous to referential-validation.filter.ts:
 * LeadNotFoundError -> 404, LeadAlreadyConvertedError -> 409. */
@Catch(LeadNotFoundError, LeadAlreadyConvertedError)
export class EnquiryEligibilityExceptionFilter implements ExceptionFilter {
  catch(exception: LeadNotFoundError | LeadAlreadyConvertedError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof LeadAlreadyConvertedError ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND;
    response.status(status).json(exception.errors);
  }
}
