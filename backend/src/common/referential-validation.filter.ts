import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ReferentialValidationError } from '../leads/leads.errors';

/** Maps ReferentialValidationError (AC5) to the simple `{field,message}[]` 400 body. */
@Catch(ReferentialValidationError)
export class ReferentialValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ReferentialValidationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json(exception.errors);
  }
}
