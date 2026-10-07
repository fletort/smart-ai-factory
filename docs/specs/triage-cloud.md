# Specifications: Cloud Triage, Stateless CI/CD & Token Optimization (ID: TCLD)

> **State**: _Proposed specification (The specified files may not exist yet.)_

## 1. Context & Objectives

- **Global Vision:** this document details the automation architecture, event-driven pipelines and
  token-saving memory persistence mechanisms of **Smart-AI-Factory** when running on GitHub Actions.
  On the cloud, the framework operates in an **asynchronous, stateless mode**. Since virtual
  machines running CI/CD destroy themselves after each run, the pipeline leverages the GitHub Issue
  interface as a live, low-cost distributed database to maintain conversation history without
  scanning the entire codebase repeatedly. The cloud pipelines run the **same `smart-ai` Python
  CLI** as the [local triage](./triage-local.md), in `--mode cloud`. Technical design:
  [`smart-ai` CLI core](./cli-core.md) and [triage engine](./triage-engine.md). The triage consumes
  the roadmap produced by [Smart-Plan](./smart-plan.md).
- **Business Goals:**
  - **Token saving**: the primary financial risk of running multi-turn AI agents on a CI/CD platform
    is **context re-ingestion** (reading the whole repository, architecture docs and coding
    standards each time a 5-word comment is posted). The prompt data payload drops from ~45,000
    tokens (full project scanning) to less than ~1,500 tokens per discussion turn.
  - **Billing efficiency**: segregate execution scopes into two workflows (~30 seconds of compute
    per triage run, ~15 seconds per reply).
  - Translate the Human-in-the-Loop requirements into native GitHub workflow authorisations, since
    no terminal input buffer is available.
- **Non-Goals (Out of Scope):**
  - Triage rules (eligibility, context packing, LLM contract, state, lifecycle, roadmap sync): they
    are specified once in the [triage engine](./triage-engine.md).
  - The interactive terminal experience ([triage local](./triage-local.md)).
  - The coding phase triggered by the `ready-to-dev` label. Detailed documentation of this next
    phase will be added soon.

## 2. Functional & UX Specifications (What)

- **User / Process Flow:**

  ```mermaid
  graph TD
      subgraph "☁️ Trigger Phase"
          Git[git push roadmap files] -->|Event: push| CI_Triage[GitHub Actions: Triage Pipeline]
      end

      subgraph box1["🧠 Processing Loop"]
          CI_Triage -->|Invoke| CoreTriage[smart-ai --mode cloud triage --all]
          CoreTriage -->|1. Reads config| Config[.smart.ai/conf.yml]
          CoreTriage -->|2. Selects eligible roadmap issues| RM0[Roadmap files]
          CoreTriage -->|3. Queries| LLM1[Triage LLM: simple_triage_model]
          LLM1 -->|4. Triages each issue| JSON1[Strict JSON Spec Payload]
      end

      subgraph "🛑 Brainstorming"
          JSON1 -->|"Status: unclear_specification"| CheckConfig{Check config.yaml: auto_brainstorm?}

          %% OPTION A : Stop & Open a Ticket
          CheckConfig -->|"false (Option A)"| CloudStop[🛑 Manual Brainstorm Mode]
          CloudStop -->|6. Create Tracking Issue| GH_BS[gh issue create --label brainstorming]
          CloudStop -->|7. Post Questions + FACTORY_CONTEXT| NativeComment[Questions and hidden state in Issue body]
          NativeComment -->|8. Exit code 3: waiting for a human| Wait[Human answers in a comment]
          Wait -->|issue_comment event| Resume[smart-ai --mode cloud brainstorm]

          %% OPTION B : Full Auto Brainstorm -> PR Direct
          CheckConfig -->|"true (Option B)"| CloudAuto[🤖 Auto Brainstorm Mode]
          CloudAuto -->|6. Create Tracking Issue| GH_BS2[gh issue create --label brainstorming]
          GH_BS2 -->|7. Invoke LLM| LLM2[Invoke Advanced LLM: advanced_brainstorm_model]
          LLM2 -->|8. Resolve ambiguity autonomously| Fix[Update docs/architecture.md and specs]
          Fix -->|9. Push branch, link PR in the ticket| PR[Open Pull Request with complete specs]
          PR -->|10. Exit code 3: waiting for review| Review[Human reviews the PR]
          Review -->|pull_request merged event| Resume
      end

      subgraph "⚙️ Automation & Traceability"
          JSON1 -->|"Status: ready_to_dev"| DevOpCloud[DevOps Automation]
          DevOpCloud -->|4. Automated Label & Ticket| GH_Issue[gh issue create --label size]
          DevOpCloud -->|5. Roadmap sync PR, see roadmap_writeback| GitSync[Update cloud roadmap with #issue_num]
          Resume -->|ready_to_dev: mutate the SAME ticket| Mutate[Remove brainstorming, add size and ready-to-dev]
      end
  ```

- **State Machine (session / ticket / workflow):** the ticket lifecycle (Brainstorming,
  AwaitingAnswer, AwaitingPR, Retriage, Ready) is specified in the
  [triage engine](./triage-engine.md#cloud-ticket-lifecycle-and-resume-triggers). The workflow-level
  states are:

  ```mermaid
  stateDiagram-v2
      [*] --> TriageRun : push touching a roadmap file
      TriageRun --> Done : no eligible issue (exit 0, no LLM call)
      TriageRun --> TicketReady : ready_to_dev, ticket created (ready-to-dev or pending-approval)
      TriageRun --> WaitingForHuman : ambiguity, exit code 3 (expected outcome)
      WaitingForHuman --> RoutingRun : issue_comment from an authorised author
      WaitingForHuman --> RoutingRun : pull_request closed on smart-ai/brainstorm-*
      RoutingRun --> WaitingForHuman : still unclear
      RoutingRun --> TicketReady : ready_to_dev, same ticket mutated
      TicketReady --> Approved : maintainer replaces pending-approval with ready-to-dev
      TicketReady --> [*] : ready-to-dev set directly
      Approved --> [*]
      Done --> [*]
  ```

- **Business Rules:**
  - **BR-TLCD-01 (Two workflows):** the framework provisions two distinct GitHub Actions workflows
    inside `.github/workflows/` to segregate execution scopes and maximise billing efficiency:
    `ai_triage_pipeline.yml` and `ai_routing_pipeline.yml`.
  - **BR-TLCD-02 (`ai_triage_pipeline.yml` trigger):** `push` events affecting a roadmap file,
    whatever its layout (single or multi, versioned or not, see
    [Smart-Plan](./smart-plan.md#3-technical-specifications-how)).
  - **BR-TLCD-03 (`ai_triage_pipeline.yml` action):** triages every eligible roadmap issue (rules in
    the [triage engine](./triage-engine.md#eligibility)). Every issue gets its definitive GitHub
    ticket on its first run: `ready-to-dev` if the specification is clear, `brainstorming` if
    blocked. The `(#N)` link is synced to the roadmap, by default through an aggregated pull request
    so the branch protection is never bypassed. The run stops safely when a human is needed (exit
    code 3 is the expected "waiting for a human" outcome, not a failure).
  - **BR-TLCD-04 (Conversation Context epics):** an epic anchored on `Current Conversation History`
    has no spec file. The pipeline opens a tracking issue asking for that context, then the normal
    brainstorm loop applies.
  - **BR-TLCD-05 (`ai_routing_pipeline.yml` trigger):** `issue_comment` events where the issue
    contains the label `brainstorming`, and `pull_request` closed events for the specification PRs
    opened by the auto brainstorm (branch `smart-ai/brainstorm-*` of this repository). A merge of
    such a PR is what resumes the triage: the `push` workflow is not triggered by it because it does
    not touch the roadmap files.
  - **BR-TLCD-06 (`ai_routing_pipeline.yml` action):** resumes the session from the issue content
    (state machine: [triage engine](./triage-engine.md#cloud-ticket-lifecycle-and-resume-triggers)).
    A comment feeds the conversational loop, a merged PR re-runs the triage on the merged
    specifications, and a PR closed without merge makes the ticket fall back to manual brainstorm.
  - **BR-TLCD-07 (Manual refinement, `auto_brainstorm:** false`, Case A): if the Triage LLM
    discovers an ambiguous task, the pipeline stops automated execution immediately. The CLI
    automatically provisions a GitHub Issue containing the model's native clarifying questions
    inside the issue body, freezing the backlog until a human engineer provides the missing
    technical inputs in the comments.
  - **BR-TLCD-08 (Autonomous refinement, `auto_brainstorm:** true`, Case B): the
    `advanced_brainstorm_model` resolves the ambiguity through the API. Its proposed changes to the
    specs and `docs/architecture.md` are submitted as a **pull request** linked to the tracking
    issue; nothing is pushed to the default branch, so a human always reviews them. The triage
    resumes only once the PR is merged, so no development ticket is produced from unreviewed
    specifications. If the PR is closed without merge, the ticket falls back to manual brainstorm.
  - **BR-TLCD-09 (Backlog protection, `hitl_during_triage:** true`): when a specification is flagged
    as `ready_to_dev` by the cloud engine, the ticket receives a `pending-approval` label instead of
    `ready-to-dev`. The task remains unassigned to coding agents until a maintainer replaces
    `pending-approval` with `ready-to-dev`.
  - **BR-TLCD-10 (Ticket as cached memory):** the GitHub Issue body is treated as a cached memory
    bank (`FACTORY_CONTEXT`). Once the specification is clear (human answers, or a merged
    specification PR), this same tracking issue is **mutated in place** and becomes the development
    issue, so the whole history (initial gap, discussion, specification PR) stays on the ticket.
  - **BR-TLCD-11 (Idempotent retries):** a hidden marker in the first ticket created identifies it
    for any pipeline retry, so a retry never generates a duplicate
    ([triage engine](./triage-engine.md#issue-creation--roadmap-write-back)).
  - **BR-TLCD-12 (Loop protection):** the triage workflow is idempotent: a push that brings no
    eligible issue (for example the merge of a roadmap-sync PR) exits with code 0 before any LLM
    call. A `concurrency` group per ref serialises runs, so two runs cannot both miss the ticket
    marker. With `roadmap_writeback: direct`, pushes whose actor is the bot are also ignored. If
    `roadmap_writeback: pr` is enabled, the system MUST use an isolated, unique branch per run
    (e.g., `smart-ai/roadmap-sync-${run_id}`) instead of a single shared branch to prevent
    concurrent writeback collisions and data loss across different refs.
  - **BR-TLCD-13 (Comment authorisation):** `issue_comment` runs only for authors whose association
    is `OWNER`, `MEMBER` or `COLLABORATOR`. Comment text is untrusted data: it is passed through a
    file or an environment variable, never interpolated into a `run:` script (this also keeps the
    workflows compliant with `zizmor`).
  - **BR-TLCD-14 (Merge event trust):** the `pull_request` trigger only acts on
    `smart-ai/brainstorm-*` branches whose head repository is this repository (never a fork). The
    merge is the human gate requiring a reviewer with write access under repository branch
    protection. To prevent cross-session race conditions, the system MUST explicitly bind the event
    by enforcing that the merged PR number equals `BrainstormState.pending_pr` and validating its
    tracking session marker before transitioning out of the `AwaitingPR` state.
  - **BR-TLCD-15 (Permissions):** least privilege per job: `contents: write` (roadmap sync and PR
    branches), `issues: write`, `pull-requests: write`, only where needed. Both workflows must pass
    `actionlint` and `zizmor`.
  - **BR-TLCD-16 (Failure mode):** on any non-zero exit code other than 3, the workflow comments the
    error summary on the tracking issue when one exists.
- **User Stories:**
  - _As a_ maintainer, _I want_ a push of the roadmap to trigger the triage automatically _so that_
    the backlog is generated without any manual action.
  - _As a_ maintainer, _I want_ ambiguities to be posted as questions on a GitHub issue _so that_ I
    can answer from the web interface.
  - _As a_ maintainer, _I want_ the advanced model's decisions delivered as a pull request _so that_
    I review them before any development ticket exists.
  - _As a_ maintainer, _I want_ a `pending-approval` label _so that_ tasks stay unassigned to coding
    agents until I approve them.
  - _As a_ FinOps owner, _I want_ each discussion turn to cost less than ~1,500 prompt tokens _so
    that_ the cloud pipeline stays cheap.
  - _As a_ security owner, _I want_ comments and events treated as untrusted data _so that_ the
    workflows cannot be injected.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  ```mermaid
  sequenceDiagram
      autonumber
      actor Human as Maintainer
      participant Push as push workflow (ai_triage_pipeline.yml)
      participant Route as routing workflow (ai_routing_pipeline.yml)
      participant CLI as smart-ai --mode cloud
      participant Issue as GitHub issue (tracking ticket)

      Human->>Push: git push roadmap files
      Push->>CLI: triage --all
      CLI->>Issue: Create ticket (marker, brainstorming, questions + FACTORY_CONTEXT)
      CLI-->>Push: exit code 3 (waiting for a human)
      Human->>Issue: Comment (authorised author)
      Issue->>Route: issue_comment event
      Route->>CLI: brainstorm --issue N --comment-id ID
      CLI->>Issue: Download issue text + comments only
      CLI->>CLI: Validate FACTORY_CONTEXT, repeat the triage
      alt ready_to_dev
          CLI->>Issue: Mutate the same ticket (remove brainstorming, add size and ready-to-dev)
      else still unclear
          CLI->>Issue: Post new questions, update FACTORY_CONTEXT
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** the two GitHub Actions workflows and the `smart-ai --mode cloud`
    commands (see below).
  - **Payload Constraints:** the hidden `FACTORY_CONTEXT` state (see below); event data is passed
    through environment variables or files.
  - **Database Updates (ERD if needed):** none; the GitHub Issue is the distributed database.

  Detailed contracts are given in the sub-sections below.

### Cloud pipelines specifications

| Workflow                  | Trigger                                                                                      | Command                                                                                                          | Billing footprint   |
| :------------------------ | :------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :------------------ |
| `ai_triage_pipeline.yml`  | `push` affecting a roadmap file                                                              | `smart-ai --mode cloud triage --all`, run from the pinned PyPI package (for example `uvx smart-ai==X.Y.Z`)       | ~30 seconds / run   |
| `ai_routing_pipeline.yml` | `issue_comment` on a `brainstorming` issue; `pull_request` closed on `smart-ai/brainstorm-*` | `smart-ai --mode cloud brainstorm --issue <number> --comment-id "$COMMENT_ID"` or `... brainstorm --pr <number>` | ~15 seconds / reply |

Event data is passed through environment variables, never interpolated into the script.

### Safeguards (both workflows)

See the business rules BR-TLCD-12 to BR-TLCD-16: loop protection, comment authorisation, merge event
trust, permissions and failure mode.

### FinOps state persistence: `FACTORY_CONTEXT`

To prevent context re-ingestion, **Smart-AI-Factory** treats the GitHub Issue body as a cached
memory bank.

1. When the triage detects an ambiguous specification, it extracts the relevant snippet of the
   roadmap and the specific architecture rule that was violated.
2. It serialises this data into a compact, versioned JSON object (the `BrainstormState` of the
   [triage engine](./triage-engine.md#state-persistence-factory_context)) and embeds it as an
   invisible HTML comment in the issue description, with the human-readable questions:

   ```html
   ### 🛑 Technical specification gaps — the triage needs more inputs to clear this ticket. Please
   answer the questions below.

   <!-- FACTORY_CONTEXT: (encoded state, see the engine specification) -->
   ```

3. When a comment is written on the web, the brainstorm command uses the GitHub CLI to download
   **only** the issue text and the comments thread.
4. The CLI extracts and validates the invisible `FACTORY_CONTEXT` and uses it with the thread as the
   primary reference frame. **The full codebase is not scanned**; the bounded rehydration rules
   (spec file, explicitly named paths, token budget) are in the
   [triage engine](./triage-engine.md#context-packing).
5. Once the specification is clear (human answers, or a merged specification PR), this same tracking
   issue is **mutated in place** and becomes the development issue, so the whole history (initial
   gap, discussion, specification PR) stays on the ticket. Labels and lifecycle:
   [triage engine](./triage-engine.md#cloud-ticket-lifecycle-and-resume-triggers).

- **Edge Cases & Error Handling:**
  - **EC-TLCD-01 (Push without eligible issue, e.g. merge of a roadmap-sync PR):** exit code 0
    before any LLM call, no loop.
  - **EC-TLCD-02 (Concurrent runs on the same ref):** serialised by a `concurrency` group per ref.
  - **EC-TLCD-03 (Concurrent roadmap write-backs):** isolated, unique branch per run in `pr` mode.
  - **EC-TLCD-04 (Comment from an unauthorised author):** the routing workflow does not run.
  - **EC-TLCD-05 (Pull request from a fork or on a non-`smart-ai/brainstorm-*` branch):** ignored.
  - **EC-TLCD-06 (Merged PR number differs from `pending_pr`, or marker invalid):** the transition
    out of `AwaitingPR` is refused.
  - **EC-TLCD-07 (PR closed without merge):** the ticket falls back to manual brainstorm.
  - **EC-TLCD-08 (Non-zero exit code other than 3):** the workflow comments the error summary on the
    tracking issue when one exists.
  - **EC-TLCD-09 (Conversation Context epic):** a tracking issue asks for the context first.

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario:** Given a roadmap push with an eligible, clear issue, when
      `ai_triage_pipeline.yml` runs, then a ticket labelled `ready-to-dev` (or `pending-approval`
      when `hitl_during_triage: true`) is created and `(#N)` is synced to the roadmap through a pull
      request.
- [ ] **Manual Brainstorm Scenario:** Given an ambiguous issue and `auto_brainstorm: false`, when
      the triage runs, then a ticket labelled `brainstorming` holds the questions and the hidden
      `FACTORY_CONTEXT`, and the run exits with code 3.
- [ ] **Resume Scenario:** Given a `brainstorming` ticket, when an authorised author comments, then
      only the issue text and comments are downloaded, the triage is repeated and, if
      `ready_to_dev`, the same ticket is mutated.
- [ ] **Auto Brainstorm Scenario:** Given `auto_brainstorm: true`, when the advanced model resolves
      the ambiguity, then a pull request is opened and linked to the ticket, nothing is pushed to
      the default branch, and the triage resumes only once the PR is merged.
- [ ] **Loop Protection Scenario:** Given the merge of a roadmap-sync PR, when the push workflow
      runs, then it exits with code 0 before any LLM call.
- [ ] **Token Scenario:** Given a discussion turn, when the brainstorm command rehydrates the
      session, then the prompt data stays below ~1,500 tokens without a full repository scan.
- [ ] **Error Scenario (authorisation):** Given a comment from an author that is not `OWNER`,
      `MEMBER` or `COLLABORATOR`, when the event is received, then the routing workflow does not
      process it.
- [ ] **Error Scenario (merge trust):** Given a merged PR whose number differs from
      `BrainstormState.pending_pr`, when the event is received, then the session does not leave the
      `AwaitingPR` state.
- [ ] **Error Scenario (failure):** Given an exit code other than 3, when the workflow ends, then
      the error summary is commented on the tracking issue when one exists.
