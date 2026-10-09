# Specifications: Architecture Decision Records (ID: ADR)

> **State**: _Not implemented_ — the ADR template (`specifications.templates.adr`) exists; the Phase
> 0 skill does not create them yet. **Implemented:** BR-ADR-05 (the template and the document
> layout). **Not developed:** BR-ADR-01, BR-ADR-02, BR-ADR-03, BR-ADR-04, BR-ADR-06, BR-ADR-07,
> BR-ADR-08, BR-ADR-09, BR-ADR-10, BR-ADR-11 (the automated trigger, numbering and lifecycle), all
> `EC-ADR-*` and `AC-ADR-*`.

## 1. Context & Objectives

- **Global Vision:** An **Architecture Decision Record** (ADR) is a short, immutable and numbered
  note that records a **significant architectural or technical decision**, the context that forced
  it, the options considered and its consequences. Where a specification answers _what_ must be true
  and the technical constitution (`docs/architecture.md`) states _how the system is built today_, an
  ADR preserves **why** a choice was made and **what was rejected**. ADRs are produced as early as
  Phase 0 ([`/smart-spec`](./smart-spec.md)) — before any code exists — so the rationale is captured
  while the context is fresh, then consumed by developers, reviewers and later agents.
- **Business Goals:**
  - **Capture rationale at decision time**, not retroactively: alternatives and trade-offs are
    recorded while they are still known.
  - **Bound the cost**: only decisions that pass a justification test are recorded, so the ADR log
    stays sparse and readable and no tokens are spent documenting trivia.
  - **Resist reinterpretation**: a later reader (human or agent) finds the _why_, not only the
    _what_, and cannot silently reverse a deliberate choice.
  - **Traceability**: each ADR links to the specifications (`FEAT_ID`) and to the sections of the
    technical constitution it affects.
  - **Immutability**: history is never rewritten; a reversal supersedes, it does not edit.
  - **Preserve technical memory**: the rationale, the accepted costs and the risks are recorded
    **even when there is no competing alternative** (a foundation or a convention), so a later team
    does not silently re-litigate or lose the intent.
- **Non-Goals (Out of Scope):**
  - Replacing the specifications or the technical constitution. An ADR records a decision; the
    specification carries the resulting requirements and the constitution describes the system.
  - Documenting every choice: routine, local or trivially reversible decisions get no ADR
    (BR-ADR-01).
  - The post-development lifecycle operations (flipping a `proposed` ADR to `accepted`, deprecating
    or superseding an ADR). Only their rules are stated here; the operations are performed by the
    development / maintenance phases.
  - Updating the technical constitution (`docs/architecture.md`) itself, which happens after
    development (see [Smart-Spec](./smart-spec.md) BR-SPEC-20).

## 2. Functional & UX Specifications (What)

<!-- ⚠️ DEPENDENCY ALERT: bidirectional ./smart-spec.md -->
<!-- this section defines the ADR justification test and the creation contract consumed by
`smart-spec` Case 3 (BR-SPEC-26). Any change of the test or of the ADR format here invalidates the
trigger in [Smart-Spec](./smart-spec.md) §2, and conversely a change of the trigger changes the
contract defined here. The mirror marker is declared in `smart-spec.md` §2. -->

- **User / Process Flow:**

  ```mermaid
  graph TD
      Start["Architectural / structural decision identified"] --> Test{"Justification test<br/>(5 inverted whys)"}

      Test -->|"< 3 'yes'"| NoAdr["Trace: no ADR justified<br/>(state the 5 answers)"]
      Test -->|">= 3 'yes'"| Propose["Propose ADR<br/>(title, next number)"]

      Propose --> Valid{"User validates?"}
      Valid -->|"renamed / edited"| Propose
      Valid -->|yes| Write["Write docs/adr/NNNN-slug.md<br/>status: proposed"]

      Write --> Link["Link: FEAT_ID spec +<br/>constitution sections"]
      Link --> Done["✅ ADR recorded"]
      NoAdr --> Done
      Done -.->|post development| Accept["Status -> accepted<br/>(outside Phase 0)"]
  ```

- **State Machine (session / ticket / workflow):** lifecycle of an ADR document.

  ```mermaid
  stateDiagram-v2
      [*] --> Proposed: created by smart-spec (Phase 0)
      Proposed --> Accepted: implementation merged
      Proposed --> Rejected: decision abandoned
      Accepted --> Deprecated: no longer recommended
      Accepted --> Superseded: replaced by a newer ADR
      Deprecated --> [*]
      Superseded --> [*]
      Rejected --> [*]
  ```

- **Business Rules:**
  - **BR-ADR-01 (Justification test — the five inverted whys):** an ADR is justified when **at least
    3 of these 5 questions** are answered **"yes"**:
    1. **Cost of change** — would this decision be expensive to reverse later?
    2. **Team impact** — will several people be affected?
    3. **Lifetime** — will this decision still be relevant in two years?
    4. **Alternatives** — were several options evaluated?
    5. **Reinterpretation risk** — could someone misunderstand this choice?

    The agent **answers the questions itself** and states the answers explicitly. Fewer than 3 "yes"
    means no ADR is justified. An ADR is also justified for a **foundation or convention** whose
    worth is not a choice but the **rationale** it protects (documenting the _why_, preventing the
    loss of technical memory, making the consequences and risks explicit). In that case
    "Alternatives" may be answered "no": the `Considered Options` section then states that no
    comparable alternative existed, and an alternative is never invented.

  - **BR-ADR-02 (Candidate decisions):** the test applies to **structural** decisions, not local
    ones: module boundaries, data-model or schema shape, provider or library selection, protocol or
    interchange format, security and trust model, file/directory conventions, execution mode (sync
    vs async, stateful vs stateless), **documentation and governance foundations** (identifier
    schemes, source-of-truth rules, dependency-marker grammars) and any choice or convention that
    several specifications rely on.
  - **BR-ADR-03 (Identifier and file):** an ADR is a file `docs/adr/NNNN-slug.md`, where `NNNN` is a
    **4-digit, zero-padded, globally sequential** integer (`0001`, `0002`, …) and `slug` is a short
    kebab-case summary. The next number is the highest existing number plus one. A number is **never
    reused** and an ADR is **never renumbered**.
  - **BR-ADR-04 (Immutability):** once written, the substance of an ADR is never edited. A decision
    that changes is recorded as a **new** ADR, and the previous one is set to
    `superseded by ADR-NNNN` with a link. Only the `Status` line and additive `Links` may be updated
    in place.
  - **BR-ADR-05 (Format — MADR-minimal):** each ADR reproduces the layout of the ADR template
    resolved from `specifications.templates.adr` (default `.smart.ai/templates/adr.md`), which is
    the single source of truth and is never duplicated inline. Its sections, in order, are:
    `# ADR-NNNN: <title>`, `## Status` (one BR-ADR-06 value followed by the date),
    `## Context and Problem Statement`, `## Decision Drivers`, `## Considered Options` (each option
    with its pros and cons, or a single option stating that no comparable alternative existed),
    `## Decision`, `## Consequences` (`Positive` / `Negative` / `Neutral`) and `## Links`
    (`Supersedes` / `Superseded by` / `Specification` / `Reference`).

  - **BR-ADR-06 (Status lifecycle):** the `Status` field takes exactly one of `proposed`,
    `accepted`, `rejected`, `deprecated` or `superseded by ADR-NNNN`. An ADR created at Phase 0 is
    always `proposed`.
  - **BR-ADR-07 (Authoring moment and owner):** ADRs are created as early as Phase 0 by
    [`/smart-spec`](./smart-spec.md) (BR-SPEC-26), in the same response as the specification write.
    The author of an ADR is the consumer of the decision, never a post-hoc editor. Promotion to
    `accepted` happens **after development**, outside Phase 0.
  - **BR-ADR-08 (Traceability links):** an ADR links to the `FEAT_ID` of the specification(s) it
    serves and, when relevant, to the sections of the technical constitution it affects. A
    specification that triggers an ADR references it back (BR-SPEC-26).
  - **BR-ADR-09 (Location is configuration-driven):** the ADR directory is resolved from
    `specifications.paths.adr_directory` (default `docs/adr`) and the template from
    `specifications.templates.adr` (default `.smart.ai/templates/adr.md`); neither is hard-coded.
  - **BR-ADR-10 (No silent ADR, no silent omission):** an ADR is never created without either
    passing the justification test or an explicit user request; conversely, a decision that passes
    the test is never dropped silently — the five answers and the conclusion are always traced.
  - **BR-ADR-11 (User override):** the user may request an ADR for a decision below the threshold (3
    of 5), and may decline one that reached it; the divergence is traced and the `Decision Drivers`
    section records the actual answers.
- **User Stories:**
  - _As an_ architect, _I want_ the reasons behind a structural choice recorded _so that_ a future
    reader does not mistake it for an accident.
  - _As a_ reviewer, _I want_ the rejected alternatives written down _so that_ I do not re-propose
    them.
  - _As an_ agent, _I want_ a short, filtered ADR log _so that_ I can load the relevant decisions
    without reading every specification.
  - _As a_ maintainer, _I want_ ADRs to be immutable _so that_ the decision history is trustworthy.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Spec as smart-spec (Phase 0)
      participant Adr as ADR directory (docs/adr)
      participant Cons as Technical constitution

      Spec->>Spec: Identify architectural decisions
      Spec->>User: State the five justification answers
      alt At least 3 "yes" (or an explicit user request)
          Spec->>User: Propose the ADR title and the next number
          User->>Spec: Validation (or rename)
          Spec->>Adr: Write NNNN-slug.md (status: proposed)
          Spec-->>User: ADR link in the specification
      else
          Spec-->>User: Trace "no ADR justified" + the five answers
      end
      Note over Cons: Constitution untouched at Phase 0 (BR-SPEC-20);
      Note over Cons: updated after development, referencing the ADR
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** none. ADRs are Markdown files written by the Phase 0 skill and read by
    humans and agents.
  - **Payload Constraints:** configuration key `specifications.paths.adr_directory` (default
    `docs/adr`). No schema is persisted; the BR-ADR-05 format is the contract.
  - **Directory layout:**

    ```text
    docs/adr/
    ├── README.md          # optional index: table (NNNN, title, status, date, spec)
    ├── 0001-<slug>.md
    └── 0002-<slug>.md
    ```

  - **Database Updates (ERD if needed):** none.

- **Edge Cases & Error Handling:**
  - **EC-ADR-01 (Borderline test, exactly 3 "yes"):** the ADR is justified; the five answers are
    stated so the user can override (BR-ADR-11).
  - **EC-ADR-02 (ADR directory missing):** it is created before the first ADR is written and the
    creation is traced.
  - **EC-ADR-03 (Numbering collision):** if `NNNN` is already taken, the next free number is used;
    no existing file is ever overwritten.
  - **EC-ADR-04 (Decision reversed later):** a new ADR is created and the old one is set to
    `superseded by ADR-NNNN`; the old content is preserved (BR-ADR-04).
  - **EC-ADR-05 (Constitution link unresolvable):** when the technical constitution does not exist
    yet, the ADR links to the `FEAT_ID` specification only and the missing constitution link is
    traced, never invented.
  - **EC-ADR-06 (Test not applicable):** a purely local, cheaply reversible decision is not a
    candidate; no ADR is created and only a one-line trace is emitted (BR-ADR-02).

## 4. Acceptance Criteria (QA)

- [ ] **AC-ADR-01 — Justified Scenario:** Given a Case 3 decision with at least 3 of the 5 questions
      answered "yes", when the specification is written, then a `docs/adr/NNNN-slug.md` with
      `Status: proposed` is created in the same response and is linked from the specification
      (BR-ADR-01, BR-ADR-05, BR-ADR-07).
- [ ] **AC-ADR-02 — Not-justified Scenario:** Given a decision with fewer than 3 "yes", when the
      decision is evaluated, then no ADR file is created and the five answers plus
      `no ADR justified` are traced (BR-ADR-10).
- [ ] **AC-ADR-03 — Immutability Scenario:** Given an existing ADR whose decision is reversed, when
      the change is recorded, then a new ADR is created and the old one shows
      `superseded by ADR-NNNN` without any substantive edit (BR-ADR-04, EC-ADR-04).
- [ ] **AC-ADR-04 — Numbering Scenario:** Given a populated ADR directory, when a new ADR is
      written, then its number is the highest existing plus one, zero-padded to 4 digits, and no
      existing file is overwritten (BR-ADR-03, EC-ADR-03).
- [ ] **AC-ADR-05 — Format Scenario:** Given a written ADR, when it is inspected, then it contains
      the BR-ADR-05 sections in order (Status, Context and Problem Statement, Decision Drivers,
      Considered Options, Decision, Consequences, Links) and matches the configured template.
- [ ] **AC-ADR-06 — Configuration Scenario:** Given `specifications.paths.adr_directory` set to a
      custom path, when an ADR is created, then it is written under that path and no ADR directory
      is hard-coded (BR-ADR-09).
- [ ] **AC-ADR-07 — Override Scenario:** Given a user explicitly requesting an ADR below the
      threshold, or declining one that reached it, when the decision is recorded, then the
      divergence is traced and `Decision Drivers` records the real answers (BR-ADR-11).
