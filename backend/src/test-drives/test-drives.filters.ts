import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TestDriveEnquiryNotFoundError, OperatingHoursViolationError } from './test-drives.errors';

/** Maps TestDriveEnquiryNotFoundError to the simple `{field,message}[]` 404
 * body — mirrors followups.filters.ts's FollowupEnquiryNotFoundExceptionFilter. */
@Catch(TestDriveEnquiryNotFoundError)
export class TestDriveEnquiryNotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: TestDriveEnquiryNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.NOT_FOUND).json(exception.errors);
  }
}

/** AC2: maps OperatingHoursViolationError to the same simple 400 body shape
 * — mirrors NextFollowUpRequiredExceptionFilter. */
@Catch(OperatingHoursViolationError)
export class OperatingHoursViolationExceptionFilter implements ExceptionFilter {
  catch(exception: OperatingHoursViolationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.BAD_REQUEST).json(exception.errors);
  }
}
