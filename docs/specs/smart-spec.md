# Specifications: Smart-Spec (Phase 0 - Specification Refinement) (ID: SPEC)

> **State**: _Partially implemented_ (`.agents/skills/smart-spec/`) — **revision proposed**.
> **Implemented:** BR-SPEC-01 to BR-SPEC-13, EC-SPEC-01 to EC-SPEC-05, AC-SPEC-01 to AC-SPEC-06.
> **Not developed:** BR-SPEC-14 to BR-SPEC-26, EC-SPEC-06 to EC-SPEC-12, AC-SPEC-07 to AC-SPEC-17
> (`FEAT_ID` governance, delivery status, impact mapping, high-level isolation and the ADR trigger);
> the runtime prompt is updated by a downstream implementation task.

## 1. Context & Objectives

- **Global Vision:** `smart-spec` (`/smart-spec`, Phase 0) guides the user from a raw feature idea
  through specification refinement and scope evaluation, then routes to the appropriate execution
  path. The skill acts as a co-architect System Engineer for the workspace: it refines the idea,
  qualifies its size and guides the user toward the correct design track (Macro System vs. Micro
  Ticket). If required, it writes, expands and/or updates the project specifications. Beyond
  authoring, `smart-spec` is the **keeper of documentation coherence**: every specification carries
  a unique `FEAT_ID` trigram, and every write is checked against the high-level presentations (the
  functional one and the technical constitution) and against the sections that declare a dependency
  on the written sections.
- **Business Goals:**
  - Surface blind spots before any development starts. Phase 0 is the most cognitively demanding
    phase: it requires an "Elite-level" model (`claude-3-5-sonnet`, subscription / commercial cost
    profile) to uncover blind spots, draft airtight specifications and avoid downstream development
    errors. Its Human-in-the-Loop gate is **mandatory**.
  - Produce precise, measurable and testable specifications that match the project templates.
  - Route each idea to the cheapest adequate track: a roadmap placeholder, immediate code injection
    by a local coder agent, or a full specification.
  - **Unambiguous citation**: every rule, edge case and (optionally) acceptance criterion is
    addressable by a unique identifier (`BR-<FEAT_ID>-NN`, `EC-<FEAT_ID>-NN`, `AC-<FEAT_ID>-NN`), so
    that tickets, pull requests, tests and reviews can reference the same artefact without
    ambiguity.
  - **Delivery honesty**: a specification never claims that a capability exists. Its header states
    what is implemented and what is not (BR-SPEC-25), so no reader mistakes a proposal for a shipped
    feature.
  - **Traceable decisions**: an architectural decision that passes the justification test leaves an
    immutable Architecture Decision Record (see [ADR](./adr.md)) instead of being silently embedded
    in a specification or in the technical constitution.
  - **Impact awareness**: an agent about to modify a section is warned of the sections that depend
    on it, in both directions, before the modification is applied.
- **Non-Goals (Out of Scope):**
  - Task breakdowns (splitting specifications into subtasks), ticketing (creating issues, assigning
    tasks) and scheduling (timelines, dependencies, resource allocation). They belong to
    [`/smart-plan`](./smart-plan.md) and to the [triage](./triage-engine.md). The role of
    `smart-spec` ends when the specification is complete and ready for execution planning.
  - Reading or scanning the workspace beyond the configuration, the index and the targeted
    specification files, plus the files present in the write-set and the declared dependency targets
    (see BR-SPEC-10 and BR-SPEC-21).
  - Building a global dependency graph or a static analysis engine. Impact mapping is limited to the
    explicit, author-declared dependency alerts found in the inspected sections.
  - **Synchronising the high-level documents** (the functional presentation and the technical
    constitution). They describe **what exists** and are updated **after development**; `smart-spec`
    only performs their **initial provisioning** when absent (BR-SPEC-19, BR-SPEC-20).
  - **The ADR lifecycle after creation.** `smart-spec` creates a `proposed` ADR; promotion to
    `accepted`, deprecation and superseding happen after development (see [ADR](./adr.md)).
  - **Editing the distribution payload** (`bootstrap/**`): a divergence found there is reported as
    documentation debt, never fixed silently (EC-SPEC-10).

## 2. Functional & UX Specifications (What)

<!-- ⚠️ DEPENDENCY ALERT: bidirectional ../native-llm-wiki.md -->
<!-- this section (the `FEAT_ID` registry and the index-driven routing, BR-SPEC-09,
BR-SPEC-15, BR-SPEC-16) is coupled in both directions with the _Product Wiki_ rules of
[Native LLM Wiki](./native-llm-wiki.md) (BR-WIKI-03 and its §2). Any change of the registry column
or of the index format here invalidates the wiki's feature lookup, and conversely a change
of the Product Wiki topology invalidates the routing rules defined here. -->
<!-- ⚠️ DEPENDENCY ALERT: bidirectional ./adr.md -->
<!-- this section also defines the ADR trigger (BR-SPEC-26), coupled in both directions with the
justification test and the ADR format of [ADR](./adr.md) §2. -->

- **User / Process Flow:**

  ```mermaid
  graph LR
      User["👤 User Input<br/>(Feature Idea)"]

      User -->|Refinement Loop| Refine["🔄 Draft & Refine<br/>(3-Question Rule)"]

      Refine --> Evaluate{Evaluate Scope}

      Evaluate -->|< 4h| Micro["📋 SMALL/MICRO"]
      Evaluate -->|>= 4h| Large["🏗️ LARGE"]

      Micro --> Choice{"Execute?"}
      Choice -->|Case 1| Issue["Add to Roadmap<br/>/smart-plan"]
      Choice -->|Case 2| Code["Code Injection<br/>@xs_coder / @s_coder"]

      Large --> Case3["📄 CASE 3: Write Specs"]
      Choice --> Case3

      Case3 --> FeatID["🏷️ Propose FEAT_ID<br/>(uniqueness check in docs/INDEX.md)"]
      FeatID --> Approve{"FEAT_ID<br/>submitted and<br/>approved?"}
      Approve -->|Renamed| FeatID
      Approve -->|Yes| Banner["Proud banner:<br/>ID + trigram"]

      Banner -->|Detect Mode| Mode{UNIFIED<br/>or<br/>MODULAR?}
      Mode -->|UNIFIED| UWrite["Update Single<br/>Specification File"]
      Mode -->|MODULAR| MWrite["Step 1: Functional<br/>Step 2: Technical"]

      UWrite --> Status["🏷️ Delivery status header<br/>(implemented vs not developed)"]
      MWrite --> Status
      Status --> Impact["🔎 Inspect write-set<br/>(dependency alerts)"]
      Impact --> Propagate["Propagate impacts to<br/>pointed sections"]
      Propagate --> Arch{"Architecture<br/>decision?<br/>(5-question test,<br/>>= 3 'yes')"}
      Arch -->|Yes| Adr["📝 Create a<br/>'proposed' ADR"]
      Arch -->|No| Trace["Trace<br/>'no ADR justified'"]
      Adr --> Done["✅ Specs Complete"]
      Trace --> Done
      Done --> Plan["/smart-plan for<br/>task scheduling"]
  ```

- **State Machine (session / ticket / workflow):** not applicable. The skill is a linear,
  conversational flow with no persisted state: the flow above is the complete behaviour. The only
  blocking gate is the `FEAT_ID` submission (BR-SPEC-15).
- **Business Rules:**
  - **BR-SPEC-01 (Configuration pre-condition):** `.smart.ai/conf.yml` is checked first and on its
    own. If it is missing, the skill halts immediately, reads nothing else and outputs exactly
    `❌**[smart-spec] Workspace not configured.**`.
  - **BR-SPEC-02 (Template mode detection):** when the configuration exists, only its
    `specifications.templates` section is analysed to detect the mode, announced with
    `[smart-ai] Mode /detected mode/ detected (name of template file(s))`. The template files are
    **not** read at this point.
    - **UNIFIED** mode: only a single `unified` template path is provided.
    - **MODULAR** mode: separate `functional` and `technical` template paths are provided.
  - **BR-SPEC-03 (Never assume):** missing details are never assumed. The first draft flags missing
    information with `⚠️ [PENDING]` and ends with the **3-Question Rule** (at most 3 questions that
    surface blind spots), then waits for validation.
  - **BR-SPEC-04 (Scope evaluation):** once the discussion is mature the scope is evaluated, and
    always notified to the user with one of:
    - `[smart-ai] **SMALL/MICRO** specification estimated`
    - `[smart-ai] **LARGE** specification estimated`
    - `[smart-ai] Scope of the current specification is not yet evaluated`
  - **BR-SPEC-05 (SMALL/MICRO, < 4 hours):** the user chooses between:
    - **Case 1**: run `/smart-plan` to append a high-level issue placeholder to the active /
      configured roadmap target, using the chat context. Used when tracking is needed but local
      specification documentation is overkill. No boilerplate specification file is created; the
      pipeline automatically triages it into a GitHub issue downstream.
    - **Case 2**: activate a local coder agent (`@xs_coder` or `@s_coder`) for immediate code
      injection. Used when the feature is straightforward and implementation can start immediately,
      with minimal specification overhead.
    - **Case 3**: same as the LARGE scope.
  - **BR-SPEC-06 (LARGE, >= 4 hours, multiple components or architectural decisions):** **Case 3**
    (Phase/Epic with full specifications). The skill asks the user's permission before writing the
    specifications.
  - **BR-SPEC-07 (Case 3 handoff):** once the specifications are complete, the user is prompted to
    run `/smart-plan` to handle roadmap updates and task scheduling.
  - **BR-SPEC-08 (Specification mode):** in **UNIFIED** mode a single document merges functional and
    technical needs in the same sections (agile and concise). In **MODULAR** mode the functional
    spec (user stories, business rules, workflows) is checked and updated first (Step 1), then the
    technical spec impact (APIs, schemas, constraints) is mapped (Step 2). The progression is
    announced to the user (e.g. `[smart-ai] Step 1: Updating Functional Specs...`).
  - **BR-SPEC-09 (Index-driven routing):** the new-or-update decision relies strictly on the
    workspace index `docs/INDEX.md` (see [Native LLM Wiki](./native-llm-wiki.md)). The skill is
    forbidden from scanning the whole workspace directories; if the index is insufficient, it asks
    the user.
  - **BR-SPEC-10 (Writes):** once the specification is accepted, the specification file(s) and the
    index file are written within the SAME response, without asking permission again (UNIFIED: two
    writes, MODULAR: three writes). The write-set is then extended, still in the same response, by
    the delivery-status header (BR-SPEC-25), the impacted pointed sections (BR-SPEC-21) and, when
    the justification test passes, the ADR (BR-SPEC-26). The high-level documents are never part of
    the write-set (BR-SPEC-20).
  - **BR-SPEC-11 (Template fidelity):** the layout and Markdown headers defined in the loaded
    templates are strictly reproduced.
  - **BR-SPEC-12 (Testable requirements):** requirements stay precise, factual and measurable. Vague
    words (e.g. "fast") are avoided in favour of precise metrics.
  - **BR-SPEC-13 (Conflict alert):** a request that directly contradicts a choice made in a previous
    specification raises a visible technical conflict alert before the change is applied.
  - **BR-SPEC-14 (FEAT_ID format):** every specification is identified by a unique **trigramme** of
    exactly 3 uppercase letters `[A-Z]{3}` (longer trigrammes produced by the templates, e.g. 4
    letters, are accepted as provided), derived from the feature name (e.g. `AUTH`, `CART`). The
    identifier is written in the title of the document (`(ID: <FEAT_ID>)`) and echoed as a **proud
    banner** at the top of the answer, before any rule is drafted.
  - **BR-SPEC-15 (FEAT_ID submission):** the trigramme is **proposed by the agent and submitted to
    the user for approval**; it is never silently self-assigned. Uniqueness is verified first
    against the `FEAT_ID` column of `docs/INDEX.md` (the registry). On collision or rejection, the
    agent proposes an alternative trigramme and re-submits. Writing starts only after approval.
  - **BR-SPEC-16 (FEAT_ID registry semantics):** the `N.A.` value is reserved for documents that
    carry **no** `FEAT_ID` (today: the _System Architecture_ row) and is excluded from the
    uniqueness check; conversely, every row with a real trigramme is a reserved identifier.
  - **BR-SPEC-17 (FEAT_ID stability):** an existing specification keeps its `FEAT_ID` forever. An
    update never creates a new trigramme and never renames the existing one; new rules continue the
    existing numbering sequence.
  - **BR-SPEC-18 (Identifier prefixing):** in a specification, **all** business rules are prefixed
    `BR-<FEAT_ID>-NN`, **all** edge cases `EC-<FEAT_ID>-NN` and **all** acceptance criteria
    `AC-<FEAT_ID>-NN`.
  - **BR-SPEC-19 (High-level document paths are configuration-driven):** the high-level document
    locations are resolved from the configuration, never hard-coded:
    `specifications.paths.main_functional_document` (functional presentation) and
    `specifications.paths.main_technical_document` (technical constitution). The repository values
    (`README.md`, `docs/architecture.md`) are only the usual defaults of a user's workspace. They
    are used solely to **locate** the technical constitution for its initial provisioning
    (BR-SPEC-20); they are never written otherwise.
  - **BR-SPEC-20 (High-level documents are out of scope):** `smart-spec` never synchronises the
    high-level documents. The functional presentation and the technical constitution describe **what
    exists** and are updated **after development** (Phase 3 / maintenance), not at specification
    time: a specification is a **proposal**, a high-level document is a **statement of fact**. The
    single exception is **initial provisioning**: when the technical constitution file is
    **absent**, `smart-spec` may create it from `specifications.templates.main_technical_document`.
    An existing high-level document is never modified, and any drift observed there is reported as
    documentation debt instead of being fixed silently.
  - **BR-SPEC-21 (Impact mapping):** every file about to be modified is inspected for hidden
    dependency markers. When a marker is found, the detected impact is recorded in the functional or
    technical section of the **pointed** specification, in addition to the current specification.
    The inspection is bounded by the write-set (the targeted specification file(s) and the
    high-level documents) and by the declared targets: it is not a workspace crawl, which keeps
    BR-SPEC-09 valid.
  - **BR-SPEC-22 (Dependency marker grammar):** the marker is a hidden HTML comment, placed **inside
    the section it qualifies**:
    `<!-- ⚠️ DEPENDENCY ALERT: <mode> <relative/path/to/document.md> -->`.
    - `<mode>` ∈ `outgoing`, `incoming`, `bidirectional`;
    - the target is a repository-relative Markdown document path, **without** section number: the
      scope is the section that contains the marker, which makes the contract robust to renumbering;
    - **`outgoing`** declares "modifying this section impacts the target"; **`incoming`** declares
      "this section is impacted when the target changes"; **`bidirectional`** declares both.
  - **BR-SPEC-23 (Marker reciprocity):** declaring `outgoing` in document A towards document B is
    equivalent to declaring `incoming` in document B towards document A. An impact propagated under
    BR-SPEC-21 must therefore leave, on the counterpart side, the mirror marker (`outgoing` ⟷
    `incoming`, `bidirectional` ⟷ `bidirectional`), so that a later traversal originating from
    either side resolves the same pair of sections. A pointing marker with no resolvable counterpart
    section is reported to the user rather than created blindly.
  - **BR-SPEC-24 (Marker context):** another hidden HTML comment can be used after the DEPENDENCY
    ABORT one to define the context of the dependency in one or two sentences.
  - **BR-SPEC-25 (Delivery-status header):** every specification carries a structured state header
    at the top of the document that separates what exists from what does not:

    ```text
    > **State**: _Partially implemented_ (`path_to_dev`)
    > **Implemented:** BR-XXX-01 to BR-XXX-13, EC-XXX-01 to EC-XXX-05, AC-XXX-01 to AC-XXX-06
    > **Not developed:** BR-XXX-14 to BR-XXX-26, EC-XXX-06 to EC-XXX-12, AC-XXX-07 to AC-XXX-17
    ```

    - The header is **mandatory** and recomputed at **every** revision of the specification, in the
      same response as the write.
    - `Implemented` and `Not developed` are expressed as **ranges of identifiers** using the
      specification's own prefixes (`BR-`, `EC-`, `AC-`); the `Not developed` line is omitted only
      when the whole specification is implemented.
    - Its purpose is to prevent a reader (human or downstream agent) from mistaking a **proposed**
      rule for a **shipped** capability: a specification that claims behaviour it does not have is a
      defect.

  - **BR-SPEC-26 (Architecture Decision Record trigger):** during Case 3, each architectural or
    structural decision identified in the specification is submitted to the **justification test**
    of the [ADR](./adr.md) specification — the five inverted whys (cost of change, team impact,
    lifetime, alternatives, reinterpretation risk). This covers decisions, design conventions and
    governance **foundations** alike, with or without a competing alternative ([ADR](./adr.md)
    BR-ADR-01, BR-ADR-02). The agent **answers the five questions itself** and states the answers
    explicitly. When **at least 3 of the 5** answers are "yes", an ADR is justified and a
    **`proposed`** ADR is created in the same response (see [ADR](./adr.md) BR-ADR-01 and
    BR-ADR-07). Otherwise the conclusion `no ADR justified` is traced explicitly, together with the
    five answers.
- **User Stories:**
  - _As a_ developer, _I want to_ refine a raw feature idea with a co-architect _so that_ blind
    spots are surfaced before any code or ticket exists.
  - _As a_ developer, _I want to_ get my scope qualified (SMALL/MICRO vs LARGE) _so that_ I only
    write full specifications when the work justifies it.
  - _As a_ developer with a small feature, _I want to_ either track it through the roadmap or have
    it coded immediately _so that_ I avoid specification overhead.
  - _As a_ tech lead, _I want_ specifications to follow the project templates and stay testable _so
    that_ downstream phases (plan, triage, development) can rely on them.
  - _As an_ architect, _I want_ contradictions with previous specifications flagged _so that_ the
    specification set stays coherent.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-spec/` and works only through file tools (read / write).
  It has no business logic outside the prompt and shares `.smart.ai/conf.yml` with the other skills
  and the `smart-ai` CLI (see [CLI core](./cli-core.md#configuration)).

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Skill as smart-spec skill
      participant Cfg as .smart.ai/conf.yml
      participant Idx as docs/INDEX.md
      participant Specs as Templates and specification files

      User->>Skill: /smart-spec (feature idea)
      Skill->>Cfg: Check existence
      alt Config missing
          Skill-->>User: ❌**[smart-spec] Workspace not configured.**
      end
      Skill->>Cfg: Read specifications.templates only
      Skill-->>User: [smart-ai] Mode UNIFIED / MODULAR detected
      loop Refinement
          Skill-->>User: Draft with ⚠️ [PENDING] + 3-Question Rule
          User->>Skill: Answers / validation
      end
      Skill-->>User: Scope notification (SMALL/MICRO or LARGE)
      alt Case 1
          Skill-->>User: Run /smart-plan
      else Case 2
          Skill-->>User: Activate @xs_coder or @s_coder
      else Case 3 (user permission granted)
          Skill->>Specs: Read the templates and the paths from config
          Skill->>Idx: Read the index (update or new feature? FEAT_ID registry)
          opt Existing feature matched
              Skill->>Specs: Read only the matching specification file
          end
          Skill->>User: Propose a unique FEAT_ID (trigger)
          alt Trigramme rejected or colliding
              Skill->>User: Propose an alternative FEAT_ID
          end
          User->>Skill: FEAT_ID approved
          Skill-->>User: Proud banner: document title (ID: FEAT_ID)
          Skill->>Specs: Write specification file(s) and index in the same response
          Note over Skill,Specs: The whole answer prefixes BR-/EC-/AC- with FEAT_ID
          Skill->>Specs: Update the delivery-status header (implemented vs not developed)
          Skill->>Specs: Inspect the write-set for DEPENDENCY ALERT markers
          Skill->>Specs: Propagate impacts (and mirror markers) into the pointed sections
          opt Justification test: >= 3 of 5 answers "yes"
              Skill->>Specs: Create a proposed ADR under the configured ADR directory
          end
          Skill-->>User: Run /smart-plan for roadmap and scheduling
      end
  ```

  The delivery-status header, the impact mapping and the optional ADR are the trailing steps of Case
  3: they run after the specification and index writes, in the same response, and never require an
  additional approval. The high-level documents are deliberately left untouched (BR-SPEC-20).

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** none (skill invoked from the IDE chat with `/smart-spec`; the skill
    disables model-initiated invocation to prevent cascading invocations, since spec refinement
    requires deliberate user transitions).
  - **Payload Constraints:** configuration read from `.smart.ai/conf.yml`:

    | Key                                                | Purpose                                                                               |
    | :------------------------------------------------- | :------------------------------------------------------------------------------------ |
    | `specifications.templates.unified`                 | Single template, enables **UNIFIED** mode                                             |
    | `specifications.templates.functional/technical`    | Separate templates, enable **MODULAR** mode                                           |
    | `specifications.templates.main_technical_document` | Template of the main technical document (constitution), used for initial provisioning |
    | `specifications.paths.main_functional_document`    | Location of the high-level functional presentation (never written, BR-SPEC-19/20)     |
    | `specifications.paths.main_technical_document`     | Location of the technical constitution (initial provisioning only, BR-SPEC-19/20)     |
    | `specifications.paths.adr_directory`               | Destination of the ADRs (BR-SPEC-26, [ADR](./adr.md))                                 |
    | `specifications.paths.*_spec_path`                 | Destination of the specification file(s)                                              |

  - **Identifier scheme:** the `FEAT_ID` registry is the `FEAT_ID` column of `docs/INDEX.md`; the
    reserved value `N.A.` marks a document without identifier (BR-SPEC-16). Identifiers produced by
    the skill follow `(BR|EC|AC)-<FEAT_ID>-[0-9]{2}` with a monotonically increasing two-digit index
    per prefix.
  - **Dependency marker contract:** `<!-- ⚠️ DEPENDENCY ALERT: <mode> <relative/path.md> -->`,
    `mode ∈ {outgoing, incoming, bidirectional}`, placed inside the qualified section; reciprocity
    follows the mirror table `outgoing ⟷ incoming` and `bidirectional ⟷ bidirectional` (BR-SPEC-22,
    BR-SPEC-23).

  - **Database Updates (ERD if needed):** none. Files written: the specification file(s),
    `docs/INDEX.md` and, when the justification test passes, one ADR file. The high-level documents
    are never written (BR-SPEC-20). A new specification is created in the same directory as the
    other listed files; when it is the first specification and no location is given, the usual
    `./docs` directory is used.

- **Edge Cases & Error Handling:**
  - **EC-SPEC-01 (Missing configuration):** halt immediately, no other file is read, exact message
    of BR-SPEC-01.
  - **EC-SPEC-02 (Index insufficient):** the skill never scans the workspace; it asks the user.
  - **EC-SPEC-03 (Existing feature matches):** the exact target file is identified from the index
    table and only that file is read for the update.
  - **EC-SPEC-04 (Contradiction with a previous specification):** visible technical conflict alert
    before applying the change (BR-SPEC-13).
  - **EC-SPEC-05 (Scope not yet evaluated):** the dedicated notification is emitted until the
    discussion is mature enough.
  - **EC-SPEC-06 (FEAT_ID collision or rejection):** the trigramme already exists in the `FEAT_ID`
    column or is rejected by the user; no file is written, an alternative trigramme is proposed and
    the flow returns to the submission gate (BR-SPEC-15). The loop has no attempt limit, but the
    agent must propose a genuinely different trigramme at each iteration.
  - **EC-SPEC-07 (Row without FEAT_ID or undecidable index row):** the `N.A.` value and the _System
    Architecture_ row are skipped by the uniqueness check (BR-SPEC-16). If the index is malformed,
    empty or missing, the agent asks the user instead of scanning the workspace (EC-SPEC-02).
  - **EC-SPEC-08 (Dependency marker without a resolvable counterpart section):** the mirror marker
    cannot be placed with confidence (target file absent, target section not identifiable); the
    non-resolved pair is reported to the user and **no** marker is invented (BR-SPEC-23).
  - **EC-SPEC-09 (Technical constitution absent):** when `main_technical_document` is missing,
    `smart-spec` provisions it from the configured template (BR-SPEC-20); if the template is also
    absent, the provisioning is skipped and the reason is traced explicitly. The specification and
    index writes are never blocked, and an **existing** high-level document is never written.
  - **EC-SPEC-10 (Divergence inside the distribution payload):** when a rule violation is found in
    `bootstrap/**` or in a template (e.g. an edge case identifier without its `FEAT_ID` prefix), it
    is reported as a documentation debt and never fixed silently in the same pass.
  - **EC-SPEC-11 (ADR directory absent):** the decision passes the justification test but the
    configured ADR directory does not exist; the directory (and the numbering) is created before the
    ADR is written and the creation is traced. A missing ADR template degrades to the minimal MADR
    layout of [ADR](./adr.md) BR-ADR-05.
  - **EC-SPEC-12 (Borderline justification test):** the five answers are stated explicitly in the
    response; when fewer than 3 are "yes", no ADR is created and `no ADR justified` is traced; when
    the user explicitly asks for an ADR, it is created even below the threshold (BR-ADR-11).

## 4. Acceptance Criteria (QA)

- [ ] **AC-SPEC-01 — Nominal Scenario (LARGE):** Given a configured workspace and a mature LARGE
      idea, when the user grants permission for Case 3, then the specification file(s) following the
      template headers and the index are written in the same response and the user is prompted to
      run `/smart-plan`.
- [ ] **AC-SPEC-02 — Nominal Scenario (SMALL/MICRO):** Given a mature SMALL/MICRO idea, when the
      scope is evaluated, then the SMALL/MICRO scope notification is emitted and Case 1, Case 2 and
      Case 3 are offered (BR-SPEC-04, BR-SPEC-05).
- [ ] **AC-SPEC-03 — Mode Scenario:** Given a configuration with only a `unified` template, when the
      skill starts, then `[smart-ai] Mode UNIFIED detected (...)` is announced and the template is
      not read yet.
- [ ] **AC-SPEC-04 — Refinement Scenario:** Given a first draft, when it is presented, then missing
      information is flagged `⚠️ [PENDING]`, at most 3 questions are asked and the skill waits for
      validation.
- [ ] **AC-SPEC-05 — Error Scenario:** Given a workspace without `.smart.ai/conf.yml`, when
      `/smart-spec` is run, then the skill outputs exactly
      `❌**[smart-spec] Workspace not configured.**` and calls no tool on any other file.
- [ ] **AC-SPEC-06 — Conflict Scenario:** Given a request contradicting an earlier specification,
      when it is about to be applied, then a visible technical conflict alert is raised first.
- [ ] **AC-SPEC-07 — FEAT_ID submission Scenario:** Given a Case 3 specification whose proposed
      trigramme is absent from the `FEAT_ID` column of `docs/INDEX.md`, when the trigramme is
      submitted, then no file is written before the user approves it and the approved value appears
      in the document title and in the top-of-answer banner (BR-SPEC-14, BR-SPEC-15).
- [ ] **AC-SPEC-08 — FEAT_ID collision Scenario:** Given a proposed trigramme already present in the
      index, when it is submitted, then an alternative trigramme is proposed and no file is written
      (EC-SPEC-06).
- [ ] **AC-SPEC-09 — FEAT_ID stability Scenario:** Given an existing specification (e.g. ID `SPEC`),
      when it is updated, then its trigramme is unchanged, no new index row is created and the new
      rules continue the existing numbering (BR-SPEC-17).
- [ ] **AC-SPEC-10 — Prefix Scenario:** Given a written specification, when its rule and edge-case
      identifiers are inspected, then 100% match `(BR|EC)-<FEAT_ID>-[0-9]{2}`; acceptance criteria
      may or may not carry the `AC-<FEAT_ID>-NN` prefix (BR-SPEC-18).
- [ ] **AC-SPEC-11 — High-level isolation Scenario:** Given a Case 3 write that would previously
      have changed a phase flow or a technical convention, when the specification is written, then
      `README.md` and `docs/architecture.md` are **not** modified (the only allowed write is the
      initial provisioning of an absent technical constitution) and the decision is routed to the
      ADR mechanism instead (BR-SPEC-19, BR-SPEC-20, BR-SPEC-26).
- [ ] **AC-SPEC-12 — Impact propagation Scenario:** Given a file of the write-set containing
      `<!-- ⚠️ DEPENDENCY ALERT: outgoing <target> -->` inside its section 2, when the section is
      modified, then the impact is recorded in the target document and the mirror marker
      (`incoming <source>`) is present in the counterpart section (BR-SPEC-21, BR-SPEC-22,
      BR-SPEC-23).
- [ ] **AC-SPEC-13 — Unresolvable dependency Scenario:** Given a marker whose target document or
      target section cannot be identified, when impacts are propagated, then the unresolved pair is
      reported to the user and no marker is invented (EC-SPEC-08).
- [ ] **AC-SPEC-14 — Bootstrap isolation Scenario:** Given any Case 3 execution, when the response
      is complete, then no file under `bootstrap/**` has been modified and any divergence found
      there is reported as documentation debt (Non-Goals, EC-SPEC-10).
- [ ] **AC-SPEC-15 — Delivery-status Scenario:** Given a specification update that adds rules
      without implementing them, when the specification is written, then its header states the
      implemented and the not-developed identifier ranges in the same response (BR-SPEC-25).
- [ ] **AC-SPEC-16 — ADR Scenario:** Given a Case 3 decision for which at least 3 of the 5
      justification questions are answered "yes", when the specification is written, then a
      `proposed` ADR is created under the configured ADR directory in the same response
      (BR-SPEC-26).
- [ ] **AC-SPEC-17 — No-ADR Scenario:** Given a decision for which fewer than 3 questions are
      answered "yes", when the specification is written, then no ADR is created and the five answers
      plus `no ADR justified` are traced explicitly (BR-SPEC-26, EC-SPEC-12).
