# Linting & Formatting Pipeline - Developer Guide

This document provides detailed information about the project's linting and formatting pipeline for
developers who need to understand or modify the setup.

## Architecture Overview

The pipeline is organized around **Lefthook**, a Git hooks framework that orchestrates all linting
and formatting tasks. It operates in two distinct modes:

1. **Pre-commit mode** (local development): Auto-fix/format mode
2. **Lint-all mode** (CI/CD and manual audits): Check-only mode

## Tool Selection & Rationale

### Python

- **Tool**: `ruff` (format + lint)
- **Why**: Fast, Python-native, comprehensive rule set, includes import sorting
- **Configuration**: `pyproject.toml` → `[tool.ruff]`

### Markdown, YAML, JSON, JavaScript

- **Tool**: `prettier`
- **Why**: Consistent opinionated formatting across multiple file types, widely adopted in the
  ecosystem
- **Configuration**: `.prettierrc` at project root
- **Installation**: `npm install` (Node.js required)

### Markdown Linting

- **Tool**: `markdownlint-cli2`
- **Why**: Enforces Markdown best practices (line length, list formatting, etc.)
- **Installation**: `npm install`
- **On-save**: Enabled via VS Code extension

### GitHub Actions Workflows

- **Syntax Validation**: `actionlint`
- **Security Scanning**: `zizmor`
- **Why**:
  - actionlint: Only dedicated tool for GitHub Actions YAML syntax
  - zizmor: Detects security issues specific to GitHub Actions (e.g., dangerous patterns)
- **Installation**:
  - actionlint: `apt-get install actionlint` (already in devcontainer)
  - zizmor: `poetry add --group dev zizmor` (managed via Poetry)

### Spelling

- **Tool**: `codespell`
- **Why**: Catches common misspellings in comments, docstrings, and documentation
- **Installation**: `poetry add --group dev codespell`

## Dependency Management

### Python Dependencies

All Python-based linting tools are managed via Poetry:

```bash
poetry add --group dev ruff lefthook zizmor codespell
```

View current dev dependencies:

```bash
poetry show --only dev
```

### Node.js Dependencies

JavaScript tools are managed via npm and stored in `package.json`:

```bash
npm install --save-dev prettier markdownlint-cli2
```

### Native Binaries

- `actionlint`: Installed via the upstream download script (see `.devcontainer/devcontainer.json` and `.github/workflows/lint.yml`)
- GitHub: `gh` CLI tool (part of devcontainer environment)

## Lefthook Configuration

### File Location

`lefthook.yml` at project root

### Structure

#### Pre-commit Group

Runs automatically before git commits in local development:

```yaml
pre-commit:
  parallel: false # Sequential execution at top level
  piped: false
  jobs:
    - name: 1. Lint & Format
      group:
        parallel: true # Parallel execution within this group
        jobs:
          - ... # Individual linting/formatting commands
    - name: 2. Check for misspellings
      run: codespell ... # Spelling check (sequential after formatting)
```

**Key characteristics:**

- Top-level jobs run sequentially (linting → spelling)
- Linting/formatting jobs run in parallel for speed
- All changes are auto-fixed where possible
- Fixed files are automatically re-staged (`stage_fixed: true`)
- Errors block commit and display `fail_text` messages

#### Lint-all Group

Runs in CI/CD and manual audits:

```yaml
lint-all:
  parallel: true # All checks run in parallel
  piped: false
  files: git ls-files # Check all tracked files
  commands:
    ruff-format-check: ... # Check-only mode (--check flag)
    prettier-check: ...
    # ... etc
```

**Key characteristics:**

- All commands use check-only flags (--check, no --fix)
- Runs against all git-tracked files
- No files are modified
- Exit with error if any issues found
- Used by GitHub Actions CI workflow

## VS Code Integration

### Extensions

| Tool           | Extension                        | Purpose                         |
| -------------- | -------------------------------- | ------------------------------- |
| Ruff           | `charliermarsh.ruff`             | Python linting/formatting       |
| Prettier       | `esbenp.prettier-vscode`         | Multi-format formatting         |
| Markdownlint   | `DavidAnson.vscode-markdownlint` | Markdown linting                |
| Actionlint     | `arahata.linter-actionlint`      | GitHub Actions syntax           |
| Zizmor         | `zizmor.zizmor-vscode`           | GitHub Actions security         |
| GitHub Actions | `GitHub.vscode-github-actions`   | Actions workflow editor support |

### Settings Configuration

**File**: `.vscode/settings.json`

All `[language]` blocks enable `editor.formatOnSave: true` where applicable:

```json
{
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports.ruff": "explicit"
    }
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.markdownlint": "explicit"
    }
  },
  "[yaml]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.actionlint": "explicit"
    }
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Result**: Developers get immediate feedback as they type, with automatic fixes on save.

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/lint.yml`

The workflow:

1. Sets up Python 3.11
2. Installs Poetry
3. Caches Poetry dependencies and `.venv/`
4. Installs Node.js dependencies
5. Installs actionlint binary
6. Runs `poetry run lefthook run lint-all`

### Environment Requirements

For `zizmor` security scanning to work fully:

- `gh` CLI must be installed
- `GH_TOKEN` environment variable set (usually `${{ secrets.GITHUB_TOKEN }}` in Actions)
- The token needs `actions:read` permission on the repository

```bash
# Local testing with zizmor
gh auth login  # Authenticate if needed
export GH_TOKEN=$(gh auth token)
poetry run lefthook run lint-all
```

## Common Workflows

### Running Full Linting Locally

```bash
# Pre-commit mode (auto-fix where possible)
poetry run lefthook run pre-commit

# Lint-all mode (check-only)
poetry run lefthook run lint-all
```

### Running Individual Tools

```bash
# Python only
ruff format .
ruff check --fix .

# Markdown, YAML, JSON
npx prettier --write '*.{md,yml,yaml,json,js}'

# Markdown linting
npx markdownlint-cli2 '*.md'

# GitHub Actions workflows
actionlint .github/workflows/*.{yaml,yml}

# Security scanning (requires GitHub token)
export GH_TOKEN=$(gh auth token)
zizmor --fix=safe .github/workflows/

# Spelling
codespell .
```

### Fixing Specific Issues

**Unsafe GitHub Actions security issues:**

```bash
# Zizmor flags some issues as unsafe that require manual review
# To fix them interactively:
export GH_TOKEN=$(gh auth token)
zizmor --gh-token $GH_TOKEN --fix=all .github/workflows/
```

**Staged files only (before commit):**

```bash
# Most Lefthook commands automatically target staged files
# For manual runs, use git diff-index to get staged files:
STAGED=$(git diff-index --cached --name-only HEAD)
ruff format $STAGED
```

## Adding New Linting Tools

### Python Tool

```bash
# Add to Poetry
poetry add --group dev <tool-name>

# Update lefthook.yml pre-commit and lint-all groups with new commands
# Example format:
- name: <description>
  glob: '<file-pattern>'
  run: <tool-command> {staged_files}  # or {files} for lint-all
  stage_fixed: true                    # if tool modifies files
```

### JavaScript Tool

```bash
# Add via npm
npm install --save-dev <tool-name>

# Update lefthook.yml (npm tools require npx)
run: npx <tool-name> {staged_files}
```

### Native Binary

```bash
# Add installation to devcontainer.json postCreateCommand
# Update lefthook.yml with the tool invocation
```

## Troubleshooting

### "Command not found" errors

**Prettier/Markdownlint**: Ensure Node.js packages are installed

```bash
npm install
```

**Ruff/Zizmor**: Ensure Poetry packages are installed

```bash
poetry install --sync
```

**Actionlint**: Ensure devcontainer was rebuilt or installed locally

```bash
# Local install (macOS)
brew install actionlint
# or
apt-get install actionlint  # Linux
```

### Zizmor "auth token" errors

Zizmor needs GitHub authentication for full security scanning:

```bash
gh auth login
export GH_TOKEN=$(gh auth token)
poetry run lefthook run lint-all
```

### Prettier conflicts with editor

If prettier on-save conflicts with other formatters:

1. Ensure only one formatter is set as `editor.defaultFormatter` per language
2. Check `.prettierrc` for any conflicting settings
3. Clear VS Code cache and reload window

### Lefthook doesn't run on commit

Install lefthook hooks in your repository:

```bash
poetry run lefthook install
```

## References

- **Lefthook**: <https://github.com/evilmartians/lefthook>
- **Ruff**: <https://github.com/astral-sh/ruff>
- **Prettier**: <https://prettier.io/>
- **Markdownlint**: <https://github.com/igorshubovych/markdownlint-cli2>
- **Actionlint**: <https://github.com/rhysd/actionlint>
- **Zizmor**: <https://github.com/naugtur/zizmor>
- **Codespell**: <https://github.com/codespell-project/codespell>
