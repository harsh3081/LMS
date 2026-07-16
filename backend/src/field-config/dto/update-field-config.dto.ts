import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

export class UpdateFieldConfigItemDto {
  @ApiProperty({ example: 'customerName' })
  @IsString()
  fieldName!: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'mandatory must be a boolean' })
  mandatory!: boolean;
}

/**
 * PUT /api/v1/field-config body (AC2): the full or partial set of toggles
 * to apply in one call. Unknown fieldName values are rejected with 400
 * (UnknownFieldConfigError) rather than silently ignored, so an admin typo
 * is surfaced rather than swallowed.
 */
export class UpdateFieldConfigDto {
  @ApiProperty({ type: [UpdateFieldConfigItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'fields must contain at least one entry' })
  @ValidateNested({ each: true })
  @Type(() => UpdateFieldConfigItemDto)
  fields!: UpdateFieldConfigItemDto[];
}
