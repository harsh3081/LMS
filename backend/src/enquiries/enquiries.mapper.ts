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

    // ---- issue #124 Section 1: Vehicle Information ----
    fuelType: enquiry.fuelType,
    transmission: enquiry.transmission,
    colorFirstPreference: enquiry.colorFirstPreference,
    colorSecondPreference: enquiry.colorSecondPreference,
    accessoriesInterest: enquiry.accessoriesInterest,
    competitorConsideration: enquiry.competitorConsideration,

    // ---- Section 2: Qualification ----
    contactVerified: enquiry.contactVerified,
    intentRating: enquiry.intentRating,
    expectedClosureDate: enquiry.expectedClosureDate,
    showroomVisits: enquiry.showroomVisits,

    // ---- Section 3: Commercial ----
    quotationNumber: enquiry.quotationNumber,
    quotedOnRoadPrice: enquiry.quotedOnRoadPrice,
    discountDiscussed: enquiry.discountDiscussed,
    insurancePreference: enquiry.insurancePreference,
    extendedWarrantyInterest: enquiry.extendedWarrantyInterest,
    corporateDiscountEligible: enquiry.corporateDiscountEligible,

    // ---- Section 4: Finance ----
    financeApplicationStatus: enquiry.financeApplicationStatus,
    financier: enquiry.financier,
    loanAmountSought: enquiry.loanAmountSought,
    tenureAndEmiDiscussed: enquiry.tenureAndEmiDiscussed,

    // ---- Section 5: Exchange Evaluation ----
    exchangeEvaluationStatus: enquiry.exchangeEvaluationStatus,
    exchangeEvaluatedBy: enquiry.exchangeEvaluatedBy,
    exchangeEvaluatedPrice: enquiry.exchangeEvaluatedPrice,
    exchangeCustomerExpectation: enquiry.exchangeCustomerExpectation,

    // ---- Section 6: Test Drive & Engagement ----
    testDriveStatus: enquiry.testDriveStatus,
    testDriveDateTime:
      enquiry.testDriveDateTime instanceof Date ? enquiry.testDriveDateTime.toISOString() : enquiry.testDriveDateTime,
    quotationSharedVia: enquiry.quotationSharedVia,
    nextActionOwnerId: enquiry.nextActionOwnerId,
    testDriveFeedback: enquiry.testDriveFeedback,

    // ---- Section 7: Document Checklist ----
    panCardVerified: enquiry.panCardVerified,
    addressProofVerified: enquiry.addressProofVerified,
    incomeProofVerified: enquiry.incomeProofVerified,
    gstDetailsVerified: enquiry.gstDetailsVerified,
  };
}
