# Specifications: Smart-Plan (Phase 1 - Roadmap & Scheduling) (ID: PLAN)

> **State**: _Partially implemented_ (`.agents/skills/smart-plan/`) — **revision proposed**.
> **Implemented:** BR-PLAN-01 to BR-PLAN-13, EC-PLAN-01 to EC-PLAN-06, AC-PLAN-01 to AC-PLAN-06.
> **Not developed:** BR-PLAN-14 to BR-PLAN-17, EC-PLAN-07 to EC-PLAN-09, AC-PLAN-07 to AC-PLAN-11.

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
  - **Revision traceability (delta hand-off)**: every Epic records the exact specification revision
    it was built from, so a later run can compute **what changed since the last planning** and plan
    only the delta, instead of re-reading the whole specification and re-inferring what is new.
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

      Discover --> Rev{"Revision baseline<br/>of the Epic?"}

      Rev -->|no or stale| Process["🏗️ Build / Merge Roadmap Strategy<br/>(delta from Base-Commit, else fallback)"]
      Rev -->|"hash up to date"| UTD["✅ Epic up to date<br/>(no delta)"]

      Process -->|Step 1| Vision["🎯 Extract Global Vision<br/>(2-Sentence Summary)"]
      Vision -->|Step 2| Epics["📊 Map Epics"]
      Epics -->|Step 3| Issues["🎫 Sequence High-Level Issues<br/>(With Short IDs & Deps)"]

      Issues -->|Clean slate| Output["✅ Write To Workspace<br/>(+ refreshed Revision)"]
      Issues -->|Existing roadmap| Confirm["🧾 Diff Table + User Confirmation"]
      Confirm -->|yes| Output
      UTD --> Output
  ```

  _Note: the `Revision` baseline (BR-PLAN-14) is refreshed in the roadmap Spec Anchors when the
  delta is merged; a `Conversation Context` anchor has no revision and always follows the merge
  path._

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
      Discovery --> RevisionCheck : existing roadmap read
      RevisionCheck --> Written : recorded Revision equals the current hash, no delta
      RevisionCheck --> Reconciliation : no baseline, or a different content hash
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
  <!-- ⚠️ DEPENDENCY ALERT: outgoing ./triage-engine.md#roadmap-discovery--parsing -->
  <!-- The revision baseline (`Revision`, `Base-Commit`) written into the Spec Anchors is part of the
  roadmap/triage format contract (BR-TRGE-04). Any change of these anchor fields requires the roadmap
  parser of the triage engine to tolerate them (BR-TRGE-19); the mirror marker is declared on the
  "Roadmap discovery & parsing" section of triage-engine.md. -->
  - **BR-PLAN-14 (Revision baseline in the Spec Anchor):** each Epic's `📋 Spec Anchors` records the
    revision of its pointed specification **at the time the roadmap was last built from it**, as two
    optional lines:

    ```markdown
    - **📋 Spec Anchors:**
      - **Source Type:** File
      - **Pointer:** `docs/specs/smart-spec.md`
      - **Revision:** sha256:9f2c4a1b… # content hash of the pointed file
      - **Base-Commit:** 4a1b7c9 # last base-branch commit touching the file
    ```

    - **`Revision`** is a **content hash**: `sha256` of the pointed file, lower-case hexadecimal,
      prefixed `sha256:`, with line endings normalised to LF. It is independent of the git topology
      (squash, rebase, cherry-pick, merge), so it stays valid across the merge strategies of the
      base branch.
    - **`Base-Commit`** is the **last commit of the base branch that touched the pointed file**, a
      convenience pointer used only to recover the previous blob (to display a diff). The **base
      branch** is the branch the roadmap is planned against — by default the repository's default
      branch, overridable through the `roadmap.base_branch` configuration key. The line is written
      **only when the pointed file is unmodified in the current branch and in the working tree**
      (clean state); otherwise it is omitted.
    - Both lines are written **by `smart-plan` (the consumer)**, never by the specification author:
      a baseline written inside the pointed file itself would be self-referential and stale as soon
      as it is committed.
    - This concerns **`Source Type: File`** anchors only; a `Conversation Context` anchor carries no
      `Revision`.
    - The design of this baseline — a content hash rather than a commit SHA, with a non-blocking
      fallback — is recorded in [ADR-0007](../adr/0007-record-spec-revision-baseline-in-roadmap.md).

  - **BR-PLAN-15 (Delta detection on re-planning):** before merging, the skill computes
    `H_now = hash(pointer)` and compares it to the recorded `Revision`:
    1. no `Revision` recorded (legacy roadmap): the baseline is established and the normal
       BR-PLAN-07 merge runs;
    2. `H_now == Revision`: the delta is **empty**, traced explicitly as `up to date` for that Epic;
       no issue is added or modified by this run;
    3. `H_now != Revision` (or the file is new): the delta since the last planning is determined —
       from the `Base-Commit` blob when it is reachable, otherwise by treating the **current content
       as the novelty** (fallback). After a successful merge, the `Revision` and `Base-Commit` of
       the affected Epics are refreshed. The delta is a **best-effort hint** — a textual comparison
       of the pointed file's previous and current content, used to prioritise which requirements are
       re-mapped; it never replaces the mapping, which still follows BR-PLAN-07.
  - **BR-PLAN-16 (Delta source and fallback):** the delta is best-effort and never blocking.
    - `Base-Commit` reachable: the previous content is recovered
      (`git show <Base-Commit>:<pointer>`) and the delta is the comparison against the current
      content.
    - `Base-Commit` absent, unreachable (history rewritten or garbage-collected) or the file is
      dirty: no diff is displayed, a non-blocking notice is emitted, and the current content is
      treated as the novelty.
  - **BR-PLAN-17 (Baseline scope):** only the **`planned`** baseline is written by this phase. The
    `triaged` (Phase 2) and `implemented` (Phase 3) baselines are explicitly out of scope here and
    reserved for later increments.
- **User Stories:**
  - _As a_ developer, _I want to_ turn a validated specification into a roadmap of high-level issues
    _so that_ the triage can create the detailed tickets automatically.
  - _As a_ developer with a small feature discussed in chat, _I want to_ append an issue to the
    roadmap without writing a specification file _so that_ tracking stays cheap.
  - _As a_ project lead, _I want_ existing issue IDs and checkboxes preserved on re-planning _so
    that_ ticket links and progress are never lost.
  - _As a_ project lead, _I want to_ review a diff before an existing roadmap is modified _so that_
    no unwanted change is applied.
  - _As a_ FinOps owner, _I want_ a lightweight roadmap _so that_ downstream triage runs stay cheap.
  - _As a_ project lead, _I want_ each Epic to record the specification revision it was built from
    _so that_ a later run plans only the delta instead of guessing what changed.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-plan/`. It reads and writes the roadmap and specification
  files through file tools, and relies on a **baseline helper** provided by the host (`smart-ai`)
  for the two non-file operations of the revision baseline: computing the `sha256` content hash of a
  file and resolving `git show <Base-Commit>:<pointer>` (BR-PLAN-14, BR-PLAN-16). Its output is
  consumed by the `smart-ai triage` command, which reads **exactly the format written by
  `smart-plan`**: any change to that format must be reflected in the
  [triage engine](./triage-engine.md#roadmap-discovery--parsing).

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
      opt Baseline check
          Skill->>Spec: hash(pointer) compared to the recorded Revision
          Skill->>FS: refresh Revision / Base-Commit on merge
      end
      alt Clean slate
          Skill->>FS: Write directly
      else Existing roadmap
          Skill-->>User: Comparison table (delta) + confirmation phrase
          User->>Skill: yes
          Skill->>FS: Write the merged roadmap
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** skill invoked with `/smart-plan` from the IDE chat; inputs are a
    specification file path or the conversation context.
  - **Payload Constraints:**
    - Configuration keys: `roadmap.versioned` (boolean, `true` generates `roadmap/vX.Y/...`),
      `roadmap.layout` (`single`, `multi` or `auto`) and `roadmap.base_branch` (optional, the branch
      the revision baseline is computed against; default = the repository's default branch).
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
      - **Revision:** [sha256:<hex> — omitted for a Conversation Context anchor]
      - **Base-Commit:** [last base-branch commit touching the pointer — omitted if the file is
        modified locally]

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
      - **Revision:** [sha256:<hex>]
      - **Base-Commit:** [last base-branch commit touching the pointer]

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
  - **EC-PLAN-07 (Legacy roadmap without `Revision`):** the baseline is established during the merge
    and the `Revision`/`Base-Commit` lines are added; the existing issues are left untouched
    (BR-PLAN-15, step 1).
  - **EC-PLAN-08 (`Base-Commit` absent or unreachable):** the previous blob cannot be recovered
    (history rewritten, garbage-collected, or the pointed file is modified in the working tree); the
    diff is skipped, a non-blocking notice is emitted and the current content is treated as the
    novelty (BR-PLAN-16).
  - **EC-PLAN-09 (Pointed specification file missing at re-planning):** the Epic keeps its anchor
    but the revision check is skipped and reported; the skill never invents a hash and asks the user
    whether the Epic should be deleted (BR-PLAN-05, BR-PLAN-15).

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
- [ ] **AC-PLAN-07 — Baseline Scenario:** Given a File-anchor Epic written or merged, when the
      roadmap is committed, then its `📋 Spec Anchors` record `Revision: sha256:<hex>` of the
      pointed file and a `Base-Commit` line only when that file is unmodified in the branch and
      working tree (BR-PLAN-14).
- [ ] **AC-PLAN-08 — Up-to-date Scenario:** Given an Epic whose recorded `Revision` equals the
      current `hash(pointer)`, when `/smart-plan` is run, then the run traces `up to date` for that
      Epic and no issue of that Epic is added, modified or deleted (BR-PLAN-15).
- [ ] **AC-PLAN-09 — Delta Fallback Scenario:** Given an Epic whose `Base-Commit` is absent,
      unreachable or whose pointed file is dirty, when the delta is computed, then no diff is
      displayed, a non-blocking notice is emitted and the current content is treated as the novelty
      (BR-PLAN-16).
- [ ] **AC-PLAN-10 — Legacy Baseline Scenario:** Given a roadmap without any `Revision`, when it is
      re-planned, then the baseline is established and the existing issues are left untouched
      (EC-PLAN-07, BR-PLAN-15 step 1).
- [ ] **AC-PLAN-11 — Baseline Scope Scenario:** Given any roadmap write, when the anchors are
      refreshed, then only the `planned` baseline is written; no `triaged` or `implemented` baseline
      appears (BR-PLAN-17).
