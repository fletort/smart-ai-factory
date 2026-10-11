# ADR-0006: Trace tests to acceptance criteria by stable identifier

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

Specifications give every acceptance criterion a stable identifier (`AC-<FEAT_ID>-NN`, smart-spec
BR-SPEC-18) precisely so that tickets, pull requests, reviews and tests can cite the same artefact
without ambiguity (the "Unambiguous citation" goal, BR-SPEC-14 to BR-SPEC-18). In practice nothing
links a test to the criterion it verifies: test descriptions are free text and the verification is
manual, because the framework does not yet govern development or testing. If the point is left
unrecorded, the first development/testing specification will be written after tests already exist,
and an unlinked test set will silently drift from the specifications — criteria claimed as
implemented can go unverified, and no automated check can tell a covered criterion from a forgotten
one.

## Decision Drivers

- **Traceability**: go from a criterion to the test that proves it, and back, without archaeology.
- **Prevent silent drift**: an implemented-but-untested criterion, or a test citing a criterion that
  no longer exists, must fail loudly rather than rot quietly.
- **Low friction**: the convention must add almost nothing to the cost of writing a test.
- **Reuse the existing scheme**: the identifier grammar (`AC-<FEAT_ID>-NN`) and the delivery-status
  header (BR-SPEC-25) already exist; the linking must build on them, not invent a parallel system.
- **Machine-checkable**: a free-form comment is not enough; the link must be resolvable by a script
  so a two-way check can run in CI.

## Considered Options

### Option 1: No linking (status quo)

**Pros:**

- Nothing to learn, nothing to maintain.

**Cons:**

- No traceability at all; coverage of the criteria is unknowable.
- Gaps and typos are discovered only by manual review, or never.

### Option 2: A free-form comment in each test

**Pros:**

- Minimal, and works in any language or runner.

**Cons:**

- Not machine-resolvable: a script cannot reliably pair a comment with a criterion.
- Rots silently; nothing fails when the comment is wrong, missing or stale.

### Option 3: Defer entirely to the future development/testing specification

**Pros:**

- Avoids fixing a mechanism before its owning specification exists.

**Cons:**

- The point is forgotten. By the time that specification is written, tests already exist without the
  convention, and retrofitting them is far more expensive than starting with it.

### Option 4: A structured identifier attached to each test, plus a two-way CI check

**Pros:**

- Deterministic and searchable (e.g. an `[AC-…]` prefix on a test's description, or a test marker).
- Enables a two-way check: every implemented criterion is referenced by at least one test, and every
  referenced criterion resolves to a specification.
- Reuses the existing identifier grammar and the delivery-status header (BR-SPEC-25).

**Cons:**

- Requires a convention every test author follows, and a small checker script wired into CI.

## Decision

**We choose Option 4** because:

1. It is the only option that makes traceability something the factory can **enforce**, not merely
   document.
2. It stays cheap: one structured identifier per test and one checker — no dependency graph, no
   duplicated criterion text, no per-assertion tagging.
3. The identifier grammar and the `Implemented` / `Not developed` ranges already exist, so the check
   can be scoped to the criteria actually claimed as implemented (BR-SPEC-25).

This ADR records the **decision and its rationale** now, before any development/testing
specification exists. The concrete syntax (how the identifier is attached for each test runner) and
the checker are to be specified by the future development/testing specification; until then this is
a recorded obligation, not an enforced rule.

## Consequences

### Positive

- Traceability between specifications and tests becomes checkable in both directions.
- The delivery-status header (BR-SPEC-25) gains a second use: the `Implemented` range can be
  required to be covered by tests.
- The point survives the absence of a development/testing specification.

### Negative

- Adds a convention every test author (human or agent) must follow, and a script to maintain.
- The two-way check is only as good as the criterion and status data it reads.

### Neutral

- The exact per-runner syntax and the checker live in the future development/testing specification,
  not here.
- Existing tests are not retrofitted by this ADR.

## Links

- Specification: [SPEC — ../specs/smart-spec.md](../specs/smart-spec.md) (BR-SPEC-18, BR-SPEC-25)
- Reference: [Architecture — Testing Strategy](../architecture.md#6-testing-strategy)
- Reference: [Skill Test Strategy](../dev/skill-test-strategy.md)
