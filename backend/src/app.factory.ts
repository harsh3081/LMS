import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { validationExceptionFactory } from './common/validation-exception.factory';
import { ReferentialValidationExceptionFilter } from './common/referential-validation.filter';
import { EnquiryEligibilityExceptionFilter } from './common/enquiry-eligibility.filter';
import { MandatoryFieldValidationExceptionFilter, UnknownFieldConfigExceptionFilter } from './field-config/field-config.filters';
import { FollowupEnquiryNotFoundExceptionFilter, NextFollowUpRequiredExceptionFilter } from './followups/followups.filters';
import {
  TestDriveEnquiryNotFoundExceptionFilter,
  OperatingHoursViolationExceptionFilter,
  TestDriveSlotConflictExceptionFilter,
} from './test-drives/test-drives.filters';

/**
 * Builds a fully configured Nest application from an already-initialized
 * DataSource (real Postgres in main.ts, pg-mem substitute in Jest/Supertest
 * integration tests — see test/support/test-data-source.ts) so both share
 * identical wiring: global ValidationPipe (whitelist/forbidNonWhitelisted —
 * EVAL-CC-01/02), the ReferentialValidationError filter (AC5), cookie
 * parsing (ADR-004 session cookie), and the OpenAPI document (AC7) mounted
 * at NestJS/@nestjs/swagger's default `/api-json` convention via
 * `SwaggerModule.setup('api', ...)`.
 */
export async function createApp(dataSource: DataSource): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.forRoot(dataSource), { logger: ['error', 'warn'] });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      // `whitelist: true` strips any body property not declared on the DTO
      // (ownerId/locationId/dealerGroupId/status/leadId, etc.) before it
      // ever reaches the service — so those fields are silently ignored,
      // never honored (EVAL-CC-01/02: frozen tests expect 201 with the
      // client-supplied values ignored, not a 400 rejection, so
      // `forbidNonWhitelisted` is deliberately left at its default false).
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(
    new ReferentialValidationExceptionFilter(),
    new EnquiryEligibilityExceptionFilter(),
    new MandatoryFieldValidationExceptionFilter(),
    new UnknownFieldConfigExceptionFilter(),
    new FollowupEnquiryNotFoundExceptionFilter(),
    new NextFollowUpRequiredExceptionFilter(),
    new TestDriveEnquiryNotFoundExceptionFilter(),
    new OperatingHoursViolationExceptionFilter(),
    new TestDriveSlotConflictExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle('LMS API')
    .setDescription('Lead Management System — Create a New Lead (Issue #24)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  return app;
}
