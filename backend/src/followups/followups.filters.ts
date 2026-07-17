import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { FollowupEnquiryNotFoundError } from './followups.errors';

/** Maps FollowupEnquiryNotFoundError to the simple `{field,message}[]` 404
 * body — mirrors enquiry-eligibility.filter.ts's LeadNotFoundError handling. */
@Catch(FollowupEnquiryNotFoundError)
export class FollowupEnquiryNotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: FollowupEnquiryNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.NOT_FOUND).json(exception.errors);
  }
}
