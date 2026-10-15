# Specifications: Smart-Plan (Phase 1 - Roadmap & Scheduling) (ID: PLAN)

> **State**: _Partially implemented_ (`.agents/skills/smart-plan/`) — **revision proposed**.
> **Implemented:** BR-PLAN-01 to BR-PLAN-06, BR-PLAN-11 to BR-PLAN-13, EC-PLAN-01 to EC-PLAN-06,
> AC-PLAN-01 to AC-PLAN-06.
>
> **Not developed:** BR-PLAN-07 to BR-PLAN-10, BR-PLAN-14 to BR-PLAN-21, EC-PLAN-07 to EC-PLAN-16,
> AC-PLAN-07 to AC-PLAN-21.

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
  - **Architecture-aligned decomposition**: issues are bounded deliverable slices aligned with the
    **target architecture** of the specification, so downstream work (triage, dev agents) never
    splits the same component across conflicting tickets nor merges unrelated ones.
  - **Functional scope on top**: the requirements an Epic targets are listed at the **Epic level**
    (`Scope:`), keeping the functional view above the technical slices, then frozen as `Delivered:`
    once the Epic is finalized — the roadmap records _which_ requirements an Epic delivered without
    claiming _whether_ they are implemented (the specification header, BR-SPEC-25, remains that
    authority).
- **Non-Goals (Out of Scope):**
  - **Implementation detail** — source code, algorithms, data structures, acceptance / QA criteria
    and coding steps. The **target architecture** of the input specification (its components and
    boundaries) is used to shape the issue boundaries, but the output never descends to _how_ a
    component is coded; that detailing belongs to the Triage phase.
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

      Rev -->|"no or stale"| Process["🏗️ Build / Merge Roadmap Strategy<br/>(delta from Base-Commit, else fallback)"]
      Rev -->|"up to date, eligible finalization"| Confirm
      Rev -->|"up to date, nothing to finalize"| UTD["✅ Epic up to date<br/>(no delta — no write)"]

      Process -->|Step 1| Vision["🎯 Extract Global Vision<br/>(2-Sentence Summary)"]
      Vision -->|Step 2| Epics["📊 Map Epics<br/>(+ functional Scope)"]
      Epics -->|Step 3| Issues["🎫 Sequence High-Level Issues<br/>(architecture-aligned, Deps)"]

      Issues -->|Clean slate| Output["✅ Write To Workspace<br/>(+ refreshed Revision)"]
      Issues -->|Existing roadmap| Confirm["🧾 Diff Table + User Confirmation"]
      Confirm -->|yes| Output
  ```

  _Note: the `Revision` baseline (BR-PLAN-14) is refreshed in the roadmap Spec Anchors when the
  delta is merged; a `Conversation Context` anchor has no revision and always follows the merge
  path. A run writes nothing only when there is no delta **and** nothing to finalize; a proposal to
  finalize an eligible Epic is a metadata-only change that goes through the confirmation like any
  other (BR-PLAN-09). An Epic is **finalized** only when all its issues are checked and its
  `Revision` is current (BR-PLAN-20); its `Scope:` line is then renamed `Delivered:` and frozen —
  finalization is **terminal**, so a later specification change opens a **new generation**
  (BR-PLAN-07) rather than reopening the closed Epic._

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
      RevisionCheck --> UPD : every open Epic up to date and nothing to finalize
      RevisionCheck --> Reconciliation : no baseline, a different hash, or an eligible finalization
      CleanSlate --> Written : direct write, no question
      Reconciliation --> AwaitingConfirmation : diff table displayed
      AwaitingConfirmation --> Written : user types yes
      AwaitingConfirmation --> Reconciliation : user specifies adjustments
      Written --> [*]
      UPD --> [*] : nothing to write
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
  - **BR-PLAN-07 (Merge rules):** a pointer matching an **open** Epic (one not yet finalized,
    BR-PLAN-20) updates that Epic; an unknown pointer — or a pointer whose matching Epics are **all
    finalized** — always creates a **new Epic** (a new generation), never added to an unrelated one.
    Existing `[ISSUE-X.Y]` IDs and checkboxes are preserved, new IDs continue after the highest
    existing one, and removed features are flagged `<!-- [DELETED] -->` or removed without shifting
    other IDs.
  - **BR-PLAN-08 (Granularity — architecture-aligned deliverable slices):** an issue is a
    **coherent, bounded deliverable slice** whose boundary follows the **target architecture** of
    the anchored specification (its technical section: components, modules and their interfaces).
    Several closely-coupled requirements may belong to one issue, and a single large requirement may
    be split across several issues: the unit is the **deliverable**, not the requirement. When the
    specification carries no usable architecture (EC-PLAN-10), the decomposition falls back to
    functional slices and the fallback is traced. Functional scope is carried **at the Epic level**
    (BR-PLAN-18), not per issue: the issues are the technical slices that deliver the Epic's
    `Scope:`.
  - **BR-PLAN-09 (Confirmation):** a clean slate is written directly, without question. For an
    existing roadmap, the skill shows a comparison table (modified, added, deleted, metadata) and
    writes only after the user types `yes`. A run writes nothing — not even metadata — **only when
    it has no change to apply**: every anchored **open** Epic is up to date (BR-PLAN-15) **and** no
    Epic is eligible for finalization (BR-PLAN-20). A run whose only change is one or more
    finalizations still goes through the comparison table and the `yes` confirmation. The baseline
    (`Revision`/`Base-Commit`) is refreshed **only when a delta is merged** — a finalization never
    refreshes it.
  - **BR-PLAN-10 (Implementation-agnostic scope boundary):** the plan stays **implementation-
    agnostic**: no source code, no algorithm, no data-structure or schema detail, no acceptance
    criteria and no step-by-step. Using the specification's **target architecture** (its components,
    boundaries and sequencing constraints) to shape the issue boundaries and the dependencies is
    **expected**, not forbidden: architecture topology is macro-level, implementation is not.
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
  <!-- The anchor block written by `smart-plan` is part of the roadmap/triage format contract
  (BR-TRGE-04): the revision baseline (`Revision`, `Base-Commit`) and the Epic annotations
  (`Scope:`Delivered:`, `Decisions:`). Any change of these anchor fields requires the roadmap
  parser of the triage engine to tolerate them as metadata only (BR-TRGE-19); the mirror marker is
  declared on the "Roadmap discovery & parsing" section of triage-engine.md. -->
  <!-- ⚠️ DEPENDENCY ALERT: incoming ./smart-spec.md#BR-SPEC-25 -->
  <!-- The delivery-status header excluded from `Revision` (BR-PLAN-14) is the format defined by
  `smart-spec` (BR-SPEC-25): a change of that header format must be reflected in the exclusion
  rule here. -->
  - **BR-PLAN-14 (Revision baseline in the Spec Anchor):** when a File-anchor Epic is written or
    merged, its `📋 Spec Anchors` records the revision of its pointed specification **at the time
    the roadmap was last built from it** in a required `Revision` line and, when available, an
    optional `Base-Commit` line. Legacy anchors without a baseline remain valid;
    `Conversation Context` anchors carry neither line:

    ```markdown
    - **📋 Spec Anchors:**
      - **Source Type:** File
      - **Pointer:** `docs/specs/smart-plan.md`
      - **Revision:** sha256:9f2c4a1b… # content hash of the pointed file
      - **Base-Commit:** 4a1b7c9 # newest base-branch commit whose normalized content hash equals
        Revision
      - **Decisions:** [ADR-0007](docs/adr/0007-record-spec-revision-baseline-in-roadmap.md)
    ```

    - **`Revision`** is a **content hash**: `sha256` of the pointed file, lower-case hexadecimal,
      prefixed `sha256:`, with line endings normalised to LF. It is independent of the git topology
      (squash, rebase, cherry-pick, merge), so it stays valid across the merge strategies of the
      base branch. The **delivery-status header** (the leading blockquote block defined by
      BR-SPEC-25: `State` / `Implemented` / `Not developed`) is **excluded before hashing**: it is
      derived status metadata, not specification content, and it is recomputed at every revision —
      including when a delivered requirement moves to `Implemented` — which would otherwise make
      every finalized Epic look stale forever and open a spurious **new generation** (BR-PLAN-15,
      BR-PLAN-20). A **status-only** edit therefore changes no `Revision`; only a change to the
      specification's **content** does (and a purely editorial content change is filtered later,
      BR-PLAN-21).
    - **`Base-Commit`** is the **most recent commit of the base branch at which the pointed file
      reproduces `Revision`** — a convenience pointer used only to recover the previous content (to
      display a diff). It is deliberately **not** "the last commit that touched the file": the base
      branch may have advanced the file after the current branch diverged, so that commit could
      carry different content and record an inconsistent baseline. The check **never compares Git
      object IDs**: a Git blob's object ID hashes a `blob <size>\0` header together with the raw
      content (and may be SHA-1), so it can never equal `Revision`. For each candidate commit
      (`git log <base> -- <pointer>`, newest to oldest) the file content is extracted
      (`git show <commit>:<pointer>`), then **line endings are normalised to LF and the result is
      hashed with the exact algorithm that produced `Revision`** (`sha256` of the normalised
      content); the newest commit whose content hash equals `Revision` is the `Base-Commit`. The
      **base branch** is the branch the roadmap is planned against — by default the repository's
      default branch, overridable through the `roadmap.base_branch` configuration key. The line is
      written **only when such a commit exists** _and_ the pointed file is unmodified in the current
      branch and in the working tree (clean state — a secondary guard); otherwise it is omitted and
      the BR-PLAN-16 fallback applies.
    - Both lines are written **by `smart-plan` (the consumer)**, never by the specification author:
      a baseline written inside the pointed file itself would be self-referential and stale as soon
      as it is committed.
    - This concerns **`Source Type: File`** anchors only; a `Conversation Context` anchor carries no
      `Revision`.
    - The design of this baseline — a content hash rather than a commit SHA, with a non-blocking
      fallback — is recorded in [ADR-0007](../adr/0007-record-spec-revision-baseline-in-roadmap.md).

  - **BR-PLAN-15 (Delta detection on re-planning):** before merging, the skill computes
    `H_now = hash(pointer)` and compares it to the recorded `Revision`. This per-Epic check applies
    to **open** Epics only — a **finalized** Epic is terminal and is never re-planned (BR-PLAN-20);
    a **substantive** change to its pointer opens a **new generation** (BR-PLAN-07, BR-PLAN-21):
    1. no `Revision` recorded (legacy roadmap): no delta can be computed, so the **current content
       is treated as the novelty** (as in the fallback) and the normal BR-PLAN-07 merge reconciles
       the Epic through the existing-roadmap confirmation (BR-PLAN-09). The `Revision`/`Base-Commit`
       baseline is recorded **only as part of that confirmed merge**, never standalone, so a spec
       change since the legacy build resurfaces as work instead of being silently marked as planned;
    2. `H_now == Revision`: the delta is **empty**, traced explicitly as `up to date` for that Epic;
       no issue is added or modified by this run. Substantive ADR changes require a new ADR
       back-referenced by the specification (BR-ADR-04, BR-PLAN-19); that reference changes the
       specification hash without hashing ADR contents separately;
    3. `H_now != Revision` (or the file is new): the delta since the last planning is determined —
       from the content at `Base-Commit` when it is reachable, otherwise by treating the **current
       content as the novelty** (fallback). The delta is then **classified** as **substantive** or
       **non-substantive** (BR-PLAN-21): only a **substantive** delta re-maps the Epic or opens a
       new generation, while a **non-substantive** one refreshes the baseline only. After a
       successful merge, the `Revision` and `Base-Commit` of the affected **open** Epics are
       refreshed. The delta is a **best-effort hint** — a textual comparison of the pointed file's
       previous and current content, used to prioritise which requirements are re-mapped; it never
       replaces the mapping, which still follows BR-PLAN-07.

    When a re-plan targets a pointer whose matching Epics are **all finalized** (BR-PLAN-07), no
    open Epic can absorb the change: a **new generation** Epic is created, seeded from the
    **`Revision` of the last finalized Epic** of that pointer (never from the whole specification).
    Whether its `Scope:` can be narrowed to the changed requirements depends on the **same
    best-effort delta as BR-PLAN-16**:
    - **previous content recovered and verified** (`Base-Commit` reachable and its content hashing
      to that `Revision`): the delta is computed, so the new Epic's `Scope:` records **only the
      requirements that changed** since that generation and the already-delivered requirements are
      not re-issued as new work;
    - **previous content unavailable** (`Base-Commit` absent, unreachable, inconsistent with
      `Revision`, or the file dirty — BR-PLAN-16, EC-PLAN-08): the current specification is treated
      as the novelty, so the new Epic's `Scope:` covers the **full anchored scope** of the current
      specification and the fallback is traced — the already-delivered requirements may be
      re-listed, a limitation accepted rather than guessed. The new Epic then records its own
      `Revision` = current `H_now`, and its predecessors keep their frozen `Delivered:`
      (BR-PLAN-20).

  - **BR-PLAN-16 (Delta source, classification and fallback):** the delta is best-effort and never
    blocking. It also decides the seeding of a **new-generation** Epic (BR-PLAN-15): the
    **changed-only** `Scope:` is promised **only** when the previous content is actually recovered
    and verified here.
    - `Base-Commit` reachable **and its content hashing to the recorded `Revision`**: the previous
      content is recovered (`git show <Base-Commit>:<pointer>`) and the delta is the comparison
      against the current content — the comparison the classifier of BR-PLAN-21 reads.
    - `Base-Commit` absent, unreachable (history rewritten or garbage-collected), inconsistent with
      `Revision` (no base-branch commit reproduces it), or the file is dirty: no diff is displayed,
      a non-blocking notice is emitted, and the current content is treated as the novelty — for a
      new-generation Epic, its `Scope:` then covers the **full anchored scope**. With no previous
      content there is nothing to classify, so the change is defaulted to **substantive**
      (BR-PLAN-21): the safe direction, which never silently drops a real requirement change.
  - **BR-PLAN-17 (Baseline scope):** only the **`planned`** baseline is written by this phase. The
    `triaged` (Phase 2) and `implemented` (Phase 3) baselines are explicitly out of scope here and
    reserved for later increments.
  - **BR-PLAN-18 (Epic functional scope — `Scope:` / `Delivered:`):** the functional scope of an
    Epic is carried **at the Epic level**, not per issue: the `📋 Spec Anchors` lists, in a `Scope:`
    line, the requirement identifiers (`BR-`, and optionally `EC-`) the Epic targets. This keeps the
    functional view on top and the technical slices below (BR-PLAN-08). The line is a **scope
    annotation**: it maps _which requirements an Epic covers_, **never whether they are
    implemented** — the specification's delivery-status header (BR-SPEC-25) stays the single
    authority on delivery. The set is refreshed while the Epic is **open**; a `Scope:` entry that
    does not resolve to a requirement of the anchored specification is reported (EC-PLAN-11) and
    never silently corrected. On **finalization** the line is renamed `Delivered:` and **frozen for
    the Epic's lifetime** (BR-PLAN-20): a later specification change never edits it nor reopens the
    Epic — it opens a **new generation** (BR-PLAN-07, BR-PLAN-15).
  <!-- ⚠️ DEPENDENCY ALERT: bidirectional ./adr.md#BR-ADR-08 -->
  <!-- `smart-plan` reads and cites the Architecture Decision Records referenced by the anchored
  specification and writes them on the Epic under a `Decisions:` line (BR-PLAN-19). Any change of
  the ADR reference contract (BR-ADR-08) or of the ADR location/template (BR-ADR-09) changes what
  the plan can cite; conversely the `Decisions:` anchor written here depends on that reference
  format. The mirror marker is declared on the business-rules section of adr.md. -->
  - **BR-PLAN-19 (ADR awareness):** when the anchored specification references Architecture Decision
    Records (BR-ADR-08), `smart-plan` **reads** them and cites them on the Epic under a `Decisions:`
    line, used as **constraints** (boundaries, sequencing) and as a **sanity check** that the plan
    does not contradict a recorded decision. They are never a blocker: an unresolvable ADR link is
    traced, not invented (EC-PLAN-13). `smart-plan` **reads and cites** ADRs; it **never creates**
    one (BR-ADR-07 pins creation to Phase 0). ADR substance is **immutable** (BR-ADR-04) and any
    substantive decision change is recorded as a **new** ADR back-referenced by the specification
    (BR-ADR-08, BR-SPEC-26) — so it inevitably changes the specification revision (BR-PLAN-14). The
    specification hash is therefore a **sufficient change trigger** and the plan tracks **no
    separate ADR baseline**; a pure `Status`/`Links` edit never alters the decision substance the
    plan cites.
  - **BR-PLAN-20 (Epic finalization — terminal):** an Epic is **finalized** only when (a) all its
    issues are checked and (b) its recorded `Revision` is **current** — i.e. the pointed
    specification has not changed since the last planning (BR-PLAN-15). If the `Revision` is
    **stale**, the **still-open** Epic must be **re-planned first**: the changed requirements
    resurface as work through the delta, so a stale Epic is never closed on an out-of-date
    understanding (EC-PLAN-12). Finalization is **terminal**: once closed, the Epic is **never
    reopened** and its `Revision` is never refreshed — a later specification change opens a **new
    generation** instead (BR-PLAN-07, BR-PLAN-15). On finalization the `Scope:` line is renamed
    `Delivered:` and **frozen for the Epic's lifetime** — a historical record of what that Epic
    delivered. Updating the specification's delivery-status header (BR-SPEC-25) remains the
    **authority** on what is implemented: `Delivered:` records _which Epic_ delivered a requirement,
    not _whether_ it is implemented. The transition is **detected and proposed by a run**, never
    silent: when a run reads an **open** Epic whose issues are all checked and whose `Revision` is
    current, it shows the change (`Scope:` → `Delivered:`, metadata only) in the comparison table
    and applies it **only after the `yes` confirmation** (BR-PLAN-09); if declined, the Epic stays
    open. This is the **sole exception** to the "all up to date ⇒ no write" rule: an Epic already
    finalized, or not yet fully checked, still produces no write.
  - **BR-PLAN-21 (Delta classification — planning-relevant vs status/editorial):** when a delta is
    available (BR-PLAN-15 step 3, BR-PLAN-16), the recovered previous content and the current
    content are compared and the change is **classified by the model** into one of two natures:
    - **substantive** — it alters a requirement (a `BR-`/`EC-`/`AC-` rule), an architecture element
      of the technical section, or the scope of the specification: it re-maps the Epic and, for a
      finalized pointer, opens a **new generation** (BR-PLAN-07, BR-PLAN-15);
    - **non-substantive** — a purely **editorial** change (typo, wording, formatting), or residual
      delivery-status noise that survived BR-PLAN-14's exclusion: it only **refreshes the baseline**
      (`Revision`/`Base-Commit`) and never re-maps a requirement nor opens a generation.

    The classification is the **single point** where the question "does this change affect the
    plan?" is answered: it is best-effort and **never blocking**. When no previous content is
    recoverable (BR-PLAN-16), or when the model is not confident, the change defaults to
    **substantive** — so a real requirement change is never silently dropped. The asymmetry is
    deliberate: a false "substantive" costs a reviewable delta shown in the confirmation table
    (BR-PLAN-09), whereas a false "editorial" loses work. A status-only edit never reaches this step
    at all: BR-PLAN-14 already excluded the delivery-status header from `Revision`, so only a
    **content** change produces a delta to classify.
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
  - _As a_ development agent, _I want_ issues aligned to the architecture of the specification _so
    that_ two tickets never re-implement the same component differently.
  - _As a_ reviewer, _I want_ the Epic to list the requirements it targets and, once finalized, the
    ones it delivered _so that_ the roadmap is self-describing without becoming a second source of
    truth.
  - _As a_ maintainer, _I want_ a finalized Epic to stay **closed** and each later specification
    change to open a **new Epic** _so that_ delivered history stays immutable and the new work gets
    its own baseline.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-plan/`. It reads and writes the roadmap and specification
  files through file tools, and relies on a **baseline helper** provided by the host (`smart-ai`)
  for the two non-file operations of the revision baseline: computing the `sha256` content hash of a
  file **with the delivery-status header excluded** (BR-PLAN-14) and resolving
  `git show <Base-Commit>:<pointer>` (BR-PLAN-16). The nature of a recovered delta — **substantive**
  vs **editorial** — is judged by the model itself (BR-PLAN-21); no extra host helper is needed. To
  shape the issue boundaries and the `Scope:` / `Decisions:` anchors, it also reads the anchored
  specification's technical section and the Architecture Decision Records it references (BR-PLAN-08,
  BR-PLAN-19). Its output is consumed by the `smart-ai triage` command, which reads **exactly the
  format written by `smart-plan`**: any change to that format must be reflected in the
  [triage engine](./triage-engine.md#roadmap-discovery--parsing).

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Skill as smart-plan skill
      participant Cfg as .smart.ai/conf.yml
      participant FS as Roadmap files
      participant Spec as Specification file
      participant Adr as ADR directory

      User->>Skill: /smart-plan (spec file or chat context)
      Skill->>Cfg: Read (only this file)
      alt Config missing
          Skill-->>User: ❌**[smart-plan] Workspace not configured.**
      end
      Skill-->>User: [smart-ai] Roadmap Configuration detected (versioned, layout)
      opt File Mode
          Skill->>Spec: Read the target specification
      end
      opt Architecture-aware (BR-PLAN-08, BR-PLAN-19)
          Skill->>Spec: Read the technical section (components)
          Skill->>Adr: Read the ADRs referenced by the specification
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
      else Existing roadmap, no delta
          Skill-->>User: Up to date (nothing written)
      else Existing roadmap, delta
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
    - Epic annotations: each Epic's `📋 Spec Anchors` carries an optional `Scope:` line (the
      functional scope it targets, renamed `Delivered:` and frozen on finalization — a **terminal**
      state, BR-PLAN-18, BR-PLAN-20) and an optional `Decisions:` line (the ADR links that constrain
      it, BR-PLAN-19). There is **no per-issue requirement citation**: functional scope lives at the
      Epic level.
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
      - **Base-Commit:** [newest base-branch commit whose file content hashes to the Revision —
        omitted when none exists or the file is modified locally]
      - **Scope:** [BR-XXX-01, BR-XXX-02 — targeted requirements; renamed `Delivered:` and frozen
        when the Epic is finalized]
      - **Decisions:** [ADR-NNNN links constraining this Epic — optional]

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
      - **Base-Commit:** [newest base-branch commit whose file content hashes to the Revision]
      - **Scope:** [BR-XXX-01, BR-XXX-02 — targeted requirements; renamed `Delivered:` and frozen
        when the Epic is finalized]
      - **Decisions:** [ADR-NNNN links constraining this Epic — optional]

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
  - **EC-PLAN-04 (Unknown or all-finalized pointer):** a pointer unknown to the roadmap — or one
    whose matching Epics are **all finalized** (BR-PLAN-07) — yields a **brand-new Epic** (a new
    generation); the pointer is never added to an unrelated Epic nor to a closed one.
  - **EC-PLAN-05 (Feature removed by a spec update):** the issue is flagged `<!-- [DELETED] -->` or
    removed, without shifting any other ID.
  - **EC-PLAN-06 (Existing roadmap, no confirmation):** nothing is written until the user types
    `yes`; adjustments can be specified instead.
  - **EC-PLAN-07 (Legacy roadmap without `Revision`):** no baseline exists, so no delta is
    computable: the current content is treated as the novelty and the Epic is reconciled by the
    normal BR-PLAN-07 merge, gated by the existing-roadmap confirmation (BR-PLAN-09). The
    `Revision`/`Base-Commit` lines are written in the same confirmed merge — a spec change since the
    legacy build resurfaces as work, and the baseline is never stamped on un-reconciled content
    (BR-PLAN-15, step 1).
  - **EC-PLAN-08 (`Base-Commit` absent or unreachable):** the previous content cannot be recovered
    (history rewritten, garbage-collected, or the pointed file is modified in the working tree); the
    diff is skipped, a non-blocking notice is emitted and the current content is treated as the
    novelty (BR-PLAN-16).
  - **EC-PLAN-09 (Pointed specification file missing at re-planning):** the Epic keeps its anchor
    but the revision check is skipped and reported; the skill never invents a hash and asks the user
    whether the Epic should be deleted (BR-PLAN-05, BR-PLAN-15).
  - **EC-PLAN-10 (No usable architecture):** in Context Mode (BR-PLAN-02) or when the pointed
    specification has no technical section, no architecture is available: the decomposition falls
    back to **functional slices** and the fallback is traced
    (`architecture unavailable — functional decomposition`). The Epic's `Scope:` still records the
    requirements it targets.
  - **EC-PLAN-11 (Dangling `Scope:` entry):** a `Scope:` identifier that does not exist in the
    anchored specification is reported; the Epic is kept and the dangling reference is traced, never
    silently corrected (BR-PLAN-18).
  - **EC-PLAN-12 (Stale finalization — open Epic):** an **open** Epic whose issues are all checked
    but whose `Revision` is stale is **not** finalized; the staleness is reported and a re-plan is
    proposed so the changed requirements resurface as work on that same Epic (BR-PLAN-15,
    BR-PLAN-20).
  - **EC-PLAN-13 (Unresolvable ADR link):** when a referenced ADR cannot be read (missing file or
    broken link), its citation is dropped, a non-blocking notice is emitted and the missing link is
    traced; the ADR is never invented (BR-PLAN-19).
  - **EC-PLAN-14 (Specification changed after finalization):** a specification change targeting a
    pointer whose Epics are **all finalized** does **not** reopen them: a **new generation** Epic is
    created, seeded from the last finalized Epic's `Revision` (BR-PLAN-07, BR-PLAN-15), and the
    finalized Epics keep their frozen `Delivered:` (BR-PLAN-20). Its `Scope:` records **only the
    changed requirements** when the last finalized Epic's previous content is recovered and verified
    (its `Base-Commit` reachable and hashing to that `Revision`); when it cannot be (BR-PLAN-16,
    EC-PLAN-08), the current specification is treated as the novelty and the new Epic's `Scope:`
    covers the **full anchored scope**, traced as a fallback.
  - **EC-PLAN-15 (Finalization declined):** when the user declines a proposed finalization, the Epic
    stays **open** (its `Scope:` unchanged) and nothing is written; a later run proposes it again
    (BR-PLAN-09, BR-PLAN-20).
  - **EC-PLAN-16 (Non-substantive change — editorial or status-only):** a change that touches only
    the delivery-status header produces **no delta at all** (BR-PLAN-14); a purely editorial content
    change (typo, wording, formatting) produces a delta that BR-PLAN-21 classifies
    **non-substantive**. In both cases the run re-maps nothing and opens no generation: it only
    proposes the baseline refresh (`Revision`/`Base-Commit`) in the comparison table (BR-PLAN-09).
    When the previous content is unavailable, no classification is possible and the change is
    defaulted to **substantive** (BR-PLAN-16), following the normal path.

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
      pointed file (delivery-status header excluded, BR-PLAN-14) and a `Base-Commit` line only when
      a base-branch commit whose pointed-file **LF-normalised content hashes to that `Revision`**
      exists (the candidate is matched by re-hashing its content, never by comparing the blob's
      object ID, which hashes a header and may be SHA-1) and the file is unmodified in the branch
      and working tree; otherwise the line is omitted (BR-PLAN-14).
- [ ] **AC-PLAN-08 — Up-to-date Scenario:** Given a roadmap whose anchored **open** Epics all have a
      recorded `Revision` equal to the current `hash(pointer)` and none is eligible for
      finalization, when `/smart-plan` is run, then the run traces `up to date`, nothing is written
      and no issue is added, modified or deleted (BR-PLAN-09, BR-PLAN-15).
- [ ] **AC-PLAN-09 — Delta Fallback Scenario:** Given an Epic whose `Base-Commit` is absent,
      unreachable or whose pointed file is dirty, when the delta is computed, then no diff is
      displayed, a non-blocking notice is emitted and the current content is treated as the novelty
      (BR-PLAN-16).
- [ ] **AC-PLAN-10 — Legacy Baseline Scenario:** Given a roadmap without any `Revision` whose spec
      changed since it was built, when it is re-planned, then the current spec is treated as
      novelty, the merge is shown and confirmed before anything is written (BR-PLAN-09), and the
      `Revision`/`Base-Commit` baseline is recorded only as part of that confirmed merge — so the
      older changes surface as work instead of being silently marked as planned (EC-PLAN-07,
      BR-PLAN-15 step 1).
- [ ] **AC-PLAN-11 — Baseline Scope Scenario:** Given any roadmap write, when the anchors are
      refreshed, then only the `planned` baseline is written; no `triaged` or `implemented` baseline
      appears (BR-PLAN-17).
- [ ] **AC-PLAN-12 — Architecture-aligned Scenario:** Given a specification with a technical section
      (components), when `/smart-plan` builds the roadmap, then the issue boundaries follow those
      components rather than one-issue-per-requirement (BR-PLAN-08).
- [ ] **AC-PLAN-13 — Epic Scope Scenario:** Given an Epic anchored to a specification, when the plan
      is written, then its `📋 Spec Anchors` lists the requirement identifiers it targets in a
      `Scope:` line, and a dangling entry is reported rather than corrected (BR-PLAN-18,
      EC-PLAN-11).
- [ ] **AC-PLAN-14 — Finalization Scenario:** Given an Epic whose issues are all checked and whose
      `Revision` is current, when it is finalized, then its `Scope:` line is renamed `Delivered:`
      and is never overwritten nor reopened by a later re-planning (BR-PLAN-18, BR-PLAN-20).
- [ ] **AC-PLAN-15 — ADR-awareness Scenario:** Given a specification referencing ADRs, when the plan
      is written, then the Epic cites them under `Decisions:` and an unresolvable link is traced,
      not blocking (BR-PLAN-19, EC-PLAN-13).
- [ ] **AC-PLAN-16 — Fallback Scenario:** Given a Context-Mode planning with no architecture, when
      the plan is written, then issues are functional slices and the fallback is traced
      (EC-PLAN-10).
- [ ] **AC-PLAN-17 — Stale Finalization Scenario:** Given an Epic whose issues are all checked but
      whose `Revision` is stale, when a re-plan runs, then the Epic is not finalized, the staleness
      is reported and a delta re-plan is proposed (BR-PLAN-15, BR-PLAN-20, EC-PLAN-12).
- [ ] **AC-PLAN-18 — New-generation Scenario:** Given a finalized Epic and a specification change
      targeting the same pointer, when `/smart-plan` is run, then the finalized Epic is left
      untouched (its `Delivered:` stays frozen) and a **new Epic** is created; its `Scope:` records
      **only the requirements changed** since the finalized Epic's `Revision` when that Epic's
      previous content is recovered and verified (BR-PLAN-16), and otherwise covers the **full
      anchored scope** of the current specification with the fallback traced (BR-PLAN-07,
      BR-PLAN-15, BR-PLAN-16, BR-PLAN-20, EC-PLAN-08, EC-PLAN-14).
- [ ] **AC-PLAN-19 — Finalization-write Scenario:** Given an **open** Epic whose issues are all
      checked and whose `Revision` is current (no delta), when `/smart-plan` is run, then the run
      proposes the finalization (`Scope:` → `Delivered:`) in the comparison table and writes nothing
      before `yes`; an already-finalized Epic still produces no write (BR-PLAN-09, BR-PLAN-20).
- [ ] **AC-PLAN-20 — Status-only Update Scenario:** Given a finalized Epic and a specification
      edited only in its delivery-status header (a requirement flipped to `Implemented`), when
      `/smart-plan` is run, then `H_now` still equals the recorded `Revision` (BR-PLAN-14), no delta
      is computed, no **new generation** is opened and nothing is written (BR-PLAN-15, BR-PLAN-20).
- [ ] **AC-PLAN-21 — Editorial-only Scenario:** Given an Epic whose specification received a purely
      editorial content change (a typo) recoverable from `Base-Commit`, when `/smart-plan` is run,
      then the delta is classified **non-substantive** (BR-PLAN-21), no requirement is re-mapped and
      no generation is opened, and the run only proposes the baseline refresh (BR-PLAN-09,
      BR-PLAN-16).
