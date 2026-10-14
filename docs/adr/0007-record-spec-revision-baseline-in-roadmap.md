# ADR-0007: Record a specification revision baseline in the roadmap

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

`smart-plan` builds a roadmap from a specification and, on every re-planning, re-reads the whole
specification and re-infers what is new. The roadmap carried no trace of _which_ revision of the
pointed specification it was built from, so the delta between two plans was invisible: every run
treated the specification as brand new, and the cost grew with the specification size. The framework
needs a recorded baseline so a later run can plan only the delta.

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

### Option 3: A content hash of the pointed file, plus an optional convenience commit pointer

**Pros:**

- A content hash is **topology-independent**, so it stays valid across every merge strategy.
- A companion `Base-Commit` (the newest base-branch commit whose pointed-file blob reproduces the
  content hash) allows a readable diff when it is reachable.
- The commit pointer is written only when such a commit exists and the file is clean, and omitted
  otherwise: the mechanism degrades gracefully and never records an inconsistent baseline.

**Cons:**

- Needs a hashing and a git-blob helper, so `smart-plan` is no longer "file tools only".
- A textual specification diff still requires the skill to map changes to issues (best-effort).

## Decision

**We choose Option 3** because:

1. The content hash is the only baseline that remains valid across the base branch's merge
   strategies, which the project uses.
2. The commit pointer is a pure convenience: when it is absent, unreachable or does not reproduce
   the recorded hash, the skill falls back to treating the current content as the novelty, so the
   mechanism is never blocking.
3. The triage parser tolerates the optional fields as metadata only, so the roadmap/triage format
   contract stays backward-compatible and a legacy roadmap remains valid.

## Consequences

### Positive

- A re-planning computes an explicit delta instead of re-reading and re-inferring the whole
  specification.
- The baseline survives squash, rebase, cherry-pick and merge.

### Negative

- `smart-plan` can no longer claim to use "file tools only": computing a `sha256` and reading a git
  blob requires a host helper.
- A textual specification diff does not by itself say which issues changed; the issue mapping
  remains best-effort.
- The baseline must be refreshed on every merge, or it silently drifts.

### Neutral

- The `Revision` and `Base-Commit` anchor lines are optional; the parser never requires them.
- Only the `planned` baseline is written here; the `triaged` and `implemented` baselines are
  reserved for later phases.

## Links

- Specification: [PLAN — ../specs/smart-plan.md](../specs/smart-plan.md) (BR-PLAN-14 to BR-PLAN-17)
- Specification: [TRGE — ../specs/triage-engine.md](../specs/triage-engine.md) (BR-TRGE-19)
