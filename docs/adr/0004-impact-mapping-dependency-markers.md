# ADR-0004: Map document impacts with explicit, in-place dependency markers

## Status

**proposed** — 2026-10-09

## Context and Problem Statement

Editing one section of a specification can invalidate another section, in the same file or in a
different one. Nothing linked them, so drift was silent: a rule changed here, a contradictory rule
stayed there. The framework needs to warn an agent, _before_ it writes, of the sections that depend
on the one it is about to change — without crawling the workspace, which the token budget forbids.

## Decision Drivers

- **Warn before modifying**, not after.
- **Survive renumbering**: the mapping must not break when a section moves.
- **Bounded cost**: no workspace crawl and no static-analysis engine.
- **Machine-readable** by a cheap, local text pass.

## Considered Options

### Option 1: No impact mapping

**Pros:**

- Nothing to maintain.

**Cons:**

- Silent documentation drift, which is the very problem we are solving.

### Option 2: A central dependency graph file

**Pros:**

- A single, global view of the dependencies.

**Cons:**

- Duplicates the truth and drifts from the documents it describes.
- Tends to grow into a static-analysis engine, which is explicitly out of scope.

### Option 3: Structured front-matter per document

**Pros:**

- Machine-readable and structured.

**Cons:**

- Not addressable per section, which is where the coupling actually lives.
- Heavy for prose documents and unusual for specification Markdown.

### Option 4: Inline HTML-comment markers inside the qualified section, with reciprocity

**Pros:**

- Co-located with the section it qualifies, and invisible when rendered.
- Carries no section number, so it survives renumbering.
- Greppable in a single pass, with no workspace crawl.

**Cons:**

- Needs a small grammar and a reciprocity discipline (`outgoing` ⟷ `incoming`).

## Decision

**We choose Option 4** because:

1. Coupling lives at section level, and only an in-place marker follows it.
2. Dropping the section number makes the contract robust to renumbering.
3. A single grep resolves the mapping, which keeps the token cost bounded.

## Consequences

### Positive

- An agent is warned of the dependent sections before it writes.
- The mapping is local, greppable and renumbering-proof.

### Negative

- Every propagated impact must leave a mirror marker, or the traversal becomes one-sided.
- An unresolvable counterpart must be reported rather than silently created.

### Neutral

- The markers are HTML comments, so they never affect the rendered documents.

## Links

- Specification: [SPEC — ../specs/smart-spec.md](../specs/smart-spec.md) (BR-SPEC-21 to BR-SPEC-24)
- Specification: [WIKI — ../specs/native-llm-wiki.md](../specs/native-llm-wiki.md)
