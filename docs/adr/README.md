# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made during the development of the Community Plugin Browser plugin.

## What are ADRs?

ADRs are documents that capture important architectural decisions along with their context and consequences. They help:

- Document why decisions were made
- Provide context for future developers
- Track the evolution of the architecture
- Avoid revisiting already-decided questions

## ADR Index

1. **[ADR-001: Service Layer Architecture](./0001-service-layer-architecture.md)**
   - Decision to separate business logic into service classes
   - Separation of concerns between services and views

2. **[ADR-002: Caching Strategy](./0002-caching-strategy.md)**
   - Multi-layered caching with ETags
   - Configurable cache duration based on refresh interval
   - Background refresh mechanism

3. **[ADR-003: View Management Pattern](./0003-view-management-pattern.md)**
   - Use of Obsidian's ItemView pattern
   - View lifecycle management
   - Event handling and cleanup

4. **[ADR-004: Testing Strategy](./0004-testing-strategy.md)**
   - Vitest as testing framework
   - Mocking strategy for Obsidian APIs
   - Test structure and coverage focus

5. **[ADR-005: Accessibility Implementation](./0005-accessibility-implementation.md)**
   - WCAG 2.1 Level AA compliance
   - ARIA labels and keyboard navigation
   - Screen reader support

6. **[ADR-006: Configuration Management](./0006-configuration-management.md)**
   - Centralized configuration in config.ts
   - Type-safe configuration interface
   - Performance tuning parameters

7. **[ADR-007: Error Handling and Rate Limiting](./0007-error-handling-and-rate-limiting.md)**
   - Retry logic with exponential backoff
   - Rate limit detection and handling
   - Graceful degradation strategies

## ADR Format

Each ADR follows this structure:

- **Status**: Accepted, Proposed, Deprecated, Superseded
- **Date**: When the decision was made
- **Deciders**: Who made the decision
- **Tags**: Keywords for categorization
- **Context**: What situation led to this decision
- **Decision**: What was decided
- **Consequences**: Positive and negative outcomes
- **References**: Related commits, documentation, or other ADRs

## Creating New ADRs

When making a significant architectural decision:

1. Create a new ADR file: `000X-short-title.md`
2. Follow the template structure
3. Update this README with the new ADR
4. Reference the ADR in relevant code comments

## References

- [ADR Template](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

