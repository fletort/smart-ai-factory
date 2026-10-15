# ADR-0007: Record a specification revision baseline in the roadmap

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

`smart-plan` builds a roadmap from a specification and, on every re-planning, re-reads the whole
specification and re-infers what is new. The roadmap carried no trace of _which_ revision of the
pointed specification it was built from, so the delta between two plans was invisible: every run
treated the specification as brand new, and the cost grew with the specification size. The framework
needs a recorded baseline so a later run can plan only the delta.

A baseline is only useful if it changes for the right reason. Two classes of edit change the file
without changing what the plan must do: the **delivery-status header** (BR-SPEC-25), which is
recomputed at every revision and flips a requirement to `Implemented` once it is delivered, and
**purely editorial** changes (typos, rewordings, formatting). A naive whole-file hash turns both
into a false "the specification changed", which — for an already finalized Epic, whose baseline is
frozen — opens a spurious new generation.

## Decision Drivers

- **FinOps**: plan only what changed instead of re-reading and re-inferring the whole specification.
- **Correctness**: know exactly which revision a roadmap was built from.
- **Robustness**: the baseline must survive the base branch's merge strategies (squash, rebase,
  cherry-pick, merge).
- **Non-blocking**: never depend on a reachable git history.
- **Backward compatibility**: a roadmap without a baseline must stay valid.

## Considered Options

### Option 1: No baseline (status quo)

**Pros:**

- Nothing to store or maintain.

**Cons:**

- Every re-planning re-reads and re-infers the whole specification.
- The delta between two plans is invisible; the cost is unbounded and silent.

### Option 2: The commit SHA of the pointed file

**Pros:**

- Maps directly to git; recovering the previous content is trivial.

**Cons:**

- Breaks under squash, rebase, cherry-pick and merge: the recorded SHA may become unreachable or
  misleading.
- Couples the roadmap format to the git topology of the base branch.

### Option 3: A content hash of the pointed file (status header excluded), and optional commit pointer

**Pros:**

- A content hash is **topology-independent**, so it stays valid across every merge strategy.
- **Excluding the delivery-status header** (BR-SPEC-25) keeps the hash aligned with the
  specification's _content_ rather than its derived status: a requirement flipped to `Implemented`
  after delivery no longer makes a finalized Epic look stale.
- A companion `Base-Commit` (the newest base-branch commit at which the pointed file's **content**,
  re-hashed with the exact algorithm that produced the content hash, reproduces it) allows a
  readable diff when it is reachable.
- The candidate is matched by **re-hashing its content**, never by comparing Git object IDs: a
  blob's object ID hashes a `blob <size>\0` header together with the raw content (and may be SHA-1),
  so it can never equal the SHA-256 of the normalised content.
- The commit pointer is written only when such a commit exists and the file is clean, and omitted
  otherwise: the mechanism degrades gracefully and never records an inconsistent baseline.

**Cons:**

- Needs a hashing and a git-history helper (to read a file's content at a commit), so `smart-plan`
  is no longer "file tools only".
- A textual specification diff still requires the skill to map changes to issues (best-effort).
- A purely **editorial** content change (typo, rewording) still changes the hash; telling it apart
  from a substantive one needs a model judgement at delta time (BR-PLAN-21), which is best-effort
  and defaults to _substantive_ when no previous content is recoverable.

## Decision

**We choose Option 3** because:

1. The content hash is the only baseline that remains valid across the base branch's merge
   strategies, which the project uses.
2. The commit pointer is a pure convenience: when it is absent, unreachable or does not reproduce
   the recorded hash, the skill falls back to treating the current content as the novelty, so the
   mechanism is never blocking.
3. The triage parser tolerates the optional fields as metadata only, so the roadmap/triage format
   contract stays backward-compatible and a legacy roadmap remains valid.
4. The delivery-status header is excluded from the hash and a recovered delta is classified
   substantive vs editorial (BR-PLAN-21), so neither the status churn of delivery nor an editorial
   fix opens a spurious new generation.

## Consequences

### Positive

- A re-planning computes an explicit delta instead of re-reading and re-inferring the whole
  specification.
- The baseline survives squash, rebase, cherry-pick and merge.

### Negative

- `smart-plan` can no longer claim to use "file tools only": computing a `sha256` and reading a
  file's content at a commit requires a host helper.
- A textual specification diff does not by itself say which issues changed; the issue mapping
  remains best-effort.
- The baseline must be refreshed on every merge, or it silently drifts.
- Excluding the delivery-status header couples the hash computation to the header format defined by
  BR-SPEC-25: a change to that format must be reflected in the exclusion rule.
- The residual (purely editorial) false positive relies on a best-effort model classification, and
  is only confident enough to ignore a delta when the previous content is recoverable.

### Neutral

- The `Revision` and `Base-Commit` anchor lines are optional; the parser never requires them.
- Only the `planned` baseline is written here; the `triaged` and `implemented` baselines are
  reserved for later phases.

## Links

- Specification: [PLAN — ../specs/smart-plan.md](../specs/smart-plan.md) (BR-PLAN-14 to BR-PLAN-17,
  BR-PLAN-21)
- Specification: [TRGE — ../specs/triage-engine.md](../specs/triage-engine.md) (BR-TRGE-19)
