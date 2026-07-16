import { EnquiryEntity } from './entities/enquiry.entity';
import { EnquiryResponseDto } from './dto/enquiry-response.dto';

/** Shared entity->response mapping (issue #26) — extracted so both
 * EnquiriesController (convert sub-resource, #25) and DirectEnquiryController
 * (#26) stay in lock-step on the response shape rather than maintaining two
 * copies of the same field list. */
export function toEnquiryResponse(enquiry: EnquiryEntity): EnquiryResponseDto {
  return {
    enquiryId: enquiry.enquiryId,
    leadId: enquiry.leadId,
    entryType: enquiry.entryType,
    customerName: enquiry.customerName,
    mobile: enquiry.mobile,
    sourceId: enquiry.sourceId,
    modelId: enquiry.modelId,
    budget: enquiry.budget,
    variant: enquiry.variant,
    exchangeInterest: enquiry.exchangeInterest,
    financeInterest: enquiry.financeInterest,
    convertedBy: enquiry.convertedBy,
    convertedAt: enquiry.convertedAt instanceof Date ? enquiry.convertedAt.toISOString() : enquiry.convertedAt,
    status: enquiry.status,
    ownerId: enquiry.ownerId,
    ownerUpdatedAt:
      enquiry.ownerUpdatedAt instanceof Date ? enquiry.ownerUpdatedAt.toISOString() : enquiry.ownerUpdatedAt,
    locationId: enquiry.locationId,
  };
}
