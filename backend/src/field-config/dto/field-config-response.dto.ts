import { ApiProperty } from '@nestjs/swagger';

/** One field's current configuration (GET /api/v1/field-config, AC1/AC2). */
export class FieldConfigEntryDto {
  @ApiProperty({ example: 'customerName' })
  fieldName!: string;

  @ApiProperty({ example: 'Customer Name' })
  label!: string;

  @ApiProperty({ example: true })
  mandatory!: boolean;

  @ApiProperty({ nullable: true, type: String })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true, type: String })
  updatedAt!: string | null;
}
