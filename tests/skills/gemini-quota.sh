#!/bin/bash

MODEL_NAME="gemini-3.6-flash"
MODEL_LABEL="gemini"
CONFIG_FILE="smart-spec/promptfooconfig.yaml"

if [[ "${OSTYPE}" == "darwin"* ]]; then
  SED_CMD=(sed -i '')
else
  SED_CMD=(sed -i)
fi

# Light Test
REPLY=$(curl "https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${TEST_GEMINI_API_KEY:?}" \
  -w "%{http_code}" -s -o /dev/null \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"hello"}]}]}')

# Change dynamically the config file... wait for https://github.com/promptfoo/promptfoo/issues/10932 to can update the cli parameter
if [[ "${REPLY}" =~ ^2[0-9][0-9]$ ]]; then
  echo "✅ Gemini Quota are OK."
  "${SED_CMD[@]}" "s|      # - ${MODEL_LABEL}|      - ${MODEL_LABEL}|g" "${CONFIG_FILE}"
elif [[ "${REPLY}" == "429" ]]; then
  echo "❌ Free Gemini Quota exceeded for today (HTTP 429). Promptfoo test will not use this provider in this session."
  "${SED_CMD[@]}" "s|      - ${MODEL_LABEL}|      # - ${MODEL_LABEL}|g" "${CONFIG_FILE}"
else
  echo "❌ Gemini API health check failed with HTTP status ${REPLY}." >&2
  exit 1
fi