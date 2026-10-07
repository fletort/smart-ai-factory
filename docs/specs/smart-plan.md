# Specifications: Smart-Plan (Phase 1 - Roadmap & Scheduling) (ID: PLAN)

> **State**: _Proposed specification_ (the `smart-plan` skill exists in
> `.agents/skills/smart-plan/`)

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
      Input["👤 /smart-plan Trigger<br/>(Spec File or Chat Context)"] --> Config["⚙️ Read .smart.ai/config.yml<br/>(missing = halt)"]
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
      ConfigCheck --> Halted : .smart.ai/config.yml missing
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
  - **BR-PLAN-01 (Configuration pre-condition):** `.smart.ai/config.yml` is read first and on its
    own. If it is missing, the skill halts with `❌**[smart-plan] Workspace not configured.**` and
    reads nothing else. Otherwise it announces the detected configuration before continuing:
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

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-plan/` and only uses file tools. Its output is consumed
  by the `smart-ai triage` command, which reads **exactly the format written by `smart-plan`**: any
  change to that format must be reflected in the
  [triage engine](./triage-engine.md#roadmap-discovery--parsing).

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Skill as smart-plan skill
      participant Cfg as .smart.ai/config.yml
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
    - Configuration keys: `roadmap.versioned` (boolean, `true` generates `roadmap/vX.Y/...`) and
      `roadmap.layout` (`single`, `multi` or `auto`).
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

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario (clean slate):** Given a configured workspace with no roadmap, when
      `/smart-plan` is run with a specification file, then the roadmap file(s) of the resolved
      layout are written directly, with a Global Vision, Epics anchored to the file pointer and
      issues with IDs and `Depends on:` tags.
- [ ] **Nominal Scenario (update):** Given an existing roadmap and a specification already mapped to
      an Epic, when `/smart-plan` is run, then a comparison table and the confirmation phrase are
      shown, nothing is written before `yes`, and existing IDs and checkboxes are preserved.
- [ ] **Context Mode Scenario:** Given a small feature from the chat, when `/smart-plan` is run,
      then the issue is appended with `Source Type: Conversation Context` and
      `Pointer: Current Conversation History`, and no specification file is created.
- [ ] **New Epic Scenario:** Given a pointer unknown to the roadmap, when the plan is merged, then a
      new Epic is created with IDs continuing after the highest existing epic ID.
- [ ] **Error Scenario (configuration):** Given no `.smart.ai/config.yml`, when `/smart-plan` is
      run, then the skill outputs exactly `❌**[smart-plan] Workspace not configured.**` and reads
      nothing else.
- [ ] **Error Scenario (divergence):** Given `layout: single` and an existing `roadmap/README.md`,
      when `/smart-plan` is run, then the skill stops and asks whether to migrate the layout or
      update the configuration.
