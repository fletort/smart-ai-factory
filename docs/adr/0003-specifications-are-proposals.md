# ADR-0003: Treat specifications as proposals and high-level documents as statements of fact

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

Phase 0 (`/smart-spec`) originally updated the functional presentation (`README.md`) and the
technical constitution (`docs/architecture.md`) **in the same response** as the specification it had
just written. A specification describes what _should_ be true, often before any code exists; the
high-level documents describe what _is_ true. Writing both in the same move produced documents that
claimed features that did not exist yet — and at least one reader mistook a proposal for a shipped
capability.

## Decision Drivers

- **Delivery honesty**: a reader must never mistake a proposal for shipped behaviour.
- **Separation of concerns**: a proposal and a statement of fact have different lifecycles.
- **Traceability**: the intent behind a change must still be recorded somewhere durable.

## Considered Options

### Option 1: Keep synchronising the high-level documents in the same response

**Pros:**

- The high-level documents never lag behind the specifications.

**Cons:**

- Claims behaviour that does not exist yet.
- Rewrites a "statement of fact" from a "proposal", which is misleading by construction.

### Option 2: Never let Phase 0 touch the high-level documents

**Pros:**

- No over-claiming, ever.

**Cons:**

- A brand-new workspace has no constitution at all until development starts.

### Option 3: Never synchronise, except initial provisioning when the document is absent

**Pros:**

- Honest by default, and still bootstraps an empty workspace.
- Keeps `README.md` and `docs/architecture.md` owned by the development phase.

**Cons:**

- The constitution lags until it is updated after development; this relies on the post-development
  step actually being performed.

## Decision

**We choose Option 3** because:

1. It removes the misleading case (a proposal rendered as a fact) entirely.
2. It still allows an empty repository to obtain its technical constitution.
3. The intent behind a change is not lost: it is carried by the specification and, when significant,
   by an ADR.

## Consequences

### Positive

- High-level documents only ever describe what exists.
- The write-set of Phase 0 is bounded to specifications, the index, ADRs and — **only when the
  technical constitution is absent** — its initial provisioning (BR-SPEC-20).

### Negative

- The technical constitution is updated later, by the development / maintenance phase.
- That update depends on a discipline no longer enforced by Phase 0.

### Neutral

- Ownership of `README.md` and `docs/architecture.md` moves out of Phase 0.

## Links

- Specification: [SPEC — ../specs/smart-spec.md](../specs/smart-spec.md) (BR-SPEC-19, BR-SPEC-20)
- Specification: [ADR — ../specs/adr.md](../specs/adr.md)
