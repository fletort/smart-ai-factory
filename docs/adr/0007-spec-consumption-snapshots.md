# ADR-0007: Track specification consumption with immutable versioned snapshots

## Status

**proposed** — 2026-10-16

## Context and Problem Statement

`/smart-plan` must reprocess **only the delta** of a specification since the last time it consumed
it, so that re-running it after a specification revision does not regenerate or disturb an existing
roadmap. Two facts break the naive approaches: branches are merged with **squash/rebase**, so Git
commit identity is not a reliable consumption marker; and a **business rule may legitimately be
edited in place**, so comparing requirement-identifier sets alone misses modifications. Doing
nothing means the skill either reprocesses everything (noise, token waste, risk to in-flight Epics)
or silently misses in-place edits (drift between the specification and the roadmap).

## Decision Drivers

- Squash/rebase merges make Git hashes and commits unreliable as consumption markers.
- Business rules may be edited in place, so identifier-set diffing is insufficient on its own.
- In-flight Epics must be insulated from later specification revisions (immutability of what was
  built).
- Local, file-based operation: the skill has the repository beside it, no GitHub API is required,
  and the diff must stay cheap (FinOps preservation).
- Integrity: accidental tampering or drift of the stored reference must be detectable.

## Considered Options

### Option 1: Immutable versioned snapshots (chosen)

At each successful ingestion, copy the consumed specification verbatim to
`<snapshot_dir>/<FEAT_ID>.vNN.md` (immutable) and record `last_consumed` in a lock file; the delta
is `diff(live spec, last_consumed snapshot)`. Each snapshot also stores a short **content hash**
computed over the specification **excluding its delivery-status header** (BR-SPEC-25), because that
header is recomputed at every revision and changes at Epic closure.

**Pros:**

- Immune to squash/rebase: the reference is a physical, version-controlled file.
- Detects in-place modifications as well as additions and removals (content diff).
- Fully local and cheap; no GitHub API and no Git object archaeology.
- Human-readable in a pull request and tamper-evident via the hash stamp.

**Cons:**

- Stores a copy of each consumed specification in the repository.
- Requires a lock/`last_consumed` pointer to resolve the current base.

### Option 2: Requirement-identifier tracing only

Diff the identifier sets (`BR/EC/AC-<FEAT_ID>-NN`) between the specification and what the roadmap
already covers.

**Pros:**

- Deterministic, tiny, and no stored copy is needed.

**Cons:**

- Misses **in-place edits** entirely (the whole reason the marker exists). It would only be
  sufficient under a "never edit a rule in place" convention, which was deliberately rejected as too
  loud.

### Option 3: Git blob retrieval

Resolve the previous content with `git cat-file` / `git show <commit>:path`.

**Pros:**

- No extra files; the intended contents already live in Git.

**Cons:**

- Fragile under squash/rebase, shallow or truncated clones; the "previous commit" is not directly
  identifiable from a content hash alone.

### Option 4: Content hash stored in the Epic only

Store the hash in the Epic metadata and compare it on the next run.

**Pros:**

- Very cheap to compare.

**Cons:**

- A hash identifies a version but cannot **recover** its content, so it cannot drive a content diff.
  It is incomplete without a stored snapshot.

## Decision

**We choose Option 1**, backed by Option 2 as a fast path:

1. The snapshot is the **source of truth** for "what was already consumed" (never Git history).
2. Identifier tracing remains the cheap fast path for additions/removals, while the content diff is
   authoritative for modifications (BR-PLAN-18).
3. The short hash is an integrity stamp, not the identity of the version; it excludes the
   delivery-status header so that the header's lifecycle does not create spurious deltas
   (BR-PLAN-15, EC-PLAN-10).

## Consequences

### Positive

- Re-running `/smart-plan` on a revised specification is a precise, idempotent delta application.
- In-flight Epics are protected by an **immutable per-Epic version pin** (BR-PLAN-16).
- The behaviour is invariant to the merge strategy (squash, rebase or merge).

### Negative

- Repository size grows with the number of consumed specification versions.
- A snapshot directory and a lock file (`specs.lock`) must be maintained atomically with the roadmap
  write (BR-PLAN-23).

### Neutral

- The roadmap format gains one additive Spec Anchor field (`Spec Version: vNN #hash`); the triage
  parser can treat it as unknown metadata until it is updated.

## Links

- Supersedes: none
- Superseded by: none
- Specification: [PLAN — ../specs/smart-plan.md](../specs/smart-plan.md)
- Reference:
  [ADR-0002 — Documentation identifier governance](./0002-documentation-identifier-governance.md),
  [ADR-0004 — Impact mapping dependency markers](./0004-impact-mapping-dependency-markers.md),
  [ADR-0005 — Declare delivery status in specifications](./0005-declare-delivery-status-in-specifications.md)
