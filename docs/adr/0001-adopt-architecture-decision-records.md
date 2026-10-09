# ADR-0001: Record architecture decisions as ADRs

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

The rationale behind this framework's design choices (documentation governance, identifier schemes,
how specifications relate to the high-level documents) was being written in prose inside
specifications, at the moment the specification was edited. Specifications are **rewritten** as
requirements change, so the _why_ and the _rejected options_ were being erased; the same ambiguity
(a proposed rule read as a shipped feature) came back several times, and there was no durable place
to look for the reasoning.

## Decision Drivers

- **Preserve the rationale** of significant choices, not only the resulting rules.
- **Bound the cost**: record only what justifies it, so the log stays readable and cheap to load.
- **Traceability**: link each decision to the specification it serves.
- **Immutability**: a decision history must be append-only to be trustworthy.

## Considered Options

### Option 1: No ADRs (the rationale lives in specifications and pull requests)

**Pros:**

- Zero additional artifact and zero writing cost.

**Cons:**

- Rationale scattered across files and pull requests, unreachable from the documentation tree.
- Specifications get reworded, silently erasing the original reasoning.
- A recurring ambiguity cannot be resolved by reading a single place.

### Option 2: Inline "why" sections inside each specification

**Pros:**

- No new artifact; the rationale stays next to the rules it explains.

**Cons:**

- Mixes an evolving statement of requirements with an immutable history.
- No global, chronological view of the project's decisions.
- Not filterable: an agent must read whole specifications to find decisions.

### Option 3: Architecture Decision Records (MADR-minimal), stored under `docs/adr/`

**Pros:**

- Dated, immutable, numbered and filterable: a real decision log.
- Records the alternatives and the accepted costs, which is exactly what specifications lose.
- A standard format, understood by humans and agents alike.

**Cons:**

- One more artifact to maintain, with numbering and immutability discipline.

### Option 4: The Nygard-short format (context / decision / consequences only)

**Pros:**

- Smaller to write.

**Cons:**

- Does not force the per-option pros and cons, nor the split consequences needed to expose risks.

## Decision

**We choose Option 3 (Architecture Decision Records, MADR-minimal)** because:

1. It is the only option that makes the _why_ durable and immutable while keeping it out of the
   evolving specifications.
2. The per-option pros and cons and the `Positive` / `Negative` / `Neutral` consequences make risks
   and accepted costs explicit.
3. It is a standard format: it needs no explanation and can be loaded selectively by an agent.

## Consequences

### Positive

- The reasoning behind structural choices is preserved and reviewable.
- Rejected options are recorded, so they are not silently re-proposed.
- A newcomer (human or agent) can read the decisions without reading every specification.

### Negative

- Each qualifying decision carries a small writing and numbering cost.
- Discipline is required: an ADR is never edited in substance, only superseded.

### Neutral

- Specifications and the technical constitution remain the source of **current** truth; ADRs hold
  only the **history**.

## Links

- Specification: [ADR — ../specs/adr.md](../specs/adr.md)
- Reference: MADR, Markdown Architectural Decision Records
