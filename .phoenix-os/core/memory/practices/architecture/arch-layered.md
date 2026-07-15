# High level layered architecture
This file holds the details of the different layers in a layered architecture, and a brief desription of each layer. 

This file explain all the layers that may span across different projects. 

## Guidance to use and when not to use

**Must** use when you have multiple presentations channels - web, mobile etc. The Experience layer becomes a very powerful layer to serve each channel with optimised responses.

**Must** use to abstract busienss logic behind services to deliver especially using microserives. Backend can scale independently, and busienss services are isolated from frontend.

**Consider** when you want to have backend and frontend teams work differently. Contracts will become the bridge. This is also called Contract-based working model.

**Avoid** to use if you are building a simple CRUD application, or doing rapid prototyping.

**CRITICAL**: When an architect is checking on the feasability of this architecture, always ask questions to make an assessment. **DO NOT** proceed further until you have all the clarifications. **Must** provide a recommendation based on the questions.

**CRITICAL**: For any other roles, assume that this architecture is needed, and provide architectural design.


## Rules
Layers can reference each other only as per the following rules:
1. Each layer can invoke the layer behind it
    - The order or layers Outside-In is Frontend -> Experience -> Services -> Data
2. No layer can even know about the layer in front of it
3. There should **NEVER** be any cyclic dependencies
4. Any project created will access to one of these layer at any given point in time. Projects **must not** hold more than 1 layer


# Frontend Layer
The consumer-facing layer that provides multi-channel access to the platform.

### Web Applications
Consumer web portal for all types of consumer actions. This **can** include:
- Progressive Web App (PWA) capabilities for offline functionality
- Responsive design supporting desktop, tablet, and mobile devices

### Mobile Applications
- Native iOS and Android applications for enhanced mobile experience

### Specialized Interfaces
- Do not need any specialised interfaces




# Experience Layer
The intermediary layer that provides abstraction between frontend and backend services. **Must** follow OpenAPI standards when creating specifications.

### API Gateway
**Must** check if we are supposed to build this? Reason: at times, we use infrastructure and coding / desing for this is not needed.
- Single entry point for all client requests
- Request routing and load balancing
- Rate limiting and throttling
- Authentication and authorization enforcement using JWT tokens. Frontend layer **must** ensure that it send a JWT token for passing the authentication via API. Even if there is no login, the frontend layer will need a guest token to pass through this layer
- **MUST** support API versioning and backward compatibility

### Backend for Frontend (BFF)
**Must** be implemented in code.
- Ensure the endpoints support channel-specific invocations. The frontend layer should send this infrormation in headers or the endpoint should include this information. **Required** to check if there is confusion
- Response optimization for different client types
- **Should** support caching and enabled *ONLY IF** API Gateway doesn't hav caching enabled
- Protocol supports - REST, GraphQL, gRPC. **Priorotise** REST




# Services Layer
The core business logic layer implementing domain-driven microservices:

### Domain Services
**CRITICAL**: Check for following conditions:
1. Is there a domain detial available. 
2. Is Domain-Driven Architecture selected? 

If any of these conditions are **TRUE**, then you **MUST** seek details for the domain and domain entities. If domain entities are not avaialable, you **must** terminate. 

Once you receive the domain entity information, you **must** save this information into `${config.project.specs-location}`. Send the information of the location to anyone asks for it. Also, pass the instruction that **ONLY** senior roles in a development team are **allowed** to change these entities. 


Example representation of a light weight commerce application:
- Consumer Service: User management, profiles, preferences, loyalty programs
- Product Service: Item catalog, pricing, availability, nutritional information
- Order Service: Order processing, cart management, order history, fulfillment
- Payment Service: Payment processing, billing, refunds, financial reporting
- Inventory Service: Stock management, supplier integration, demand forecasting
- Campaign Service: Promotions, discounts, marketing campaigns, loyalty rewards
- Notification Service: Multi-channel messaging, alerts, communication preferences

### Integration Services
- External payment gateway connectors
- Third-party CMS and content delivery integrations
- ERP, CRM and supply chain system adapters
- Authentication provider integrations





# Data Layer
Represents the persistence layer. System **can** support multiple databases and hence if the any agent asks for design for either, you can share.

### Relational Databases
- Transactional data requiring ACID properties
- Financial records, order processing, user authentication
- Complex queries and reporting requirements
- Referential integrity and structured data

### Document Databases
- Flexible schema requirements and JSON data
- User preferences, product catalogs with varying attributes
- Content management and campaign configurations
- Global distribution and multi-region replication


# Cross-Cutting Concerns

### Security
- Role-based access control (RBAC) and fine-grained permissions
- Data encryption at rest and in transit
- API security with rate limiting and CORS policies

### Monitoring & Observability
- Distributed tracing across layer and service boundaries
- Centralized logging with correlation IDs. Best practice for correlation IDs **should** be based on the selected `${config.project.bp.tech-stack}`
- Health checks and service availability monitoring
