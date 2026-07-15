# Architecture Principles
This file holds key principles that define a good architecture. We have compiled this list based on the industry experience, and this list should serve the pupose in most cases

**IMPORTANT**: As a rule, this layer of Memory (Architecture) **MUST** be technology agnostic

When in doubt, **ALWAYS** give 2 options along-with trade-offs and ask for choice. **NEVER** proceed without confirmation

## Design Principles

### SOLID principles applied at all levels
- S - Single Responsibility Principle
- O - Open/Closed Principle
- L - Liskov Substitution Principle
- I - Interface Segregation Principle
- D - Dependency Inversion Principle

### DRY (Don't Repeat Yourself)

### KISS (Keep it Simple, Stupid)

### YAGNI (You Aren't Gonna Need It)

### Domain-Driven design principles
- Consider: when you have Complex business domains

### MACH principles (Microservices, API-first, Cloud-native, Headless)
- Consider: when you need scale and have distributed systems

### Design for emergent Reuse
- **DO NOT** over engineer
- **DO NOT** reuse for the sake of it
- **Must** be done when the systems are going to be used for long time
- Consider when you are creating a prototype

### Design as evolutionary system
- When you change your system, ensure it is an isolated change
- Releases should be quick
- Future proof your system
- Consider: Release often, prefer to be every 2-4 weeks

### Design for scale
- **Must** design for horizontal scale
- Should design for some vertical scaling

Consider: Scaling prioritization when both approaches are viable

- **Primary horizontal** → Better fault tolerance, higher operational complexity
- **Primary vertical** → Lower complexity, potential bottlenecks at scale

### Design for unit tesing first
- Tests should not long to run
- Testing priority should be as follows:
  - Prefer Integrations tests over Mocking Unit tests
  - IF integration tests cant be written due to dependencies, **ONLY THEN ALLOW** mocking
    - **DO NOT** use stubs
- Test coverage **must** be minimum 80% coverage for all components
- Should consider TDD. But ask for confirmation when writing. If you find evidence of TDD earlier, follow it
- Quality gates **must** pass for any development to be considered to be complete

### Develop for simplicity
- Build functions for single purpose
- Functions should not be very large
- Names should be descriptive and express their pupose
- Cyclomatic complexity is **required** to be <10
- Functions should have 3 or fewer parameters

### Design for separation of concerns
- Each Each architectural layer should be independent and replaceable
- Core business rules should be isolated from infrastructure
- Presentation logic should never contain business rules
- Database operations should be abstracted through repositories
- Security, logging, and monitoring to be designed using AOP

### Design for security
- Secure the entry points, and design for minimal entry points
- Consider Zero Trust Architecture as per requirements
- Code with principle of lease privilege and give minimal access rights for users and services
- All inputs **must** be validated at boundaries
- Prevent injection attacks through proper encoding
- Never hardcode secrets, use secure vaults

### Design for performance & scalability
- Multi-level caching - CDN, API and Database
- Proper indexing, query optimization, connection pooling
- Efficient resource utilization through pooling, use frameworks to provide for pooling, **DO NOT** attemt to implement pooling
- Distribute traffic across multiple instances

Consider: Asynchronous Processing for long-running operations.

### Design for reliability
- Design for 99.99% uptime minimum
- System should gracefully handle component failures
- Prevent cascading failures in distributed systems
- Intelligent retry with exponential backoff
- Regular health monitoring and auto-recovery
- Documented recovery procedures and regular drills

### Rules to follow when selecing an architecture
**MUST** use API-First Design without exception

**REQUIRED** to use Microservices Architecture when building distributed systems, and independently deployable systems.

**NEVER** build a monolith. ModularMonolith is **ACCEPTABLE**, BUT always check before selecting this.

**SHOULD** use Event-Driven Architecture when we want to build loosely coupled systems and **must** be used when selecting Microservices Architecture.

**CONSIDER** the use of Domain-Driven Design **ONLY WHEN** the domain is clear.

**CONSIDER** CQRS Pattern only when we need different optimisation strategies given the scale of read vs. writes. Consider the rules:

  - High read/write ration imbalance. **Consider** when we have 80% reads, and 20% writes
  - Different scaling needs
  - **MUST** be used when we have different read and write data models

### Deployment principles
**MUST** design for container based deployment starategy. Use of Dockers is **MANDATORY**
**REQUIRED** to use feature toggles for safe feature rollout and A/B testing
