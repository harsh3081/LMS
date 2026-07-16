import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MandatoryFieldValidationError, UnknownFieldConfigError } from './field-config.errors';

/** Maps MandatoryFieldValidationError (AC4) to the simple `{field,message}[]`
 * 400 body — mirrors ReferentialValidationExceptionFilter exactly. */
@Catch(MandatoryFieldValidationError)
export class MandatoryFieldValidationExceptionFilter implements ExceptionFilter {
  catch(exception: MandatoryFieldValidationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json(exception.errors);
  }
}

/** Maps UnknownFieldConfigError to the same simple 400 body shape. */
@Catch(UnknownFieldConfigError)
export class UnknownFieldConfigExceptionFilter implements ExceptionFilter {
  catch(exception: UnknownFieldConfigError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json(exception.errors);
  }
}
