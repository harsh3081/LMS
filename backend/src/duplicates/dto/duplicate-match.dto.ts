import { ApiProperty } from '@nestjs/swagger';

/** One matching existing record (issue #29, AC2: "showing the matching
 * existing record(s)"). `label` mirrors customerName — null only in the
 * (currently impossible for Direct Enquiries/Leads, since customerName is
 * DB-nullable) edge case where a record predates a since-tightened
 * mandatory-field config. */
export class DuplicateMatchDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'LEAD', description: "'LEAD' | 'ENQUIRY'" }) type!: 'LEAD' | 'ENQUIRY';
  @ApiProperty({ nullable: true, type: String }) label!: string | null;
  @ApiProperty() status!: string;
}
