import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

/**
 * Client-supplied fields ONLY (tech-design.md Data Design / ref-code.md
 * Warnings). Owner/tenant/convertedBy/status are intentionally absent from
 * this type — they can never be set by a client because the type does not
 * carry them, and the global ValidationPipe (`whitelist: true`) strips any
 * extra body properties before they ever reach the service — they are
 * silently ignored, never honored (EVAL-CC-01). `leadId` comes from the
 * route path param, never the body.
 *
 * `budget` is stored as a `bigint` column (resolved Clarification Q1 — no
 * int4 overflow risk, no explicit upper bound) but is validated here as a
 * plain positive integer `number`; `@Type(() => Number)` coerces any
 * JSON-numeric-looking input before `@IsInt`/`@IsPositive` run, while a
 * genuinely non-numeric string (e.g. "five-lakh") still fails `@IsInt`
 * (`Number('five-lakh')` is `NaN`, which is not an integer).
 */
export class ConvertLeadDto {
  @ApiProperty({ example: 500000, description: 'Positive integer INR (whole rupees)' })
  @Type(() => Number)
  @IsInt({ message: 'budget must be a positive integer' })
  @IsPositive({ message: 'budget must be a positive integer' })
  budget!: number;

  @ApiProperty({ example: 'VXi (O) CVT' })
  @IsString()
  @IsNotEmpty({ message: 'variant is required' })
  variant!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'exchangeInterest is required and must be a boolean' })
  exchangeInterest!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean({ message: 'financeInterest is required and must be a boolean' })
  financeInterest!: boolean;
}
