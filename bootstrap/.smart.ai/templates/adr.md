# ADR-NNNN: [Short imperative title of the decision]

<!--
INSTRUCTION: An ADR is an immutable, numbered record of a significant architectural decision OR a
foundation (a convention the project relies on). Replace NNNN with the next 4-digit sequence number
and name the file under `specifications.paths.adr_directory` as `NNNN-<slug>.md`. Never edit the
substance of a written ADR: record a change as a new ADR and mark the old one "superseded by
ADR-NNNN". When there is no competing alternative (a foundation), say so in "Considered Options"
and keep the section; never invent an alternative.
-->

## Status

**[proposed | accepted | rejected | deprecated | superseded by ADR-NNNN]** — [YYYY-MM-DD]

## Context and Problem Statement

[The forces and constraints that make a decision necessary, in 2-4 sentences. What problem are we
solving, and what happens if we do nothing?]

## Decision Drivers

- [Driver 1, e.g., read performance on our workload]
- [Driver 2, e.g., the team's existing skills]
- [Driver 3, e.g., licence cost or maintenance burden]

## Considered Options

### Option 1: [Name]

**Pros:**

- [...]

**Cons:**

- [...]

### Option 2: [Name]

**Pros:**

- [...]

**Cons:**

- [...]

> For a foundation with no competing option, keep a single "Option 1: [status quo or the rule]" and
> state explicitly that no comparable alternative existed.

## Decision

**We choose [Option X]** because:

1. [...]
2. [...]

## Consequences

### Positive

- [...]

### Negative

- [...]

### Neutral

- [...]

## Links

- Supersedes: [ADR-NNNN (title)]
- Superseded by: [ADR-NNNN (title)]
- Specification: [FEAT_ID — ../specs/xxx.md]
- Reference: [benchmarks, RFC, pull request]
