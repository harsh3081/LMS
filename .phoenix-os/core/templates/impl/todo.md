# Implementation TODO

> **Instructions**: Structure tasks hierarchically with clear parent-child relationships. Each task should be ≤ 2 hours of work. Use visual indentation (not BOLD) for hierarchy. Check boxes track completion. Follow TDD cadence from best practices.

**Issue**: #{issue_number}
**Title**: {issue_title}
**Created**: {timestamp}

---

## Task Breakdown

Step 0: {high_level_task_name}
[ ] 0.1: {sub_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 0.1.1: {detailed_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 0.1.2: {detailed_task_name} - Est: {estimate} - {tdd_phase}
[ ] 0.2: {sub_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 0.2.1: {detailed_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 0.2.2: {detailed_task_name} - Est: {estimate} - {tdd_phase}
        [ ] 0.2.2.1: {micro_task_name} - Est: {estimate} - {tdd_phase}
        [ ] 0.2.2.2: {micro_task_name} - Est: {estimate} - {tdd_phase}

Step 1: {high_level_task_name}
[ ] 1.1: {sub_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 1.1.1: {detailed_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 1.1.2: {detailed_task_name} - Est: {estimate} - {tdd_phase}
[ ] 1.2: {sub_task_name} - Est: {estimate} - {tdd_phase}
    [ ] 1.2.1: {detailed_task_name} - Est: {estimate} - {tdd_phase}

---

## Task Guidelines

**Hierarchical Structure**:
- Step N: High-level phase/feature (no checkbox - grouping only)
- [ ] N.M: Sub-task (actionable, ≤ 2 hours)
- [ ] N.M.P: Detailed task (actionable, ≤ 2 hours)
- [ ] N.M.P.Q: Micro task (actionable, ≤ 2 hours)

**TDD Phases**:
- Red: Write failing test
- Green: Implement minimal code to pass test
- Refactor: Improve code while keeping tests green
- Integrate: Integration testing and validation

**Estimation**:
- Use time estimates: 15m, 30m, 1h, 1.5h, 2h
- Tasks > 2h should be broken down further
- Reference `${config.memory.team.estimation}` for guidance

**Visual Hierarchy**:
- Use indentation (4 spaces per level)
- No BOLD or special formatting for headings
- Step headers are plain text (no checkbox)
- All actionable items have `[ ]` checkbox

---

## Example Structure

Step 0: Setup and Configuration
[ ] 0.1: Initialize project structure - Est: 1h - TDD: Setup
    [ ] 0.1.1: Create directory structure - Est: 15m - TDD: Setup
    [ ] 0.1.2: Configure build tools - Est: 30m - TDD: Setup
    [ ] 0.1.3: Setup testing framework - Est: 15m - TDD: Setup
[ ] 0.2: Configure development environment - Est: 1h - TDD: Setup
    [ ] 0.2.1: Setup linting and formatting - Est: 30m - TDD: Setup
    [ ] 0.2.2: Configure CI/CD pipeline - Est: 30m - TDD: Setup

Step 1: Core Implementation
[ ] 1.1: Implement data model - Est: 2h - TDD: Red/Green
    [ ] 1.1.1: Write tests for data validation - Est: 30m - TDD: Red
    [ ] 1.1.2: Implement validation logic - Est: 1h - TDD: Green
    [ ] 1.1.3: Refactor for clarity - Est: 30m - TDD: Refactor
[ ] 1.2: Implement business logic - Est: 2h - TDD: Red/Green
    [ ] 1.2.1: Write unit tests - Est: 45m - TDD: Red
    [ ] 1.2.2: Implement core functions - Est: 1h - TDD: Green
    [ ] 1.2.3: Add error handling - Est: 15m - TDD: Green

Step 2: Integration
[ ] 2.1: API integration - Est: 1.5h - TDD: Integrate
    [ ] 2.1.1: Write integration tests - Est: 45m - TDD: Red
    [ ] 2.1.2: Implement API calls - Est: 45m - TDD: Green
[ ] 2.2: End-to-end validation - Est: 1h - TDD: Integrate
    [ ] 2.2.1: Write E2E tests - Est: 30m - TDD: Red
    [ ] 2.2.2: Verify complete flow - Est: 30m - TDD: Integrate

---

## Blockers and Dependencies
**Must** track dependencies between the tasks created

**Blockers**:
- [ ] {blocker_1}
- [ ] {blocker_2}

**Dependencies**:
- {dependency_1}
- {dependency_2}

**Open Questions**:
- [ ] {question_1}
- [ ] {question_2}

---

## Progress Tracking

**Total Tasks**: {total_count}
**Completed**: {completed_count}
**Remaining**: {remaining_count}
**Estimated Total Time**: {total_estimate}

---

**Status**: ⏳ Ready for Implementation

*This TODO breakdown follows Phoenix OS Phase 3 (Prepare) and Phase 4 (Design) standards. Tasks are sized for ≤ 2 hours, follow TDD cadence, and maintain technology-agnostic perspective. Update checkboxes as work progresses in Phase 6 (Implementation).*
