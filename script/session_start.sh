#!/bin/bash

# Path to the mimi CLI
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$PROJECT_ROOT/bin:$PATH"

# Logging for debug
echo "$(date): session_start.sh called" >> "$PROJECT_ROOT/hook.log"

# Get the instruction text
INSTRUCTION=$(mimi instruction)

# Output JSON format required by Gemini CLI SessionStart hook
jq -n --arg inst "$INSTRUCTION" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $inst}, systemMessage: "🧠 mimi-memory protocol loaded"}'
