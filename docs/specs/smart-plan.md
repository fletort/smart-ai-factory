# Specifications: Smart-Plan (Phase 1 - Roadmap & Scheduling) (ID: PLAN)

> **State**: _Partially implemented_ (`smart-plan` skill in `.agents/skills/smart-plan/`) —
> **revision proposed**. **Implemented:** BR-PLAN-01 to BR-PLAN-13, EC-PLAN-01 to EC-PLAN-06,
> AC-PLAN-01 to AC-PLAN-06. **Not developed:** BR-PLAN-14 to BR-PLAN-25, EC-PLAN-07 to EC-PLAN-14,
> AC-PLAN-07 to AC-PLAN-16 (delta-aware ingestion: versioned snapshots, per-Epic version pin, delta
> classification, idempotence, reviewed form-only amendment, Epic-state routing and negative-delta
> handling); the runtime prompt is updated by a downstream implementation task.

## 1. Context & Objectives

- **Global Vision:** `smart-plan` (`/smart-plan`, Phase 1) is the bridge between raw or
  comprehensive specifications [from Phase 0](./smart-spec.md) and the autonomous backlog
  [triage](./triage-engine.md) (Phase 2). It transforms scope definitions into high-level,
  parallel-ready roadmap files. The skill acts as an Executive Project Director and Enterprise
  Architect: it initialises, updates or appends macro-level execution plans based on a validated
  project scope definition.
- **Business Goals:**
  - Produce a macro, parallel-ready roadmap flow at zero cost: the phase has a high-context input
    but a small, macro-level output, so a "Flash" model with a massive context window (default agent
    `Gemini Flash Architect`, Free Tier on Google AI Studio) processes entire specifications for
    free. The phase is fully automated (no mandatory HITL gate for a clean slate; an existing
    roadmap is only written after the user confirms).
  - Keep the output files tight and clean (**FinOps preservation**) so the Phase 2 triage can
    execute multiple runs without context crowding.
  - Keep roadmap identifiers stable over time so that downstream links (`(#N)` ticket references)
    survive a re-planning.
- **Non-Goals (Out of Scope):**
  - Detailed technical descriptions, implementation or coding steps, acceptance / QA criteria and
    code scripts. The output focuses on _what_ issues need to be created, not _how_ to code them;
    detailing belongs to the Triage phase.
  - Ticket creation on GitHub and size estimation (Phase 2).
  - Modifying the user-managed checkboxes of the roadmap.

## 2. Functional & UX Specifications (What)

- **User / Process Flow:**

  ```mermaid
  graph TD
      Input["👤 /smart-plan Trigger<br/>(Spec File or Chat Context)"] --> Config["⚙️ Read .smart.ai/conf.yml<br/>(missing = halt)"]
      Config --> Source["🔍 Detect Context Source"]

      Source -->|File Mode| ReadFile["📄 Read Given Target Spec"]
      Source -->|Context Mode| ReadChat["💬 Parse Prior Chat History"]

      ReadFile --> Strategy{"Detect Versioning and Config Layout"}
      ReadChat --> Strategy

      Strategy -->|not versioned and single| Single["📝 Generate Single File<br/>roadmap.md"]
      Strategy -->|versioned and single| SingleVer["📝 Generate Single Versioned File<br/>roadmap/vX.Y/roadmap.md"]
      Strategy -->|not versioned and multi| Multi["🗂️ Generate Multi Files Directory<br/>roadmap/..."]
      Strategy -->|versioned and multi| MultiVer["🗂️ Generate Multi Versioned Files <br/>roadmap/vX.Y/..."]

      Single --> Discover["🔎 Discover & Read Existing Roadmap<br/>(layout divergence = ask user)"]
      SingleVer --> Discover
      Multi --> Discover
      MultiVer --> Discover

      Discover --> Process["🏗️ Build / Merge Roadmap Strategy"]

      Process -->|Step 1| Vision["🎯 Extract Global Vision<br/>(2-Sentence Summary)"]
      Vision -->|Step 2| Epics["📊 Map Epics"]
      Epics -->|Step 3| Issues["🎫 Sequence High-Level Issues<br/>(With Short IDs & Deps)"]

      Issues -->|Clean slate| Output["✅ Write To Workspace"]
      Issues -->|Existing roadmap| Confirm["🧾 Diff Table + User Confirmation"]
      Confirm -->|yes| Output
  ```

- **State Machine (session / ticket / workflow):**

  ```mermaid
  stateDiagram-v2
      [*] --> ConfigCheck
      ConfigCheck --> Halted : .smart.ai/conf.yml missing
      Halted --> [*]
      ConfigCheck --> SourceDetection : config read, versioned/layout announced
      SourceDetection --> VersionSelection : roadmap.versioned = true
      VersionSelection --> Discovery : user confirms or gives the version
      SourceDetection --> Discovery : roadmap.versioned = false
      Discovery --> Divergence : filesystem contradicts config layout
      Divergence --> Discovery : user decides migrate layout or update config
      Discovery --> CleanSlate : no roadmap found
      Discovery --> Reconciliation : existing roadmap read
      CleanSlate --> Written : direct write, no question
      Reconciliation --> AwaitingConfirmation : diff table displayed
      AwaitingConfirmation --> Written : user types yes
      AwaitingConfirmation --> Reconciliation : user specifies adjustments
      Written --> [*]
  ```

- **Business Rules:**
  - **BR-PLAN-01 (Configuration pre-condition):** `.smart.ai/conf.yml` is read first and on its own.
    If it is missing, the skill halts with `❌**[smart-plan] Workspace not configured.**` and reads
    nothing else. Otherwise it announces the detected configuration before continuing:
    `[smart-ai] Roadmap Configuration detected (versioned: <true/false>, layout: <single/multi/auto>)`.
  - **BR-PLAN-02 (Context & sourcing modes):**
    - **File Mode**: triggered when a specification file exists (from `smart-spec`
      [Case 3](./smart-spec.md) or manual user specs). The agent anchors the roadmap to persistent
      file pointers (`Source Type: File`).
    - **Context Mode**: triggered for smaller features or immediate feedback loops (`smart-spec`
      Case 1). The agent appends the high-level issue title to the configured roadmap target using
      the current chat context as the source of truth, skipping the creation of a dedicated
      specification file (`Source Type: Conversation Context`,
      `Pointer: Current Conversation History`).
  - **BR-PLAN-03 (Unique or versioned roadmap):** `roadmap.versioned` tells whether the roadmap is
    unique (`roadmap.md`) or by version (`./roadmap/v0.1/roadmap.md`). In versioned mode the skill
    proposes the last available version and asks the user to confirm it or give a new one, and
    **waits for the answer before reading any version directory content**.
  - **BR-PLAN-04 (Single or multi file layout):** `roadmap.layout` tells the layout to use:
    - `single`: optimised for small-to-medium project scopes. Generates or updates a standalone
      `roadmap.md` at the root or within a versioned subdirectory.
    - `multi` (auto-split): outputs a `README.md` index and individual `epic-X.md` files, to prevent
      output token truncation and maintain readability.
    - `auto` (or not defined): chooses automatically. The multi-file layout is used if the project
      scope exceeds 3 Epics or has more than 50 tasks.
  - **BR-PLAN-05 (Discovery):** only the dedicated roadmap paths are read, never the workspace root:
    `roadmap.md` or `roadmap/README.md` (or the `roadmap/vX.Y/` equivalents). If the configured
    target is missing, the other layout location is checked before assuming a clean slate.
  - **BR-PLAN-06 (Layout divergence):** if the filesystem contradicts the configured layout (e.g.
    `single` but `roadmap/README.md` exists), the skill stops and asks whether to migrate the layout
    or update the configuration.
  - **BR-PLAN-07 (Merge rules):** an Epic whose `Pointer` matches the new source is updated; an
    unknown pointer always creates a new Epic (never added to an unrelated one). Existing
    `[ISSUE-X.Y]` IDs and checkboxes are preserved, new IDs continue after the highest existing one,
    and removed features are flagged `<!-- [DELETED] -->` or removed without shifting other IDs.
  - **BR-PLAN-08 (Granularity):** every distinct functional requirement results in its own
    high-level issue; several functional blocks are never merged into one ticket.
  - **BR-PLAN-09 (Confirmation):** a clean slate is written directly, without question. For an
    existing roadmap, the skill shows a comparison table (modified, added, deleted, metadata) and
    writes only after the user types `yes`.
  - **BR-PLAN-10 (Macro-level scope boundary):** technical implementation, coding steps, acceptance
    criteria and code scripts are strictly avoided.
  - **BR-PLAN-11 (Parallel-ready sequencing):** each entry gets a unique epic-qualified ID
    (`[ISSUE-X.Y]`) and blockers are explicitly tracked with a `Depends on:` tag. By default
    execution is chronological (task N depends on task N-1); tasks that can be parallelised share
    the same parent blocker, which leaves the door open for future multi-agent parallel
    orchestration.
  - **BR-PLAN-12 (Spec anchors):** each Epic records a `Source Type` (File or Conversation Context)
    and a `Pointer` (spec path or `Current Conversation History`); in multi-file layout the root
    index also lists them.
  - **BR-PLAN-13 (User-managed state):** checkboxes (`- [ ]` vs `- [x]`) are never modified. The
    Global Vision and the Epic Purpose are checked and updated if the new specification alters the
    project's macro direction.
  - **BR-PLAN-14 (Snapshot immutability & version increment):** on every successful ingestion, the
    consumed specification is copied verbatim into the snapshot directory as `<FEAT_ID>.vNN.md`,
    where `NN` is a two-digit, zero-padded, monotonically increasing increment **per consumed
    `FEAT_ID`**. A snapshot is never rewritten and a new version is always a new file — the sole
    exception being a reviewed, audited form-only amendment (BR-PLAN-24).

    <!-- ⚠️ DEPENDENCY ALERT: bidirectional ./smart-spec.md#BR-SPEC-25 -->
    <!-- The hash boundary of BR-PLAN-15 is defined by the shape of the delivery-status header
    (BR-SPEC-25): a change of that header's structure invalidates the hash stability, and conversely
    the exclusion rule defined here constrains any change of the header. -->

  - **BR-PLAN-15 (Spec-version hash — delivery-status header excluded):** each snapshot records a
    **short content hash** computed over the specification content **excluding its delivery-status
    header** (see [Smart-Spec](./smart-spec.md) BR-SPEC-25). The header is recomputed at every
    revision and changes at Epic closure, so including it would make the hash unstable. The hash is
    an **integrity stamp**, not the version identity.

    <!-- ⚠️ DEPENDENCY ALERT: outgoing ./triage-engine.md#roadmap-discovery--parsing -->
    <!-- Adding the `Spec Version` field to the Epic Spec Anchors (BR-PLAN-16) changes the roadmap
    format read by the triage parser: its model and recognised patterns must follow. -->

  - **BR-PLAN-16 (Per-Epic version pin):** each Epic records the consumed specification version in
    its Spec Anchors (`Spec Version: vNN`), extending BR-PLAN-12; the short **integrity hash**
    (BR-PLAN-15) lives only in `specs.lock`, never in the roadmap, so the pin survives a form-only
    amendment (BR-PLAN-24). The pin is **immutable**: an Epic never changes the version it was built
    on, even when newer snapshots exist.
  - **BR-PLAN-17 (Delta base — snapshot, never Git):** the delta is computed by diffing the live
    specification against the **last consumed snapshot** (`last_consumed`, resolved from the
    snapshot lock), never against Git history. `squash` / `rebase` merges therefore have no effect
    on the result.
  - **BR-PLAN-18 (Delta classification):** the delta partitions requirements into **additions**
    (identifiers present in the specification, absent from the consumed version), **removals**
    (consumed identifiers now absent) and **modifications** (same identifier, changed body). Because
    a business rule may be edited in place, modifications are detected by **content diff**, not by
    identifier comparison.
  - **BR-PLAN-19 (Idempotence):** when the live specification (excluding the delivery-status header)
    is identical to the `last_consumed` snapshot, the skill exits with a traced no-op and writes
    nothing.
  - **BR-PLAN-20 (Epic-state routing matrix):** for each consumed `FEAT_ID` carrying a delta, the
    skill routes on the state of the existing Epic:

    | Existing Epic state  | Delta                  | Action                                                                                                                        |
    | :------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
    | absent               | any                    | Create a new Epic (pin the new version).                                                                                      |
    | not started (`Todo`) | any                    | Update the Epic and its issues **in place**; add the missing issues.                                                          |
    | in progress          | additive only          | Create an `[ADDON]` Epic for the delta (BR-PLAN-21).                                                                          |
    | in progress          | modification / removal | Set the Epic `[Blocked / To Review]`, raise a conflict alert (BR-PLAN-07) and create a rerouting issue, **before** any write. |
    | done                 | any                    | Create a successor Epic.                                                                                                      |

  - **BR-PLAN-21 (Addon placement — ask, default child):** when an additive delta lands on an
    in-progress Epic, the skill **asks** whether the `[ADDON]` Epic is a **child** of the
    in-progress Epic (default) or a **sibling**, and waits for the answer before writing.
  - **BR-PLAN-22 (Negative delta — decommissioning):** a removal delta always raises an alert; based
    on the case analysis the skill **may propose a decommissioning Epic** for the removed scope
    (user decision). Removed issues follow BR-PLAN-07 (`<!-- [DELETED] -->`, no identifier shift).
  - **BR-PLAN-23 (Snapshot publication atomicity):** the new snapshot, the `last_consumed` update
    and the roadmap write are committed in the **same pass**; if the roadmap write fails, the
    snapshot is **not** advanced. A reviewed amendment (BR-PLAN-24) is atomic the same way.
  - **BR-PLAN-24 (Reviewed form-only amendment):** by **narrow exception to BR-PLAN-14**, when the
    delta is **form-only** (typography, whitespace, or a rewording that changes no requirement), the
    skill does **not** create a new version: it **amends the snapshot in place**, keeping the same
    `vNN` and therefore the same roadmap reference (BR-PLAN-16). The amendment is (1)
    **reviewer-gated** — an LLM proposes `form_only` and, by default, a human confirms; the skill
    never decides alone (BR-PLAN-25); (2) **explicit**, never an automatic side effect; and (3)
    **audited**: an append-only entry `{version, previous_hash, new_hash, verdict, author, date}` is
    appended to `specs.lock` and the stored hash is recomputed. A substantive diff — or a merely
    **uncertain** verdict — takes the normal path (new version, BR-PLAN-18/20).
  - **BR-PLAN-25 (Amendment review policy):** the reviewer behaviour is set by
    `snapshots.form_only_amendment`: `propose` (default — the LLM proposes and a human confirms:
    interactive prompt locally, approval step in cloud, consistent with the triage
    `pending-approval` pattern), `auto` (the LLM verdict is applied without human confirmation), or
    `off` (exception disabled — every delta, even form-only, creates a new version). When no
    reviewer is available or the verdict is uncertain, the fail-safe is **substantive**.
- **User Stories:**
  - _As a_ developer, _I want to_ turn a validated specification into a roadmap of high-level issues
    _so that_ the triage can create the detailed tickets automatically.
  - _As a_ developer with a small feature discussed in chat, _I want to_ append an issue to the
    roadmap without writing a specification file _so that_ tracking stays cheap.
  - _As a_ project lead, _I want_ existing issue IDs and checkboxes preserved on re-planning _so
    that_ ticket links and progress are never lost.
  - _As a_ project lead, _I want to_ review a diff before an existing roadmap is modified _so that_
    no unwanted change is applied.
  - _As a_ maintainer, _I want_ `/smart-plan` to ingest only the delta of a specification edited in
    place _so that_ in-flight Epics and their pinned version are never disturbed.
  - _As a_ maintainer, _I want_ a typo-only edit to refresh the snapshot under review instead of
    forking a new version _so that_ cosmetic churn never disturbs the roadmap or the pinned version.
  - _As a_ FinOps owner, _I want_ a lightweight roadmap _so that_ downstream triage runs stay cheap.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-plan/` and only uses file tools. Its output is consumed
  by the `smart-ai triage` command, which reads **exactly the format written by `smart-plan`**: any
  change to that format must be reflected in the
  [triage engine](./triage-engine.md#roadmap-discovery--parsing).

  Delta-aware ingestion is inserted **between Discovery and Build/Merge**: when the target
  specification already has a prior snapshot, the Build/Merge step operates on the **delta** only
  (BR-PLAN-17/18). The snapshot subsystem (BR-PLAN-14/15/16/24) is local and file-based, with a
  reviewed form-only amendment path (BR-PLAN-24/25); the roadmap format gains one additive Spec
  Anchor field (`Spec Version: vNN`), which the triage parser may treat as unknown metadata until it
  is updated.

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Skill as smart-plan skill
      participant Cfg as .smart.ai/conf.yml
      participant FS as Roadmap files
      participant Spec as Specification file

      User->>Skill: /smart-plan (spec file or chat context)
      Skill->>Cfg: Read (only this file)
      alt Config missing
          Skill-->>User: ❌**[smart-plan] Workspace not configured.**
      end
      Skill-->>User: [smart-ai] Roadmap Configuration detected (versioned, layout)
      opt File Mode
          Skill->>Spec: Read the target specification
      end
      opt Versioned roadmap
          Skill-->>User: Propose the last version or a new one
          User->>Skill: Version
      end
      Skill->>FS: Read the dedicated roadmap paths only
      alt Layout divergence
          Skill-->>User: Migrate the layout or update the configuration?
          User->>Skill: Decision
      end
      alt Clean slate
          Skill->>FS: Write directly
      else Existing roadmap
          Skill-->>User: Comparison table + confirmation phrase
          User->>Skill: yes
          Skill->>FS: Write the merged roadmap
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** skill invoked with `/smart-plan` from the IDE chat; inputs are a
    specification file path or the conversation context.
  - **Payload Constraints:**
    - Configuration keys: `roadmap.versioned` (boolean, `true` generates `roadmap/vX.Y/...`),
      `roadmap.layout` (`single`, `multi` or `auto`) and `snapshots.form_only_amendment` (`propose`
      | `auto` | `off`, default `propose`; BR-PLAN-25).
    - Output locations:

      | versioned | layout   | Files written                                      |
      | :-------- | :------- | :------------------------------------------------- |
      | false     | `single` | `roadmap.md`                                       |
      | false     | `multi`  | `roadmap/README.md`, `roadmap/epic-X.md`           |
      | true      | `single` | `roadmap/vX.Y/roadmap.md`                          |
      | true      | `multi`  | `roadmap/vX.Y/README.md`, `roadmap/vX.Y/epic-X.md` |

    - Issue identifiers: epic-qualified `[ISSUE-X.Y]` (X = epic id, Y starts at 1 in a new Epic).
      New IDs continue strictly after the highest ID of the epic; a new Epic takes IDs strictly
      after the highest epic ID already defined. Identifiers are stable and never renumbered.
    - Snapshot store (BR-PLAN-14/15/16/24): append-only specification snapshots
      `<snapshot_dir>/<FEAT_ID>.vNN.md` — rewritable **only** by a reviewed, audited form-only
      amendment (BR-PLAN-24) — plus a lock `<snapshot_dir>/specs.lock` recording `last_consumed`
      (`{ <FEAT_ID>: { version, hash } }`) and an append-only `amendments` audit trail
      (`{ version, previous_hash, new_hash, verdict, author, date }`). The default `snapshot_dir`
      follows the resolved roadmap location. Each Epic's Spec Anchors carry `Spec Version: vNN`; the
      hash stays in the lock, never in the roadmap.
  - **Database Updates (ERD if needed):** none. The roadmap format is the contract with the triage:

    Single-file layout (`roadmap.md`):

    ```markdown
    # 🗺️ Project Roadmap: [Project Name]

    ## 🎯 Global Vision

    [A concise 2-sentence summary of the project's ultimate goal and high-level architectural path]

    ## 📊 Epics Flow

    ### 🚀 Epic 1: [Epic Name]

    - **🎯 Epic Purpose:** [Brief focus and goal of this specific block]
    - **📋 Spec Anchors:**
      - **Source Type:** [File / Conversation Context]
      - **Pointer:** [e.g., `docs/specs/[file-name].md` OR `Current Conversation History`]
      - **Spec Version:** [vNN — File mode only, BR-PLAN-16]

    #### Target Issues List

    - [ ] **[ISSUE-1.1]** - [High-level title of the issue]
      - **Depends on:** None
    - [ ] **[ISSUE-1.2]** - [High-level title of the issue]
      - **Depends on:** [ISSUE-1.1]
    ```

    Multi-file layout, root index (`README.md`):

    ```markdown
    # 🗺️ Project Roadmap: [Project Name]

    ## 🎯 Global Vision

    [A concise 2-sentence summary of the project's ultimate goal and high-level architectural path]

    ## 📊 Epics Index

    - [ ] **[Epic 1 Name]** - [Brief focus] -> [Link to Epic File](./epic-1.md)
    ```

    Multi-file layout, epic file (`epic-X.md`):

    ```markdown
    # 🚀 Epic [X]: [Epic Name]

    - **🎯 Epic Purpose:** [Brief focus and goal of this specific block]
    - **📋 Spec Anchors:**
      - **Source Type:** [File / Conversation Context]
      - **Pointer:** [e.g., `docs/specs/[file-name].md`]
      - **Spec Version:** [vNN — File mode only, BR-PLAN-16]

    ## Target Issues List

    - [ ] **[ISSUE-X.1]** - [High-level title of the issue]
      - **Depends on:** None
    - [ ] **[ISSUE-X.2]** - [High-level title of the issue]
      - **Depends on:** [ISSUE-X.1]
    ```

- **Edge Cases & Error Handling:**
  - **EC-PLAN-01 (Missing configuration):** halt, message of **BR-PLAN-01**, no other file is read.
  - **EC-PLAN-02 (Missing configured roadmap target):** the other layout location is checked before
    a clean slate is assumed.
  - **EC-PLAN-03 (Layout divergence):** all tool invocations are halted and the user is asked
    whether to perform a layout migration or update the configuration; no further action is taken
    before the explicit answer.
  - **EC-PLAN-04 (Unknown pointer):** a brand-new Epic is created, the pointer is never added to an
    unrelated Epic.
  - **EC-PLAN-05 (Feature removed by a spec update):** the issue is flagged `<!-- [DELETED] -->` or
    removed, without shifting any other ID.
  - **EC-PLAN-06 (Existing roadmap, no confirmation):** nothing is written until the user types
    `yes`; adjustments can be specified instead.
  - **EC-PLAN-07 (First run — no snapshot):** with no prior snapshot for the `FEAT_ID`, the whole
    specification is treated as new; no delta conflict is reported and the first snapshot is `v01`.
  - **EC-PLAN-08 (Snapshot lock missing or corrupt):** `last_consumed` is reconstructed from the
    highest existing snapshot version; if it cannot be determined, the user is asked — the workspace
    is never scanned (BR-PLAN-05).
  - **EC-PLAN-09 (Recursive addon):** when an `[ADDON]` Epic itself receives a new delta, the matrix
    of BR-PLAN-20 applies again; the skill asks before stacking another level (BR-PLAN-21) and never
    silently deepens the nesting.
  - **EC-PLAN-10 (Delivery-status header changed alone):** because the header is excluded from the
    hash (BR-PLAN-15), an Epic-closure update of the header produces **no** delta and the run is a
    traced no-op (BR-PLAN-19).
  - **EC-PLAN-11 (Snapshot tampering — hash mismatch):** when the recorded hash of the
    `last_consumed` snapshot no longer matches its content **and no matching `amendments` entry
    exists in `specs.lock`**, the integrity stamp fails: the divergence is reported and the user is
    asked; no delta is applied on a doubtful base.
  - **EC-PLAN-12 (Diff judged substantive):** when the reviewer classifies the delta as substantive,
    no amendment is allowed: the normal path applies (new `vNN+1`, BR-PLAN-18/20).
  - **EC-PLAN-13 (No reviewer / uncertain verdict):** when no reviewer can classify the delta, or
    the verdict is uncertain, the fail-safe applies: the delta is treated as substantive (new
    version). With `off` in `snapshots.form_only_amendment`, every delta takes this path.
  - **EC-PLAN-14 (Amendment then re-run):** after a reviewed form-only amendment, the snapshot
    content and the recorded hash agree, so the next run is a traced no-op (BR-PLAN-19); the same
    cosmetic diff is never re-detected.

## 4. Acceptance Criteria (QA)

- [ ] **AC-PLAN-01 — Nominal Scenario (clean slate):** Given a configured workspace with no roadmap,
      when `/smart-plan` is run with a specification file, then the roadmap file(s) of the resolved
      layout are written directly, with a Global Vision, Epics anchored to the file pointer and
      issues with IDs and `Depends on:` tags.
- [ ] **AC-PLAN-02 — Nominal Scenario (update):** Given an existing roadmap and a specification
      already mapped to an Epic, when `/smart-plan` is run, then a comparison table and the
      confirmation phrase are shown, nothing is written before `yes`, and existing IDs and
      checkboxes are preserved.
- [ ] **AC-PLAN-03 — Context Mode Scenario:** Given a small feature from the chat, when
      `/smart-plan` is run, then the issue is appended with `Source Type: Conversation Context` and
      `Pointer: Current Conversation History`, and no specification file is created.
- [ ] **AC-PLAN-04 — New Epic Scenario:** Given a pointer unknown to the roadmap, when the plan is
      merged, then a new Epic is created with IDs continuing after the highest existing epic ID.
- [ ] **AC-PLAN-05 — Error Scenario (configuration):** Given no `.smart.ai/conf.yml`, when
      `/smart-plan` is run, then the skill outputs exactly
      `❌**[smart-plan] Workspace not configured.**` and reads nothing else.
- [ ] **AC-PLAN-06 — Error Scenario (divergence):** Given `layout: single` and an existing
      `roadmap/README.md`, when `/smart-plan` is run, then the skill stops and asks whether to
      migrate the layout or update the configuration.
- [ ] **AC-PLAN-07 — Idempotence Scenario:** Given a specification already consumed and unchanged,
      when `/smart-plan` is run, then the run is a traced no-op and no file is written (BR-PLAN-19).
- [ ] **AC-PLAN-08 — In-place modification Scenario:** Given a business rule edited in place (same
      identifier, changed body), when the delta is computed, then it is classified as a modification
      by content diff (BR-PLAN-18).
- [ ] **AC-PLAN-09 — Version-pin Scenario:** Given a written Epic, when its Spec Anchors are
      inspected, then it carries `Spec Version: vNN` referring to an existing snapshot, and no hash
      appears in the roadmap (BR-PLAN-16).
- [ ] **AC-PLAN-10 — Header-exclusion Scenario:** Given a specification whose only change is its
      delivery-status header, when `/smart-plan` is run, then no delta is produced (EC-PLAN-10).
- [ ] **AC-PLAN-11 — Squash-immunity Scenario:** Given a specification merged through squash or
      rebase, when the delta is computed, then it is identical to a non-squashed merge (BR-PLAN-17).
- [ ] **AC-PLAN-12 — In-progress conflict Scenario:** Given a modification of a rule under
      construction in an in-progress Epic, when the delta is applied, then the Epic is set
      `[Blocked / To Review]`, an alert is raised and a rerouting issue is created before any write
      (BR-PLAN-20).
- [ ] **AC-PLAN-13 — Snapshot atomicity Scenario:** Given a roadmap write that fails, when the run
      ends, then the snapshot and `last_consumed` are unchanged (BR-PLAN-23).
- [ ] **AC-PLAN-14 — Addon question Scenario:** Given an additive delta on an in-progress Epic, when
      the `[ADDON]` Epic is planned, then the skill asks child or sibling (default child) and waits
      for the answer (BR-PLAN-21).
- [ ] **AC-PLAN-15 — Form-only amendment Scenario:** Given a typo-only specification edit and a
      reviewer that confirms `form_only`, when `/smart-plan` is run, then the snapshot is amended in
      place (same `vNN`), an audit entry is appended to `specs.lock`, the hash is recomputed, the
      roadmap `Spec Version` is unchanged, and a re-run is a no-op (BR-PLAN-24, EC-PLAN-14).
- [ ] **AC-PLAN-16 — Fail-safe amendment Scenario:** Given a form-only edit and no reviewer (or an
      uncertain verdict), when `/smart-plan` is run, then the delta is treated as substantive and a
      new version `vNN+1` is created (BR-PLAN-25, EC-PLAN-13).
