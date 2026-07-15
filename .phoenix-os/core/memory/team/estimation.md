# Engineering Team Estimation Guidelines

## Purpose
Provide lightweight, technology-agnostic sizing guardrails for Engineering Manager workflows. Use these ranges to maintain consistency across TODO planning and Phase 3 analysis deliverables.

## Estimation Bands
- **XS (0.5 day)**: Single TDD cycle or documentation update with limited coordination.
- **S (1 day)**: One or two TDD cycles plus review, minimal cross-team impact.
- **M (2-3 days)**: Multiple modules involved, requires coordination with stakeholders, moderate risk.
- **L (4-5 days)**: Broad blast radius, several validation passes, requires contingency planning.

## Usage Rules
- Size each TODO step based on expected effort to complete a full TDD loop (write failing test → minimal implementation → refactor → revalidate).
- When uncertainty is high, choose the higher band and capture assumptions in the Notes section.
- Revisit estimates after user approval if new architectural guidance is introduced by principal architects.

## Additional Considerations
- Track dependencies separately; do not inflate estimates for waiting time.
- Ensure all estimates remain tech-neutral—focus on coordination, validation count, and risk.
