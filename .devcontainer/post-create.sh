#!/usr/bin/env bash
# Installs Poetry in an isolated environment (official installer, no system pip).
# Virtualenv-in-project behavior is enforced via the committed poetry.toml.
set -euo pipefail

if ! command -v poetry &>/dev/null; then
  curl -sSL https://install.python-poetry.org | python3 -
fi

poetry install
