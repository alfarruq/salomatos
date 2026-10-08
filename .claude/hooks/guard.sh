#!/usr/bin/env bash
# SalomatOS — Claude Code enforcement hooks.
#
# Turns CLAUDE.md rules from advisory text into mechanical gates.
# Exit code 2 blocks the action and feeds stderr back to the agent.
# Exit code 0 allows. Anything else is only logged.
#
# Requires: jq
#
# Usage (wired via .claude/settings.json):
#   guard.sh bash    PreToolUse  — block destructive shell commands
#   guard.sh write   PreToolUse  — protect generated / vendored paths
#   guard.sh scan    PostToolUse — scan the written file for P0 violations
#   guard.sh stop    Stop        — gate completion on `pnpm verify`

set -uo pipefail

MODE="${1:-}"
INPUT="$(cat)"

die() {
  echo "$1" >&2
  exit 2
}

case "$MODE" in

  # ── PreToolUse: Bash ────────────────────────────────────────────────
  # The agent must never destroy uncommitted work on its own initiative.
  bash)
    CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

    if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+checkout[[:space:]]+(--[[:space:]]+)?\.'; then
      die "BLOCKED: 'git checkout -- .' discards uncommitted work irreversibly.
Use 'git stash push -u -m \"claude-wip: <task>\"' and let the user decide, or stop and report."
    fi

    if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard'; then
      die "BLOCKED: 'git reset --hard' is irreversible. Propose a stash instead and ask the user."
    fi

    if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*[fd]'; then
      die "BLOCKED: 'git clean' deletes untracked files permanently. Ask the user first."
    fi

    if printf '%s' "$CMD" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f|rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r'; then
      die "BLOCKED: recursive force delete. List what you intend to remove and ask the user."
    fi

    # Force-push to shared branches
    if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+push.*(--force|-f)([[:space:]]|$)'; then
      die "BLOCKED: force push. Not an agent decision."
    fi

    exit 0
    ;;

  # ── PreToolUse: Write|Edit ─────────────────────────────────────────
  # Generated code is owned by the schema, not by the agent.
  write)
    FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')"

    case "$FILE" in
      */src/shared/api/generated/*)
        die "BLOCKED: src/shared/api/generated/ is generated from the OpenAPI schema.
Edit the Django serializer, then run 'pnpm api:generate'." ;;
      */pnpm-lock.yaml)
        die "BLOCKED: do not hand-edit pnpm-lock.yaml. Adding a dependency requires user approval first." ;;
      */.env|*/.env.*)
        die "BLOCKED: environment files are not agent-editable." ;;
    esac

    exit 0
    ;;

  # ── PostToolUse: Write|Edit ────────────────────────────────────────
  # Cannot undo the write, but feeds violations straight back to the agent.
  scan)
    FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')"
    [ -f "$FILE" ] || exit 0

    # Only application source; tests and mocks are exempt.
    case "$FILE" in
      */src/*.ts|*/src/*.tsx) ;;
      *) exit 0 ;;
    esac
    case "$FILE" in
      *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/mocks/*) exit 0 ;;
    esac

    VIOLATIONS=""

    # shared/lib/storage.ts is the sole allowlisted Web Storage entry point
    # (CLAUDE.md §3/§10) — every other file must go through it.
    case "$FILE" in
      */src/shared/lib/storage.ts) ;;
      *)
        if grep -nE '\b(localStorage|sessionStorage|indexedDB)\b' "$FILE" >/dev/null 2>&1; then
          VIOLATIONS+="P0 — browser storage is forbidden outside shared/lib/storage.ts's allowlist wrapper (CLAUDE.md §3):
$(grep -nE '\b(localStorage|sessionStorage|indexedDB)\b' "$FILE")

"
        fi
        ;;
    esac

    if grep -nE 'console\.(log|debug|info)\(' "$FILE" >/dev/null 2>&1; then
      VIOLATIONS+="P0 — console output survives into the production bundle and may carry PHI:
$(grep -nE 'console\.(log|debug|info)\(' "$FILE")

"
    fi

    # Hardcoded colours bypass the design token system.
    if grep -nE '(bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]' "$FILE" >/dev/null 2>&1; then
      VIOLATIONS+="P3 — hardcoded colour. Use @theme tokens (bg-accent, text-secondary, ...):
$(grep -nE '(bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]' "$FILE")

"
    fi

    if grep -nE '@ts-ignore' "$FILE" >/dev/null 2>&1; then
      VIOLATIONS+="P2 — @ts-ignore is forbidden. Use @ts-expect-error with a reason, or narrow the type.

"
    fi

    if [ -n "$VIOLATIONS" ]; then
      die "CLAUDE.md violations in $FILE:

$VIOLATIONS Fix these before continuing."
    fi

    exit 0
    ;;

  # ── Stop: completion gate ──────────────────────────────────────────
  # This is what makes "I verified it" impossible to fake: the check runs
  # in the shell, not in the model.
  stop)
    # Prevent an infinite stop -> continue -> stop loop.
    ACTIVE="$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false')"
    [ "$ACTIVE" = "true" ] && exit 0

    # Nothing touched under src/ means nothing to verify.
    if [ -z "$(git status --porcelain -- src 2>/dev/null)" ]; then
      exit 0
    fi

    OUT="$(pnpm verify 2>&1)"
    STATUS=$?

    if [ $STATUS -ne 0 ]; then
      die "'pnpm verify' FAILED — the task is not complete.

$(printf '%s' "$OUT" | tail -n 60)

Fix the failures. Max 2 attempts, then stop and report per CLAUDE.md §8."
    fi

    exit 0
    ;;

  *)
    echo "guard.sh: unknown mode '${MODE}'" >&2
    exit 1
    ;;
esac
