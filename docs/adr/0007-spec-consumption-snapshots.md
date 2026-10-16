# ADR-0007: Track specification consumption with versioned snapshots

## Status

**proposed** — 2026-10-16

## Context and Problem Statement

`/smart-plan` must reprocess **only the delta** of a specification since the last time it consumed
it, so that re-running it after a specification revision does not regenerate or disturb an existing
roadmap. Two facts break the naive approaches: branches are merged with **squash/rebase**, so Git
commit identity is not a reliable consumption marker; and a **business rule may legitimately be
edited in place**, so comparing requirement-identifier sets alone misses modifications. Doing
nothing means the skill either reprocesses everything (noise, token waste, risk to in-flight Epics)
or silently misses in-place edits (drift between the specification and the roadmap). A third,
subtler fact: specifications are also corrected for **typography and form**, changing no requirement
— treating such a cosmetic edit as a new version would fork the roadmap for nothing.

## Decision Drivers

- Squash/rebase merges make Git hashes and commits unreliable as consumption markers.
- Business rules may be edited in place, so identifier-set diffing is insufficient on its own.
- In-flight Epics must be insulated from later specification revisions (immutability of what was
  built).
- Local, file-based operation: the skill has the repository beside it, no GitHub API is required,
  and the diff must stay cheap (FinOps preservation).
- Integrity: accidental tampering or drift of the stored reference must be detectable.

## Considered Options

### Option 1: Versioned snapshots, append-only (chosen)

At each successful ingestion, copy the consumed specification verbatim to
`<snapshot_dir>/<FEAT_ID>.vNN.md` and record `last_consumed` and the short content hash in a lock
file; the delta is `diff(live spec, last_consumed snapshot)`. The lock stores the hash computed over
the specification **excluding its delivery-status header** (BR-SPEC-25), because that header is
recomputed at every revision and changes at Epic closure. Snapshots are **append-only**: the only
rewrite allowed is a reviewed, audited form-only amendment (BR-PLAN-24).

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

### Option 5: Ignore form-only diffs (waive, without touching the snapshot)

Keep snapshots byte-frozen and simply record that a reviewed cosmetic diff was **waived**; nothing
is written to the snapshot.

**Pros:**

- The snapshot file is never rewritten at all — the strongest immutability.

**Cons:**

- The live specification and the snapshot drift apart cosmetically for ever, so the waiver must be
  **re-detected and persisted region by region on every run**, or else the same diff is reviewed
  again each time. That bookkeeping is heavier than recomputing a hash, and the snapshot stops being
  a faithful copy of what was consumed.

## Decision

**We choose Option 1**, backed by Option 2 as a fast path:

1. The snapshot is the **source of truth** for "what was already consumed" (never Git history). The
   subsystem applies to **File-Mode anchors only**: a Context-Mode entry has no specification file,
   so it carries no snapshot and no version pin.
2. Identifier tracing remains the cheap fast path for additions/removals, while the content diff is
   authoritative for modifications (BR-PLAN-18).
3. The short hash is an **internal** integrity stamp, not the identity of the version; it excludes
   the delivery-status header so that the header's lifecycle does not create spurious deltas
   (BR-PLAN-15, EC-PLAN-10), and it is stored **only in `specs.lock`**, never in the roadmap — the
   roadmap reference is the version `vNN` alone.
4. Snapshot content is **amendable in place only** through a **reviewed, audited form-only
   amendment** (BR-PLAN-24): an LLM proposes `form_only` and, by default, a human confirms (`auto` /
   `off` per `snapshots.form_only_amendment`, BR-PLAN-25). The amendment keeps the same `vNN` and
   the same roadmap reference, and appends an audit entry to `specs.lock`. Immutability is thereby
   narrowed to "**append-only, amendable only under review**", and the hash guarantee becomes
   "tamper-evident since the last recorded amendment".

## Consequences

### Positive

- Re-running `/smart-plan` on a revised specification is a precise, idempotent delta application.
- Started Epics are protected by an **immutable per-Epic version pin** (a not-started `Todo` Epic
  may be re-pinned on an in-place update; BR-PLAN-16).
- The behaviour is invariant to the merge strategy (squash, rebase or merge).

### Negative

- Repository size grows with the number of consumed specification versions.
- A snapshot directory and a lock file (`specs.lock`) must be maintained atomically with the roadmap
  write (BR-PLAN-23).
- Immutability is relaxed: a reviewed form-only amendment rewrites a snapshot in place. Mitigated by
  the reviewer gate, the explicit opt-in and the append-only audit trail (BR-PLAN-24); the previous
  content stays recoverable from Git.

### Neutral

- The roadmap format gains one additive Spec Anchor field (`Spec Version: vNN`); the triage parser
  can treat it as unknown metadata until it is updated, and the hash never leaves `specs.lock`.

## Links

- Supersedes: none
- Superseded by: none
- Specification: [PLAN — ../specs/smart-plan.md](../specs/smart-plan.md)
- Reference:
  [ADR-0002 — Documentation identifier governance](./0002-documentation-identifier-governance.md),
  [ADR-0004 — Impact mapping dependency markers](./0004-impact-mapping-dependency-markers.md),
  [ADR-0005 — Declare delivery status in specifications](./0005-declare-delivery-status-in-specifications.md)
