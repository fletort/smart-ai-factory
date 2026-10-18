# Specifications: Smart-Plan (Phase 1 - Roadmap & Scheduling) (ID: PLAN)

> **State**: _Partially implemented_ (`smart-plan` skill in `.agents/skills/smart-plan/`) —
> **revision proposed**. **Implemented:** BR-PLAN-01 to BR-PLAN-13, EC-PLAN-01 to EC-PLAN-06,
> AC-PLAN-01 to AC-PLAN-06. **Not developed:** BR-PLAN-14 to BR-PLAN-28, EC-PLAN-07 to EC-PLAN-15,
> AC-PLAN-07 to AC-PLAN-26 (delta-aware ingestion for File-Mode anchors: versioned snapshots,
> per-Epic version pin, delta classification, idempotence, reviewed form-only amendment, Epic-state
> routing and negative-delta handling); the runtime prompt is updated by a downstream implementation
> task.

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
  - Cross-file crash-safety of the snapshot publication: BR-PLAN-23 guarantees an all-or-nothing
    outcome for **observably failed** writes only, not recovery from a process crash or power loss
    between file replacements (no durable journal is maintained).
  - **Cross-version Epic duplication (Roll-over):** Automatically copying or "bootstrapping"
    unchanged Epics from an older roadmap version (e.g., `v0.1`) into a newly initialized version
    (e.g., `v0.2`) when no specification delta is detected. Each roadmap version is a strictly
    isolated scope; cross-version backlog migration or rolling over incomplete work is a human
    product-management or version-governance decision executed via external scripts, never an
    automatic side effect of the roadmap ingestion skill.

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
      `Pointer: Current Conversation History`). Context Mode is **outside the snapshot/delta
      subsystem** (BR-PLAN-14): no snapshot, no version pin, no `Spec Version` anchor; it keeps the
      pre-existing append/update behaviour.
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
  - **BR-PLAN-14 (Snapshot subsystem scope, immutability & version increment):** the snapshot/delta
    subsystem (BR-PLAN-14 to BR-PLAN-28) applies to **File Mode anchors only**
    (`Source Type: File`); a Context Mode entry has no specification file and carries no
    `Spec Version` (BR-PLAN-02). For a File anchor, on every successful ingestion the consumed
    specification is copied verbatim into the snapshot directory as `<FEAT_ID>.vNN.md`, where `NN`
    is a two-digit, zero-padded, monotonically increasing increment **per consumed `FEAT_ID`**. A
    snapshot is never rewritten and a new version is always a new file — **the sole exception being
    a reviewed, audited form-only amendment (BR-PLAN-24) or the overwriting of an uncommitted orphan
    file after an interrupted run (BR-PLAN-23)**.

    <!-- ⚠️ DEPENDENCY ALERT: bidirectional ./smart-spec.md#BR-SPEC-25 -->
    <!-- The hash boundary of BR-PLAN-15 is defined by the shape of the delivery-status header
    (BR-SPEC-25): a change of that header's structure invalidates the hash stability, and conversely
    the exclusion rule defined here constrains any change of the header. -->

  - **BR-PLAN-15 (Spec-version hash — algorithm & canonicalization):** each consumed version records
    a **short content hash** in `specs.lock`, computed as `sha256(canonical bytes)[:12]`: SHA-256,
    hex-encoded lowercase, truncated to the first **12 characters** (48 bits — an accidental-drift
    stamp, not a security control). The **canonical bytes** are the snapshot decoded as UTF-8 with
    line endings normalised to `\n` (CRLF → LF), with the **delivery-status header block removed**
    (the contiguous blockquote beginning with `> **State**:` and continuing through the BR-SPEC-25
    header fields, plus the single blank line that follows it). **No other normalisation** is
    applied — body whitespace and trailing spaces are hashed verbatim, so a form-only edit still
    registers as a delta (BR-PLAN-24). The hash is an **integrity stamp**, not the version identity.

    <!-- ⚠️ DEPENDENCY ALERT: outgoing ./triage-engine.md#roadmap-discovery--parsing -->
    <!-- Adding the `Spec Version` field to the Epic Spec Anchors (BR-PLAN-16) changes the roadmap
    format read by the triage parser: its model and recognised patterns must follow. -->

  - **BR-PLAN-16 (Per-Epic version pin):** each **File-Mode** Epic records the consumed
    specification version in its Spec Anchors (`Spec Version: vNN`), extending BR-PLAN-12; the short
    **integrity hash** (BR-PLAN-15) lives only in `specs.lock`, never in the roadmap, so the pin
    survives a form-only amendment (BR-PLAN-24). The pin is **immutable once the Epic has started**
    (in progress or done): such an Epic never changes the version it was built on, even when newer
    snapshots exist. A **not-started (`Todo`) Epic** has no built work to protect, so an in-place
    update **advances its pin** to the newly consumed version (BR-PLAN-20). A Context Mode Epic
    carries no `Spec Version`.
  - **BR-PLAN-17 (Delta base — snapshot, never Git):** the delta is computed by diffing the
    **canonical bytes** (BR-PLAN-15: LF-normalised, delivery-status header removed) of the live
    specification against those of the **last consumed snapshot** (`last_consumed`, resolved from
    the snapshot lock) — **both sides canonicalised identically**, so a header-only revision yields
    an empty delta (EC-PLAN-10) — never against Git history. The snapshot is stored verbatim, its
    own header included (BR-PLAN-14); canonicalisation is applied **at comparison time**. `squash` /
    `rebase` merges therefore have no effect on the result.
  - **BR-PLAN-18 (Delta classification):** the delta partitions requirements into **additions**
    (identifiers present in the specification, absent from the consumed version), **removals**
    (consumed identifiers now absent) and **modifications** (same identifier, changed body). Because
    a business rule may be edited in place, modifications are detected by **content diff**, not by
    identifier comparison.
  - **BR-PLAN-19 (Idempotence):** when the **canonical bytes** of the live specification are
    identical to those of the `last_consumed` snapshot (same canonicalisation, BR-PLAN-15/17), the
    skill exits with a traced no-op and writes nothing.
  - **BR-PLAN-20 (Epic-state routing matrix):** for each consumed `FEAT_ID` carrying a delta, the
    skill routes on the state of the existing Epic:

    | Existing Epic state   | Delta                  | Action                                                                                                                                                                                                                                                                                                                                                                |
    | :-------------------- | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | absent                | any                    | Create a new Epic (pin the new version).                                                                                                                                                                                                                                                                                                                              |
    | not started (`Todo`)  | any                    | Update the Epic and its issues **in place**, **advance the pin** to the new version (BR-PLAN-16) and add the missing issues.                                                                                                                                                                                                                                          |
    | in progress           | additive only          | Create an `[ADDON]` Epic for the delta (BR-PLAN-21); if the owner is itself an `[ADDON]`, apply in place (BR-PLAN-26).                                                                                                                                                                                                                                                |
    | in progress           | modification / removal | Set the Epic `[Blocked / To Review]`, raise a conflict alert (BR-PLAN-07) and create an idempotent rerouting issue (creation is skipped if a pending rerouting issue already exists for this `FEAT_ID`). **The delta is NOT consumed**: the snapshot is not advanced and last_consumed remains unchanged, leaving the delta pending until the block is human-cleared. |
    | `Blocked / To Review` | any                    | **Frozen** (BR-PLAN-27): no routing action is applied and the delta is **not** consumed (no snapshot advance); re-raise the conflict alert and ask the user to clear the block first.                                                                                                                                                                                 |

    | `Reviewed` | any | **Unfreeze, Bypass Conflict & Consume**: remove the `Status` line; for a
    non-terminal underlying Epic, apply the update in place; for a terminal Epic, create a new
    successor. Advance the snapshot and `last_consumed` only after the roadmap update succeeds. | |
    `Done` | any | Create a successor Epic. |

  - **BR-PLAN-21 (Addon placement — ask, default child):** when an additive delta lands on an
    in-progress Epic, the skill **asks** whether the `[ADDON]` Epic is a **child** of the
    in-progress Epic (default) or a **sibling**, and waits for the answer before writing.
  - **BR-PLAN-22 (Negative delta — decommissioning):** a removal delta always raises an alert; based
    on the case analysis the skill **may propose a decommissioning Epic** for the removed scope
    (user decision). Removed issues follow BR-PLAN-07 (`<!-- [DELETED] -->`, no identifier shift).
  - **BR-PLAN-23 (Snapshot publication — commit marker & safety):** the new snapshot, the roadmap
    write and the `last_consumed` update are staged and published together. This is **best-effort,
    not a cross-file crash journal**: the `last_consumed` entry is published **last** and acts as
    the **single commit marker**. Any snapshot file found on disk whose version is higher than the
    recorded `last_consumed.version` is an uncommitted orphan (left by an interrupted run). **Narrow
    exception to BR-PLAN-14**: Since an orphan was never officially committed to `specs.lock`, it is
    considered a corrupted workspace artifact. To keep the snapshot store clean, the skill
    **explicitly allows overwriting or reusing this specific orphan file** on the next run,
    resetting its content to match the newly calculated version state.

  - **BR-PLAN-24 (Reviewed form-only amendment):** by **narrow exception to BR-PLAN-14**, when the
    delta is **form-only** (typography, whitespace, or a rewording that changes no requirement), the
    skill does **not** create a new version: it **amends the snapshot in place**, keeping the same
    `vNN` and therefore the same roadmap reference (BR-PLAN-16). The amendment is (1)
    **reviewer-gated** — an LLM proposes `form_only`; by default a human confirms (`propose`) and
    the human step may be **explicitly** waived under `auto` (BR-PLAN-25); the skill never amends
    **without a reviewer verdict**; (2) **explicit**, never an automatic side effect; and (3)
    **audited**: an append-only entry
    `{feat_id, version, previous_hash, new_hash, verdict, author, date}` is appended to `specs.lock`
    and the stored hash is recomputed. A substantive diff — or a merely **uncertain** verdict —
    takes the normal path (new version, BR-PLAN-18/20).
  - **BR-PLAN-25 (Amendment review policy):** the reviewer behaviour is set by
    `snapshots.form_only_amendment`: `propose` (default — the LLM proposes and a human confirms:
    interactive prompt locally, approval step in cloud, consistent with the triage
    `pending-approval` pattern), `auto` (the LLM verdict is applied without human confirmation), or
    `off` (exception disabled — every delta, even form-only, creates a new version). When no
    reviewer is available or the verdict is uncertain, the fail-safe is **substantive**.
  - **BR-PLAN-26 (Pointer ownership — single routing target):** each `FEAT_ID` has **one owner Epic
    within the scope of the active roadmap version being processed**: the **most recently created
    non-terminal (not Done) Epic** carrying that `FEAT_ID` in that specific roadmap layer, excluding
    decommissioning Epics. **Terminal State Isolation**: If all Epics for a `FEAT_ID` in the active
    roadmap are terminal (`Done`), or if no Epic exists yet, **there is no active owner**. In this
    case, any incoming delta bypasses ownership inspection and falls back directly to the absent row
    of the routing matrix (BR-PLAN-20), triggering the creation of a brand-new independent Epic. An
    `[ADDON]` **never receives an addon**: an additive delta landing on an open addon owner is
    applied **in place** (issues appended), so addons never nest.

   <!-- ⚠️ DEPENDENCY ALERT: outgoing ./triage-engine.md#roadmap-discovery--parsing -->
   <!-- The optional `📊 Status` line is a new Epic-level field; the triage parser must tolerate it
   as unknown metadata (it carries no ticket-routing semantics). -->
  - **BR-PLAN-27 (Epic state — derivation & syntax):** the Epic state consumed by BR-PLAN-20 is
    resolved deterministically, in this precedence order:
    1. **Explicit override** — if the Epic carries the line `- **📊 Status:** Blocked / To Review`,
       its state is `Blocked / To Review`. If it carries `- **📊 Status:** Reviewed`, its state is
       `Reviewed`. These are the **only** states not derivable from the issues. While
       `Blocked / To Review` is present, the Epic is **frozen** and skips routing (BR-PLAN-20).
       While `Reviewed` is present, the Epic intercepts normal state derivation to make the row
       strictly eligible for the `Reviewed` unfreeze-and-consume routing logic in the matrix, after
       which the line is removed.

    2. **Derived from the Target Issues List** — over the Epic's own issue checkboxes: no issue
       checked ⇒ `Todo`; every issue checked (Epic with at least one issue) ⇒ `Done`; some but not
       all checked ⇒ `In Progress`; an Epic with no issue ⇒ `Todo`. The skill never rewrites the
       derived states, so the mapping is identical across implementations; a roadmap without the
       `Status` line simply follows step 2 (never `Blocked` until the skill writes it).

  - **BR-PLAN-28 (Snapshot store — location & sharing):** `<snapshot_dir>` defaults to
    `<roadmap_root>/.snapshots/`, where `<roadmap_root>` is the roadmap's directory **without** its
    `vX.Y` segment (e.g. `roadmap/.snapshots/` for `roadmap/v0.1/roadmap.md`, or `./.snapshots/` for
    a root `roadmap.md`). The store — snapshots, `specs.lock` and the `amendments` trail — is
    therefore **shared across every roadmap version** and keyed by `FEAT_ID`, never by the roadmap
    version, so switching `vX.Y` never restarts ingestion. **Path Override Resolution Rule:** The
    store location is overridable through `snapshots.dir`. If a relative path is provided for
    `snapshots.dir`, the CLI MUST resolve it strictly against the **project root directory** (where
    `.smart.ai/conf.yml` resides), ensuring path stability and shared-store consistency regardless
    of the active `vX.Y` segment being processed.

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

  Delta-aware ingestion (**File Mode only**) is inserted **between Discovery and Build/Merge**: when
  the target specification already has a prior snapshot, the Build/Merge step operates on the
  **delta** only (BR-PLAN-17/18). The snapshot subsystem (BR-PLAN-14/15/16/24) is local and
  file-based, with a reviewed form-only amendment path (BR-PLAN-24/25); the roadmap format gains one
  additive Spec Anchor field (`Spec Version: vNN`), which the triage parser may treat as unknown
  metadata until it is updated.

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
      `roadmap.layout` (`single`, `multi` or `auto`), `snapshots.form_only_amendment` (`propose` |
      `auto` | `off`, default `propose`; BR-PLAN-25) and `snapshots.dir` (path; default
      `<roadmap_root>/.snapshots/`, shared across roadmap versions; BR-PLAN-28).
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
      (`{ feat_id, version, previous_hash, new_hash, verdict, author, date }`). The default
      `snapshot_dir` is `<roadmap_root>/.snapshots/`, **shared across every roadmap version**
      (BR-PLAN-28). Each Epic's Spec Anchors carry `Spec Version: vNN`; the hash stays in the lock,
      never in the roadmap.
  - **Database Updates (ERD if needed):** none. The roadmap format is the contract with the triage:

    Single-file layout (`roadmap.md`):

    ```markdown
    # 🗺️ Project Roadmap: [Project Name]

    ## 🎯 Global Vision

    [A concise 2-sentence summary of the project's ultimate goal and high-level architectural path]

    ## 📊 Epics Flow

    ### 🚀 Epic 1: [Epic Name]

    - **🎯 Epic Purpose:** [Brief focus and goal of this specific block]
    - **📊 Status:** [optional — explicit override: `Blocked / To Review` to freeze, or `Reviewed`
      to unfreeze & consume delta; otherwise derived from the issue checkboxes, BR-PLAN-27]
    - **📋 Spec Anchors:**
      - **Source Type:** [File / Conversation Context]
      - **Pointer:** [e.g., `docs/specs/[file-name].md` OR `Current Conversation History`]
      - **Spec Version:** [vNN — File Mode only, omit for Conversation Context, BR-PLAN-16]

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
    - **📊 Status:** [optional — explicit override: `Blocked / To Review` to freeze, or `Reviewed`
      to unfreeze & consume delta; otherwise derived from the issue checkboxes, BR-PLAN-27]
    - **📋 Spec Anchors:**
      - **Source Type:** [File / Conversation Context]
      - **Pointer:** [e.g., `docs/specs/[file-name].md`]
      - **Spec Version:** [vNN — File Mode only, omit for Conversation Context, BR-PLAN-16]

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
  - **EC-PLAN-08 (Snapshot lock missing, corrupt, or incomplete):** The snapshot lock (`specs.lock`)
    acts as the single source of truth for the consumed base.
    - **Missing Lock:** If the lock file is entirely absent, `last_consumed` is reconstructed from
      the highest existing snapshot version for the active `FEAT_ID` found on disk and submitted to
      the user for confirmation; the workspace is never scanned (BR-PLAN-05).
    - **Corrupt or Malformed Lock:** If the lock file exists but contains invalid JSON, unparsable
      data, or an existing entry for the active `FEAT_ID` that lacks a valid `last_consumed` entry,
      **the skill MUST immediately halt with a visible technical alert and write nothing**. A
      missing `FEAT_ID` entry is the first-run case (EC-PLAN-07), not corruption. The CLI is
      forbidden from inferring a base from the workspace or guessing partial data. To recover a
      malformed entry, a human must manually repair the lock file.
  - **EC-PLAN-09 (Addon receives a further delta):** when the owner is an `[ADDON]` and receives
    another additive delta, no second addon is created: the new issues are applied **in place** on
    that addon (BR-PLAN-26). A modification/removal delta still routes normally (BR-PLAN-20).
  - **EC-PLAN-10 (Delivery-status header changed alone):** because the header is excluded from both
    the hash and the diff (BR-PLAN-15/17), an Epic-closure update of the header produces **no**
    delta and the run is a traced no-op (BR-PLAN-19).
  - **EC-PLAN-11 (Snapshot tampering — hash mismatch):** when the computed hash of the
    `last_consumed` snapshot does not match the recorded `last_consumed.hash`, the integrity stamp
    fails regardless of whether an `amendments` entry exists; any amendment's `new_hash` must itself
    match the current stored hash. The divergence is reported and the user is asked; no delta is
    applied on a doubtful base.
  - **EC-PLAN-12 (Diff judged substantive):** when the reviewer classifies the delta as substantive,
    no amendment is allowed: the normal path applies (new `vNN+1`, BR-PLAN-18/20).
  - **EC-PLAN-13 (No reviewer / uncertain verdict):** when no reviewer can classify the delta, or
    the verdict is uncertain, the fail-safe applies: the delta is treated as substantive (new
    version). With `off` in `snapshots.form_only_amendment`, every delta takes this path.
  - **EC-PLAN-14 (Amendment then re-run):** after a reviewed form-only amendment, the snapshot
    content and the recorded hash agree, so the next run is a traced no-op (BR-PLAN-19); the same
    cosmetic diff is never re-detected.
  - **EC-PLAN-15 (Delta while the owner is blocked):** when a `FEAT_ID`'s owner carries
    `Blocked / To Review` (BR-PLAN-27), the incoming delta is **not** applied and its snapshot is
    **not** advanced; the skill reports it and asks the user to clear the block first. The other
    `FEAT_ID`s of the run proceed normally.

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
- [ ] **AC-PLAN-08 — Snapshot lock fault-tolerance Scenario:** Given a `specs.lock` file that is
      missing, the system reconstructs the base from disk and asks for confirmation. Given a
      `specs.lock` file that is corrupt or malformed, the execution immediately halts with an error,
      writes nothing, and refuses to infer data from the workspace until manual recovery is
      performed.
- [ ] **AC-PLAN-09 — Version-pin Scenario:** Given a written Epic, when its Spec Anchors are
      inspected, then it carries `Spec Version: vNN` referring to an existing snapshot, no hash
      appears in the roadmap, and the matching integrity hash is recorded in `specs.lock`
      (BR-PLAN-15, BR-PLAN-16).
- [ ] **AC-PLAN-10 — Header-exclusion Scenario:** Given a specification whose only change is its
      delivery-status header, when `/smart-plan` is run, then no delta is produced — the diff is
      taken over the canonical bytes of both sides (EC-PLAN-10, BR-PLAN-17).
- [ ] **AC-PLAN-11 — Squash-immunity Scenario:** Given a specification merged through squash or
      rebase, when the delta is computed, then it is identical to a non-squashed merge (BR-PLAN-17).
- [ ] **AC-PLAN-12 — In-progress conflict Scenario:** Given a modification of a rule under
      construction in an in-progress Epic, when the delta is applied, then the Epic is set
      `[Blocked / To Review]`, an alert is raised and a rerouting issue is created **ONLY if it does
      not already exist**. Furthermore, **the delta remains pending**: the snapshot version and
      last_consumed lock are **not** advanced, allowing subsequent runs to re-detect the delta until
      the block is manually cleared.
- [ ] **AC-PLAN-13 — Orphan snapshot reuse Scenario:** Given an interrupted run that left a snapshot
      file on disk newer than the recorded `last_consumed.version`, when the next execution runs,
      then this uncommitted orphan file is **explicitly allowed to be overwritten and reused** to
      match the new version state, keeping the snapshot store clean without incrementing to a dead
      version number.
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
- [ ] **AC-PLAN-17 — Context Mode scope Scenario:** Given a Context Mode entry
      (`Source Type: Conversation Context`), when `/smart-plan` is run, then no snapshot and no lock
      entry are written and the Epic carries no `Spec Version` (BR-PLAN-14).
- [ ] **AC-PLAN-18 — Todo re-pin Scenario:** Given a `Todo` Epic updated in place by a newer delta,
      when the update is applied, then the Epic pin advances to the new `vNN` and the newly added
      issues inherit it (BR-PLAN-16, BR-PLAN-20).
- [ ] **AC-PLAN-19 — Amendment write-failure Scenario:** Given a reviewed form-only amendment whose
      write **fails observably**, when the run ends, then the snapshot content, the stored hash and
      the `amendments` audit trail are all rolled back — none is advanced (BR-PLAN-23, BR-PLAN-24).
- [ ] **AC-PLAN-20 — Hash canonicalization Scenario:** Given the same snapshot content on an LF and
      a CRLF checkout, when the content hash is computed, then both yield the identical recorded
      hash (BR-PLAN-15).
- [ ] **AC-PLAN-21 — Pointer ownership Scenario:** Given several open Epics sharing a `FEAT_ID`
      (root + `[ADDON]`), when a new delta is routed, then it targets the newest non-terminal owner,
      and an additive delta on an open addon is applied in place without nesting a new addon
      (BR-PLAN-26).
- [ ] **AC-PLAN-22 — Epic state derivation Scenario:** Given Epics with (a) no issue checked, (b)
      all issues checked, (c) mixed checkboxes and (d) a `📊 Status: Blocked / To Review` line, when
      the state is resolved, then they yield `Todo`, `Done`, `In Progress` and `Blocked / To Review`
      respectively (BR-PLAN-27).
- [ ] **AC-PLAN-23 — Shared snapshot store Scenario:** Given a versioned roadmap switched from
      `v0.1` to `v0.2`, when `/smart-plan` runs on an already-consumed specification, then the
      shared `<roadmap_root>/.snapshots/` lock is reused and the run is a delta, never a fresh `v01`
      ingestion (BR-PLAN-28).
- [ ] **AC-PLAN-24 — Blocked routing Scenario:** Given a delta on a `FEAT_ID` whose owner carries
      `Blocked / To Review`, when `/smart-plan` is run, then no routing action is taken and the
      snapshot is not advanced. Given the status updated to `Reviewed`, when `/smart-plan` runs,
      then the pending delta is successfully **consumed**, the snapshot and `last_consumed` are
      advanced to the current spec hash, and the `Status` line is automatically removed by the
      skill.
- [ ] **AC-PLAN-25 — Orphan snapshot Scenario:** Given an interrupted run that left a snapshot newer
      than the recorded `last_consumed`, when the next run starts, then the orphan is discarded and
      the delta is re-derived from the recorded base, never from the orphan (BR-PLAN-23,
      EC-PLAN-08).
- [ ] **AC-PLAN-26 — Terminal and Cross-version Ownership Scenario:** Given a new delta processed
      for a `FEAT_ID` where all previous Epics in the active roadmap version are `Done` (or absent),
      when routed, then the system detects **no active owner** for this layer, bypasses ownership
      inspection, and falls back to the `absent` row of the matrix to spawn a brand-new independent
      Epic in the current roadmap version without modifying past versions.
