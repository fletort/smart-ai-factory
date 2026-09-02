# Visual Studio Code Setup

This framework leverages **Dev Containers**, **Continue.dev** and **Claude Code** to provide a pre-configured local environment with multi-key FinOps tracking.

## 🔐 1. Prepare your Continue.dev API Keys

To track costs accurately, you will need to prepare the following API keys for the initialization step:

- `CHAT_OPENROUTER_API_KEY` (For DeepSeek-R1 / V3 Chat and Skills)
- `CHAT_GEMINI_API_KEY` (For Gemini 2.5 Flash chat)
- `AUTOCOMPLETE_OPENROUTER_API_KEY` (For Codestral smart autocomplete)

## 🚀 2. One-Click Initialization

1. Open this project directory in VS Code.
2. Ensure the **Dev Containers** extension is installed.
3. Open the Command Palette (`Cmd/Ctrl + Shift + P`) and select `Dev Containers: Reopen in Container` (or click the green pop-up helper if it appears).
4. Create your local context file: copy `.continue/.env.template` to a new `.continue/.env` file and paste your API keys.
5. Click the **Spark icon** in the Editor Toolbar (top-right corner of the editor) to sign in and authenticate **Claude Code** using your commercial subscription.

_Note: The Dev Container is pre-configured with a named Docker volume mapped to `~/.claude`. This ensures your Claude Code authentication token, session history, and trust settings persist across container rebuilds._

## 🎛️ 3. How to Use Locally

When working locally, you have access to two distinct AI interfaces. **You act as the manual router**: to respect your budget and optimize performance, align your interface and model selection with the task complexity.

### 🧩 Interface 1: Continue.dev (Side-Panel Chat & Autocomplete)

Use this interface for day-to-day coding assistance, quick questions, and code generation inside your current file.

- **For Autocomplete (Ghost text):** Just type normally! `Codestral` via OpenRouter runs silently in the background, costing fractions of a cent per session.
- **For XS / S Tasks (Quick edits, debugging, explaining code):** Open the **Continue** side-panel, select `DeepSeek-V3` in the model dropdown, and chat. It is near-instant and ultra-economic.
- **For M / L Tasks (Complex algorithms, writing full unit test suites):** Switch the **Continue** model dropdown to `DeepSeek-R1`. Let its reasoning chain think through the logic before generating the code.

### 🤖 Interface 2: Claude Code (Integrated Terminal CLI)

Use this interface for autonomous agent execution. Do not use the chat panel here; instead, open your integrated terminal and simply type:

```bash
claude
```

- **For XL / XXL Tasks (Heavy refactoring, multi-file changes, architecture loops):** Let **Claude Code (Sonnet)** leverage your fixed monthly subscription credits to safely orchestrate complex, multi-file structural changes without blowing up your pay-as-you-go API wallets.

## 📦 4. Included Toolkit

To ensure a seamless local-first experience, the container workspace automatically provisions these essential extensions and tools:

- `anthropic.claude-code`: Native panel and environment integration for Anthropic's autonomous coding agent.
- `yzhang.markdown-all-in-one`: Provides real-time, high-fidelity rendering of your `roadmap.md` and architecture charts directly inside the IDE.
- `DavidAnson.vscode-markdownlint`: Lints Markdown files. **Lint-on-save** is enabled for these files.
- `redhat.vscode-yaml`: Injects YAML schema validation and autocompletion for YAML files.
- `esbenp.prettier-vscode`: Enforces strict code and document formatting. **Format-on-save** is enabled by default to keep your configuration files clean before any Git commit.
