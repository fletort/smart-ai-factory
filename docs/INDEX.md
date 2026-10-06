# 🗺️ Functional Specifications Index (Product Wiki)

> This file is automatically managed by LLM agent. It is used by the agent to find relevant
> specification for its task without the need to read all the specification files

| Feature / Skill Domain  | Description & Capabilities                                                                                | Specification File                                     |
| :---------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **System Architecture** | Global architecture, technical stack, repository structure, conventions, security and testing baselines.  | [`architecture.md`](architecture.md)                   |
| **Smart-Spec**          | Phase 0 skill: specification refinement (3-Question Rule), scope evaluation and routing.                  | [`specs/smart-spec.md`](specs/smart-spec.md)           |
| **Smart-Plan**          | Phase 1 skill: roadmap creation and update (layouts, versions, merge rules, spec anchors).                | [`specs/smart-plan.md`](specs/smart-plan.md)           |
| **Native LLM Wiki**     | Tree-structured memory layer (router, product wiki, code wiki) enabling token-efficient pipelines.        | [`specs/native-llm-wiki.md`](specs/native-llm-wiki.md) |
| **CLI Core**            | `smart-ai` Python CLI foundation: configuration, LLM layer, resumable sessions, GitHub layer, packaging.  | [`specs/cli-core.md`](specs/cli-core.md)               |
| **Triage Engine**       | Phase 2 rules: roadmap parsing, eligibility, context packing, LLM contract, brainstorm, ticket lifecycle. | [`specs/triage-engine.md`](specs/triage-engine.md)     |
| **Local Triage**        | Interactive terminal triage: brainstorm menu, FinOps Preview Card, local roadmap sync.                    | [`specs/triage-local.md`](specs/triage-local.md)       |
| **Cloud Triage**        | GitHub Actions triage: workflows, safeguards, `FACTORY_CONTEXT` state persistence, async human gates.     | [`specs/triage-cloud.md`](specs/triage-cloud.md)       |
