# ADR-0002: Identify specifications and rules with a FEAT_ID trigramme

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

Specifications, their business rules, edge cases and acceptance criteria must be citable from
tickets, pull requests, tests and reviews. With no identifier scheme, references were made by
section title or order, and any reordering silently broke them. We need identifiers that are stable,
collision-free, readable and machine-checkable, with a registry that makes uniqueness verifiable
before writing.

## Decision Drivers

- **Unambiguous citation** across phases and repositories.
- **Stability**: an identifier, once published, must never change or be reused.
- **Collision-free**: uniqueness must be checked before writing.
- **Low cognitive cost** for humans and agents.

## Considered Options

### Option 1: No identifier scheme (reference by section title or position)

**Pros:**

- Nothing to define or maintain.

**Cons:**

- Titles are reworded and sections reordered, breaking every reference.
- No way to detect a collision.

### Option 2: Opaque unique identifiers (UUID)

**Pros:**

- Guaranteed unique, with no registry.

**Cons:**

- Unreadable and unmemorable: a human cannot tell what `BR-7f3a…` is about.
- No useful signal in a ticket or a commit message.

### Option 3: A `FEAT_ID` uppercase trigramme plus `(BR|EC|AC)-<FEAT_ID>-NN`, registered in `docs/INDEX.md`

**Pros:**

- Readable and self-describing (`AUTH`, `CART`, `SPEC`).
- Uniqueness is checked against an explicit registry before writing.
- Prefixing rules make every identifier traceable to its feature.

**Cons:**

- Requires a registry discipline and an extra approval step (the trigramme is proposed).
- A finite namespace, mitigated by accepting three or more letters.

## Decision

**We choose Option 3** because:

1. Readable identifiers keep tickets, tests and reviews legible without a lookup.
2. The `docs/INDEX.md` registry makes uniqueness verifiable _before_ anything is written.
3. The `BR-` / `EC-` / `AC-` prefixes let any artefact address a single rule or criterion.

## Consequences

### Positive

- Every rule, edge case and criterion is citable without ambiguity.
- Collisions are caught at submission time, not after publication.

### Negative

- Writing a specification now includes proposing and validating a trigramme.
- The `docs/INDEX.md` registry must be maintained and kept consistent.

### Neutral

- An existing specification keeps its identifier forever; new rules continue the numbering.

## Links

- Specification: [SPEC — ../specs/smart-spec.md](../specs/smart-spec.md) (BR-SPEC-14 to BR-SPEC-18)
