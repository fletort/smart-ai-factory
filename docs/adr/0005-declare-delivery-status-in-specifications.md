# ADR-0005: Declare the delivery status of every specification in its header

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

A specification lists rules that are implemented today and rules that are only proposed, in the same
document, with no visual distinction. In this very repository a header claimed an implemented skill
while the body described rules that the skill prompt did not implement. Any reader — human or
downstream agent — could mistake a proposal for a shipped capability, and act on it.

## Decision Drivers

- **Delivery honesty**: the status of a document must be readable at a glance.
- **No tooling at read time**: a cheap agent reads the file, not the git history.
- **Cheap to maintain**, or it will not be maintained.

## Considered Options

### Option 1: No explicit status

**Pros:**

- Nothing to keep up to date.

**Cons:**

- The reader cannot distinguish proposed from shipped; this is the defect we hit.

### Option 2: Derive the status from git or the pull-request state

**Pros:**

- Automatic, never stale, no manual upkeep.

**Cons:**

- Requires tooling and history that a local, low-cost agent reading a file does not have.
- Not visible to a human merely opening the document.

### Option 3: A structured, explicit header in the document

**Pros:**

- Visible to any reader, human or agent, with no tooling and no history.
- Explicitly enumerates which identifiers are implemented and which are not.

**Cons:**

- Manual upkeep: it can go stale if the author forgets to recompute it.

## Decision

**We choose Option 3** because:

1. It is the only option that works for a reader with no git history and no tooling.
2. Enumerating the identifier ranges makes the frontier between shipped and proposed explicit.
3. It is cheap enough to recompute on every revision of the document.

## Consequences

### Positive

- No reader can mistake a proposed rule for a shipped feature.
- The frontier is explicit and reviewable in the diff.

### Negative

- The header must be recomputed on every revision, or it becomes inaccurate.
- Manual status can drift: it is a discipline, not a guarantee.

### Neutral

- It changes only the header of a specification, not its rules.

## Links

- Specification: [SPEC — ../specs/smart-spec.md](../specs/smart-spec.md) (BR-SPEC-25)
- Specification: [ADR — ../specs/adr.md](../specs/adr.md)
