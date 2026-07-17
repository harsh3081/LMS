import { FollowupEntity } from './entities/followup.entity';
import { FollowupResponseDto } from './dto/followup-response.dto';

/** Shared entity->response mapping (mirrors enquiries.mapper.ts's
 * toEnquiryResponse convention). */
export function toFollowupResponse(followup: FollowupEntity): FollowupResponseDto {
  return {
    followupId: followup.followupId,
    enquiryId: followup.enquiryId,
    type: followup.type,
    remarks: followup.remarks,
    loggedBy: followup.loggedBy,
    locationId: followup.locationId,
    loggedAt: followup.loggedAt instanceof Date ? followup.loggedAt.toISOString() : followup.loggedAt,
    nextFollowUpAt: followup.nextFollowUpAt
      ? followup.nextFollowUpAt instanceof Date
        ? followup.nextFollowUpAt.toISOString()
        : followup.nextFollowUpAt
      : null,
    resultingStatus: followup.resultingStatus ?? null,
  };
}
