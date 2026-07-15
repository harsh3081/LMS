BUSINESS REQUIREMENTS DOCUMENT

Lead & Enquiry Management Web Application

For Automotive Dealerships — Enabling Ease of Doing Business

Standalone Module, Designed for Future Integration with Booking Management, Invoicing & Payments

Document Version: 2.0

Date: 14-Jul-2026

Classification: Internal / Confidential

# 1. Document Control

## 1.1 Revision History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0 | 10-Jul-2026 | Business Analyst | Initial draft of BRD (mobile application) |
| 2.0 | 14-Jul-2026 | Business Analyst | Redesigned for Web Application delivery; added standalone/modular integration architecture (Booking, Invoicing, Payments) while keeping all functionalities intact |

## 1.2 Distribution List

- Dealership Principal / General Manager

- Sales Manager

- IT / Technology Partner

- Project Sponsor

# 2. Purpose of the Document

This Business Requirements Document (BRD) defines the business need, scope, stakeholders, and detailed functional and non-functional requirements for a web-based Lead and Enquiry Management System for automotive dealerships. The document serves as the single point of reference for business stakeholders, the technology/development team, and testing teams to align on “what” the solution must do, ahead of detailed solution design (FRD/technical design). This version supersedes the earlier mobile-application-based BRD: the delivery channel has changed to a web application, while all functional requirements and business outcomes remain fully intact. In addition, this version introduces requirements for a modular, standalone architecture that can be integrated in future with other sales modules such as Booking Management, Invoicing, and Payments.

# 3. Business Background & Problem Statement

Automotive dealerships rely heavily on the Dealer Sales Executive (DSE) to capture walk-in, telephonic, and digitally-sourced customer interest, nurture it through follow-ups and test drives, and convert it into a vehicle booking. Today this process is frequently managed through manual registers, spreadsheets, or disconnected point tools, leading to:

- Loss of leads/enquiries due to missed or undocumented follow-ups.

- Lack of real-time visibility for Team Leads and Sales Managers into DSE activity and pipeline health.

- Manual, error-prone test drive slot management leading to double bookings or vehicle unavailability.

- Delay in sharing brochures/quotations, impacting customer experience and conversion speed.

- Absence of a single dashboard to track conversion, allocation, and team performance.

- Disconnected downstream processes (booking, invoicing, payments) that are typically handled in separate systems or spreadsheets, with no common data thread back to the original enquiry.

A dedicated web application will digitize the end-to-end lead/enquiry lifecycle — from capture to conversion — while giving every level of the sales hierarchy (DSE, Team Lead, Sales Manager/GM) the visibility and tools needed to do business with ease. The application will be built as a standalone, self-contained module accessible from any standard web browser, and architected so that it can be integrated — now or later — with other sales modules such as Booking Management, Invoicing, and Payments, without requiring a redesign.

# 4. Business Objectives

- Provide a single web application for capturing, tracking, and converting leads and enquiries across the dealership, accessible from any desktop, laptop, or tablet browser.

- Reduce lead leakage by systematizing follow-ups with auto-generated next follow-up dates and reminders.

- Digitize and streamline test drive scheduling to maximize demo vehicle utilization and eliminate double-booking.

- Enable instant, in-app sharing of brochures and quotations to shorten the sales cycle.

- Give DSEs a clear, prioritized daily task list to improve productivity and follow-up discipline.

- Provide Team Leads and Sales Managers/GMs with real-time visibility, dashboards, and reassignment controls to manage team performance and resource allocation.

- Improve overall conversion ratio (enquiry-to-booking) and customer responsiveness across the dealership.

- Deliver the solution as a standalone module today, while ensuring the architecture supports future integration with Booking Management, Invoicing, and Payments modules with minimal rework.

# 5. Project Scope

## 5.1 In Scope

- Responsive web application (desktop, laptop, and tablet browsers) for DSE, Team Lead, and Sales Manager/GM personas.

- Lead creation and conversion to enquiry; direct enquiry creation.

- Configurable mandatory data capture fields for lead/enquiry creation.

- Follow-up management: Home Visit, Showroom Visit, Call, with remarks and auto-generated next follow-up date.

- Test drive booking and a test drive scheduler showing open/booked slots per vehicle.

- In-app sharing of brochures and quotations to customers.

- Dashboard/home page task counter and task list (Today / Tomorrow / Later) covering the current month.

- Team Lead view of team/DSE details, commenting, follow-up, and lead reassignment within the team.

- Team performance dashboard for TL (leaderboard, % allocation, % conversion).

- Sales Manager/GM capability to perform all DSE/TL functions, shuffle DSEs across TLs, and view a dealership-wide dashboard.

- Design and build of the module as a standalone, API-first application with well-defined integration points for future connection to Booking Management, Invoicing, and Payments modules.

## 5.2 Out of Scope (Phase 1)

- Actual functional build of Booking Management, Invoicing, and Payments modules — only integration-ready hooks/APIs are in scope; the modules themselves are a future phase.

- Integration with OEM (manufacturer) lead management/DMS systems — to be assessed in a future phase.

- Finance/loan processing and e-KYC workflows.

- After-sales service and workshop management.

- Inventory/stock management beyond vehicle availability for test drive scheduling.

- Customer-facing self-service portal.

- Native mobile application (the solution will be a responsive web application, optimized for but not packaged as a native app in this phase).

- Multi-language localization (assumed English/regional language support to be scoped separately if required).

# 6. Stakeholders

| Stakeholder | Role in the Project |
| --- | --- |
| Dealership Principal / GM | Business sponsor; approves scope, budget, and go-live. |
| Sales Manager | Defines dashboard KPIs; validates reassignment and reporting needs. |
| Team Leads | End users; provide input on team management and follow-up workflows. |
| Dealer Sales Executives (DSE) | Primary end users; provide input on day-to-day usability. |
| IT / Technology Partner | Designs, builds, tests, and deploys the web application; owns the integration architecture. |
| Business Analyst | Documents and validates business requirements (this document). |
| Future Module Owners (Booking / Invoicing / Payments) | Provide input on data/API contracts required for future integration. |

# 7. User Personas & Roles

The application follows a three-tier sales hierarchy. Each higher tier inherits the capabilities of the tier(s) below it, in addition to role-specific management capabilities. All personas access the system through a standard web browser; no dedicated mobile app is required.

| Persona | Description | Key Responsibilities in System | Reports To |
| --- | --- | --- | --- |
| Dealer Sales Executive (DSE) | Front-line sales staff who directly interact with walk-in, telephonic, and digitally-sourced customers, accessing the system via a web browser on desktop, laptop, or tablet at the dealership or on the move. | Create leads/enquiries, capture customer details, perform follow-ups, book test drives, share brochures/quotations, manage daily tasks. | Team Lead |
| Team Lead (TL) | Supervises a group of DSEs and monitors their day-to-day sales activity and pipeline health through the web application. | Track and coach DSEs, review/comment on enquiries, reassign leads within team, view team performance dashboard. | Sales Manager / GM |
| Sales Manager / General Manager (SM/GM) | Owns overall showroom sales performance and resource allocation across teams; typically accesses the system from a desktop/laptop for dashboard review. | All DSE and TL capabilities, plus shuffling DSEs across TLs, and viewing dealership-wide dashboards. | Dealership Principal / Management |

Hierarchy: DSE → Team Lead (TL) → Sales Manager / General Manager (SM/GM).

# 8. Business Process Overview

At a high level, the sales pipeline flows as follows:

- 1. Customer interest is captured as a Lead (e.g., from a walk-in enquiry, call, or digital source) or directly logged as an Enquiry if sufficiently qualified.

- 2. A Lead is qualified and converted into an Enquiry once minimum qualifying details are available.

- 3. The DSE nurtures the Enquiry through scheduled follow-ups (Call / Showroom Visit / Home Visit), each closed with remarks and a system-generated next follow-up date.

- 4. Where applicable, a Test Drive is booked against an available vehicle slot.

- 5. Brochures and quotations are shared with the customer to support their decision-making.

- 6. The Enquiry progresses through statuses (e.g., Hot/Warm/Cold) until it converts to a Booking or is marked Lost.

- 7. Team Leads and Sales Managers/GMs monitor this pipeline in real time, intervene via comments/reassignment, and track performance through dashboards.

- 8. (Future state) Upon conversion to a confirmed sale, the Enquiry record hands off relevant data to the Booking Management module, which in turn connects to Invoicing and Payments — giving the sales team continued visibility of downstream status without leaving the Lead & Enquiry system.

# 9. Solution Architecture Approach — Standalone with Future Integration

A key business requirement is that this module must work fully as a standalone Lead & Enquiry Management web application, while being architected so that it can be integrated — now or later — with other sales modules (Booking Management, Invoicing, Payments) without a rebuild. The following principles guide the solution design:

- API-first design: All core functions (lead/enquiry CRUD, follow-ups, test drive scheduling, task management, dashboards) shall be exposed via well-documented REST APIs, with the web application itself consuming the same APIs.

- Loose coupling: The module shall not hard-code dependencies on Booking, Invoicing, or Payments systems; integration shall occur through defined API contracts and/or event notifications, not direct database access.

- Shared master data readiness: Customer, vehicle/model, and dealership/location master data structures shall be designed so they can be shared or synchronized with other modules, avoiding duplicate data entry once integration occurs.

- Event-driven hooks: Key business events (e.g., Enquiry Converted, Booking Confirmed placeholder) shall be published as events/webhooks that other modules can subscribe to in future, even if no subscriber exists in Phase 1.

- Independent deployability: The module shall be deployable and fully operational on its own infrastructure (standalone), and shall not require Booking/Invoicing/Payments modules to exist or be reachable to function.

- Central identity readiness: The system shall be designed to plug into a centralized identity/authentication mechanism (SSO) in future, even if it uses standalone login in Phase 1.

This approach ensures the dealership can go live quickly with only the Lead & Enquiry Management module, and layer on Booking Management, Invoicing, and Payments modules in later phases with minimal disruption or rework.

# 10. Future Integration Requirements (Design-for-Now, Build-Later)

The following integration points are identified for future phases. In Phase 1, the Lead & Enquiry Management module shall be designed to support these without requiring their actual implementation.

| Future Module | Integration Need | Suggested Mechanism | Phase |
| --- | --- | --- | --- |
| Booking Management | On enquiry conversion to a confirmed sale, push enquiry/customer/vehicle details to the Booking module to initiate the booking record without re-entry. | REST API / Event (e.g., "EnquiryConverted") — push | Future Phase |
| Invoicing | On booking confirmation (from Booking module or externally), reflect invoicing status back on the Enquiry record for sales team visibility. | REST API / Event (e.g., "InvoiceGenerated") — pull/subscribe | Future Phase |
| Payments | Reflect payment/receipt milestones (booking amount, full payment) against the Enquiry/Booking for DSE and TL visibility. | REST API / Event (e.g., "PaymentReceived") — pull/subscribe | Future Phase |
| Customer Master / CRM | Share a common customer master (avoid duplicate customer records across modules). | Shared master data service or synchronized customer ID | Phase 1 (design for), Integrate later |
| Vehicle / Inventory Master | Share vehicle model, variant, and demo/stock availability data used for enquiry, test drive, and quotation. | Shared master data service / API | Phase 1 (design for), Integrate later |
| Identity & Access (SSO) | Common login/authentication across sales modules (Lead & Enquiry, Booking, Invoicing, Payments) as they are added. | SSO / OAuth 2.0 – centralized identity provider | Phase 1 (design for), Integrate later |

# 11. Functional Requirements

Functional requirements are grouped by capability area below. Each requirement is prioritized as High (must-have for Phase 1 / MVP), Medium (should-have), or Low (nice-to-have). All functionalities from the original scope are retained; only the delivery channel has changed from a mobile app to a responsive web application.

## 11.1 Lead & Enquiry Creation

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-01 | DSE shall be able to create a new Lead by capturing minimum mandatory details (name, mobile number, source, model of interest) through a web form. | High |
| FR-02 | DSE shall be able to convert an existing Lead into an Enquiry once qualifying details are captured (e.g., budget, variant, exchange, finance interest). | High |
| FR-03 | DSE shall be able to create an Enquiry directly, without going through the Lead stage, for walk-in or referred customers. | High |
| FR-04 | System shall enforce configurable mandatory fields at the time of Lead/Enquiry creation (name, contact number, model/variant, source of enquiry, location, expected purchase timeline, etc.). | High |
| FR-05 | System shall auto-capture metadata such as created-by, created-on date/time, and current owner (DSE) for every Lead/Enquiry. | Medium |
| FR-06 | System shall validate duplicate mobile numbers/leads and alert the DSE before creating a duplicate record. | Medium |

## 11.2 Follow-up Management

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-07 | DSE shall be able to log a follow-up against an Enquiry with follow-up type: Home Visit, Showroom Visit, or Call. | High |
| FR-08 | DSE shall be able to add free-text remarks against each follow-up capturing the outcome of the interaction. | High |
| FR-09 | System shall prompt the DSE to select/confirm the Next Follow-up Date at the time of closing a follow-up; system shall auto-generate a reminder/task for that date. | High |
| FR-10 | System shall maintain a chronological follow-up history/timeline for each Enquiry, visible to the DSE, TL, and SM/GM based on access rights. | Medium |
| FR-11 | System shall allow the enquiry status to be updated as part of the follow-up (e.g., Hot, Warm, Cold, Lost, Booked). | Medium |

## 11.3 Test Drive Management

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-12 | DSE shall be able to book a Test Drive for a customer against a specific vehicle/variant, date, and time slot. | High |
| FR-13 | System shall provide a Test Drive Scheduler (calendar/grid view) showing open and already-booked slots against each demo vehicle in real time. | High |
| FR-14 | System shall prevent double-booking of the same vehicle for an overlapping time slot. | High |
| FR-15 | System shall auto-create a task/reminder for the DSE ahead of the scheduled test drive. | Medium |
| FR-16 | DSE shall be able to mark a test drive as Completed/No-show/Cancelled and add remarks post drive. | Medium |

## 11.4 Digital Sharing — Brochure & Quotation

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-17 | DSE shall be able to share a digital Brochure with the customer directly from the web application (e.g., via WhatsApp/SMS/Email link or attachment). | High |
| FR-18 | DSE shall be able to generate and share a Quotation from within the application, using enquiry details (model, variant, accessories, on-road price, exchange, finance) as a downloadable/shareable PDF. | High |
| FR-19 | System shall log every brochure/quotation shared against the respective Enquiry for audit and follow-up context. | Medium |

## 11.5 Home Page / Dashboard & Task Management

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-20 | The system's landing dashboard/home page shall display a task counter showing the total number of pending tasks for the day, sorted in ascending order of due time. | High |
| FR-21 | Home page shall display a task list below the counter; clicking a task shall open full task details (customer, enquiry, task type, due date/time) without a full page reload. | High |
| FR-22 | Tasks shall include, but not be limited to: follow-ups (call/home visit/showroom visit), test drives, and documentation activities. | High |
| FR-23 | DSE shall be able to view tasks segmented into three tabs/filters: Today, Tomorrow, and Later (covering the remaining days of the current month). | High |
| FR-24 | DSE shall be able to mark a task as complete or reschedule it, which shall update the underlying enquiry follow-up record. | Medium |

## 11.6 Team Lead (TL) Capabilities

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-25 | TL shall be able to view the list of DSEs mapped to his/her team along with each DSE's active lead/enquiry count. | High |
| FR-26 | TL shall be able to drill down into any DSE's leads/enquiries to track stage, ageing, and last follow-up. | High |
| FR-27 | TL shall be able to view and add comments on any enquiry owned by a DSE in his/her team. | High |
| FR-28 | TL shall be able to record a follow-up directly on a DSE's enquiry, where required. | Medium |
| FR-29 | TL shall be able to reassign a Lead/Enquiry from his/her own name to any DSE in the team, and between DSEs within the team. | High |
| FR-30 | System shall maintain an audit trail of all reassignment actions (from, to, by whom, date/time, reason). | Medium |
| FR-31 | TL shall have access to a Team Performance Dashboard showing a leaderboard, % lead allocation per DSE, and % conversion (enquiry to booking) per DSE. | High |

## 11.7 Sales Manager / General Manager (SM/GM) Capabilities

| FR ID | Requirement Description | Priority |
| --- | --- | --- |
| FR-32 | SM/GM shall have all functional capabilities available to DSE and TL roles across the dealership. | High |
| FR-33 | SM/GM shall be able to shuffle/reassign DSEs from one TL's team to another TL's team. | High |
| FR-34 | SM/GM shall have a dealership-level Dashboard consolidating performance across all teams (lead inflow, conversion funnel, source-wise performance, test drive to booking ratio, TL-wise and DSE-wise leaderboard). | High |
| FR-35 | SM/GM shall be able to filter dashboards by date range, source, model, TL/team, and location (for multi-outlet dealer groups). | Medium |
| FR-36 | System shall provide exportable reports (Excel/PDF) from all dashboards for offline analysis and management reporting. | Medium |

# 12. Role – Permission Matrix

| Feature / Function | DSE | TL | SM / GM |
| --- | --- | --- | --- |
| Create Lead / Enquiry | Yes | Yes | Yes |
| Convert Lead to Enquiry | Yes | Yes | Yes |
| Add Follow-up & Remarks | Yes | Yes | Yes |
| Book Test Drive | Yes | Yes | Yes |
| Share Brochure / Quotation | Yes | Yes | Yes |
| View Own Tasks (Today/Tomorrow/Later) | Yes | Yes | Yes |
| View Team's Leads/Enquiries | No | Yes (own team) | Yes (all teams) |
| Comment on Team Enquiries | No | Yes | Yes |
| Reassign Leads within Team | No | Yes | Yes |
| Shuffle DSE across Teams | No | No | Yes |
| Team Performance Dashboard | No | Yes | Yes |
| Dealership-wide Dashboard | No | No | Yes |
| Export Reports | Limited (own data) | Yes (team data) | Yes (all data) |

# 13. Dashboard & Reporting Requirements

The application shall provide role-appropriate dashboards, updated in near real time:

- DSE: Personal task summary and own conversion snapshot.

- TL: Team leaderboard, % lead allocation across DSEs, % conversion by DSE, ageing enquiries.

- SM/GM: Dealership-wide leaderboard (team-wise and DSE-wise), source-wise performance, test-drive-to-booking ratio, and filters by date range/model/location.

Key KPIs to be tracked across dashboards:

| KPI | Description | Primary Owner |
| --- | --- | --- |
| Lead-to-Enquiry Conversion % | Percentage of captured leads successfully converted into qualified enquiries. | DSE / TL |
| Enquiry-to-Booking Conversion % | Percentage of enquiries that result in a vehicle booking. | TL / SM-GM |
| Follow-up Adherence % | Percentage of scheduled follow-ups completed on or before the due date. | TL |
| Test Drive to Booking Ratio | Number of bookings generated per test drive conducted. | SM/GM |
| Average Task Turnaround Time | Average time taken by a DSE to close a due task. | TL |
| Source-wise Performance | Conversion performance segmented by lead source (walk-in, digital, referral, etc.). | SM/GM |
| DSE/TL Leaderboard Ranking | Ranking of DSEs/Teams by conversion % and volume for a selected period. | SM/GM |

# 14. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Performance | Key pages (Home/Dashboard, Task list, Enquiry list) shall load within 3 seconds on a standard broadband/office network connection. |
| Availability | Application shall target 99.5% uptime during business hours; scheduled maintenance windows communicated in advance. |
| Usability | Responsive web design supporting desktop, laptop, and tablet screen sizes; consistent navigation and minimal clicks for core actions (add follow-up, book test drive). |
| Browser Compatibility | Application shall support the latest two versions of Google Chrome, Microsoft Edge, Mozilla Firefox, and Safari. |
| Security | Role-based access control (RBAC); data encryption in transit (HTTPS/TLS) and at rest; masked display of full customer contact details based on role; secure session management with auto-logout on inactivity. |
| Scalability | System shall support scaling from a single dealership to a multi-outlet, multi-location dealer group with centralized reporting, without redesign. |
| Auditability | All create/update/reassign/delete actions on leads and enquiries shall be logged with user, timestamp, and change detail. |
| Notifications | In-app, email, and/or SMS/WhatsApp notifications for due follow-ups, test drives, and reassigned leads. |
| Modularity | The Lead & Enquiry Management module shall be built as a self-contained, API-first module deployable standalone, and capable of being integrated with other sales modules (Booking Management, Invoicing, Payments) without re-architecture. |

# 15. Assumptions

- DSEs, TLs, and SM/GM will access the system using existing desktops, laptops, or tablets available at the dealership; no new hardware procurement is assumed.

- Master data (vehicle models/variants, demo vehicle inventory, dealership locations, user hierarchy) will be maintained/configured by the dealership admin.

- Brochure and quotation templates/content will be provided by the dealership/OEM marketing team.

- Users will have valid mobile numbers/email IDs for login/authentication and for sharing content with customers.

- Stable office/showroom internet connectivity will be available for web application access; no offline mode is assumed for this web-based Phase 1 (unlike the earlier mobile version).

- Booking Management, Invoicing, and Payments modules are not being built in this phase; only integration-readiness is in scope.

# 16. Constraints

- Solution must work within the dealership's existing IT/network infrastructure and approved browser/device policy.

- Any integration with third-party CRM/DMS, OEM systems, or future Booking/Invoicing/Payments modules is subject to availability of APIs from those systems and is out of scope for Phase 1 build.

- Rollout timelines are dependent on availability of master data and user hierarchy mapping from the dealership.

# 17. Dependencies

- Finalized organization hierarchy (DSE-to-TL-to-SM/GM mapping) before user provisioning.

- Vehicle/demo fleet master data for test drive scheduler configuration.

- Brochure and quotation content/format sign-off from dealership/marketing.

- Definition of API/integration contracts if any future-phase integration work is planned to start in parallel.

# 18. Risks & Mitigation

| Risk | Potential Impact | Mitigation |
| --- | --- | --- |
| Low data entry compliance by DSEs at point of lead capture. | Incomplete/incorrect data affecting follow-up quality and reporting accuracy. | Enforce mandatory fields; simplify UI; provide quick-entry templates and DSE training. |
| Duplicate leads created across channels (call centre, walk-in, digital). | Inflated lead counts, confused ownership, poor customer experience. | Implement duplicate-detection on mobile number/name and merge workflow. |
| Resistance to adoption by experienced DSEs used to manual/register-based tracking. | Low usage, parallel manual tracking, incomplete pipeline visibility. | Change management, gamified leaderboard, TL-led adoption drive, simple onboarding. |
| Browser/device fragmentation across dealership desktops and shared terminals. | Inconsistent user experience or rendering issues. | Define and test against a supported browser matrix; responsive design QA across screen sizes. |
| Tight coupling of Lead & Enquiry module to future Booking/Invoicing/Payments modules. | Difficult to scale or replace one module without breaking others. | Enforce API-first, loosely-coupled architecture with well-defined integration contracts from Phase 1. |
| Unauthorized reassignment or data access across teams. | Data integrity and trust issues among sales staff. | Strict role-based access control and reassignment audit trail. |

# 19. Acceptance Criteria (Business Sign-off)

- All High priority functional requirements (Sections 11.1–11.7) are demonstrably working in a UAT environment on all supported browsers.

- DSE can complete the full flow: create lead → convert to enquiry → follow-up → test drive → share quotation → update status, entirely within the web application.

- TL can view team enquiries, add comments, and reassign leads within the team successfully.

- SM/GM can shuffle DSEs across TLs and view a consolidated, filterable dealership dashboard.

- Home page task counter and Today/Tomorrow/Later views correctly reflect follow-up, test drive, and documentation tasks.

- Core APIs underlying lead/enquiry creation, follow-up, and status-change are documented and confirmed reusable for future module integration.

- No critical or high-severity defects open at the time of go-live sign-off.

# 20. Glossary

| Term | Definition |
| --- | --- |
| Lead | An initial, minimally-qualified expression of customer interest captured by a DSE. |
| Enquiry | A qualified customer interest record with sufficient detail to be actively pursued for conversion. |
| DSE | Dealer Sales Executive — front-line sales staff. |
| TL | Team Lead — supervises a group of DSEs. |
| SM/GM | Sales Manager / General Manager — overall sales head of the dealership. |
| Follow-up | A scheduled interaction (call, showroom visit, or home visit) with a customer against an enquiry. |
| Test Drive Scheduler | The calendar/slot view showing open and booked test drive slots per vehicle. |
| Conversion | The event of an enquiry resulting in a confirmed vehicle booking. |
| Leaderboard | A ranked view of DSE or team performance based on defined KPIs. |
| Standalone Module | A software component that is fully functional and deployable on its own, without requiring other modules to exist. |
| API-first | A design approach where all functionality is built and exposed as APIs first, with the user interface (and other systems) consuming those same APIs. |
| Webhook / Event | A notification automatically sent by the system when a defined business event occurs, allowing other systems to react to it. |

# 21. Approval

This document requires review and formal sign-off from the following stakeholders prior to proceeding to solution design (FRD):

| Name | Role | Signature | Date |
| --- | --- | --- | --- |
|  | Dealership Principal / GM |  |  |
|  | Sales Manager |  |  |
|  | IT / Technology Partner |  |  |
|  | Business Analyst |  |  |
