import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TestDriveEnquiryNotFoundError, OperatingHoursViolationError, TestDriveSlotConflictError } from './test-drives.errors';

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

/** issue #36 AC1-AC4: maps TestDriveSlotConflictError to 409, with a response
 * body of `{ errors, suggestedSlots }` (AC2) — deliberately a structured
 * object, not the plain `FieldError[]` array every other filter in this
 * codebase returns, since this is the first error that needs to carry data
 * beyond field/message pairs. See TestDriveSlotConflictError's comment. */
@Catch(TestDriveSlotConflictError)
export class TestDriveSlotConflictExceptionFilter implements ExceptionFilter {
  catch(exception: TestDriveSlotConflictError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.CONFLICT).json({ errors: exception.errors, suggestedSlots: exception.suggestedSlots });
  }
}
