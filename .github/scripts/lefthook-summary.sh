#!/usr/bin/env bash

# Exit immediately if a command fails or if an uninitialized variable is used
set -uo pipefail

LOG_FILE="lefthook_output.log"

# 1. Print the Markdown table header to stdout
echo "### 🥊 Lint-All Results (Super-Linter Style)"
echo ""
echo "| Status | Linter / Command |"
echo "| :---: | :--- |"

# 2. Run Lefthook, display output in real-time to stderr (so it doesn't mix with our Markdown stdout)
# We use 'tee' to duplicate the stream, and capture the actual Lefthook exit code using PIPESTATUS
#export LEFTHOOK_OUTPUT="meta,summary,execution"

# Note: We redirect Lefthook to stderr (>&2) via tee so the interactive logs 
# show up in the console but don't pollute the final Markdown output.
lefthook run lint-all 2>&1 | tee "$LOG_FILE" >&2
LEFTHOOK_EXIT_CODE=${PIPESTATUS[0]}

# 3. Parse the log file line by line to build the Markdown table rows to stdout
while IFS= read -r line; do
  # Remove Lefthook's box-drawing characters (the '│' symbol) and trim whitespace
  clean_line=$(echo "$line" | sed 's/│//g' | xargs)

  # Skip empty lines
  [ -z "$clean_line" ] && continue

  # Match Lefthook execution results and format them into Markdown rows
  if [[ "$line" == *"✔️"* || "$line" == *"success"* ]]; then
    echo "| 🟢 SUCCESS | $clean_line |"
  elif [[ "$line" == *"❌"* || "$line" == *"fail"* ]]; then
    echo "| 🔴 FAILED | $clean_line |"
  elif [[ "$line" == *"skip"* || "$line" == *"no files"* ]]; then
    echo "| ⚪ SKIPPED | $clean_line |"
  fi
done < "$LOG_FILE"

# Clean up the temporary log file
rm -f "$LOG_FILE"

# 4. Exit with Lefthook's original exit code so the orchestrator reflects the lint results
exit "$LEFTHOOK_EXIT_CODE"
