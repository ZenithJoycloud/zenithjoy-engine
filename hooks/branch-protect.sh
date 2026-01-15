#!/bin/bash
# ZenithJoy Core - 分支保护 Hook v2.0
# 强制流程：只有在 checkpoint 分支 (cp-*) 才能写代码

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name (Claude Code 用 tool_name)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .operation // empty')

# Only check Write/Edit operations
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
fi

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

# Allow non-code files (config, docs, scripts)
case "$EXT" in
    md|json|txt|yml|yaml|sh|toml|ini|env)
        exit 0
        ;;
esac

# Get current git branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# No git = allow (not a git repo)
if [[ -z "$CURRENT_BRANCH" ]]; then
    exit 0
fi

# ✅ Checkpoint branch (cp-*) = ALLOW
if [[ "$CURRENT_BRANCH" =~ ^cp- ]]; then
    exit 0
fi

# ❌ All other branches = BLOCK
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  ❌ 只能在 checkpoint 分支写代码" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2
echo "当前分支: $CURRENT_BRANCH" >&2
echo "目标文件: $FILE_PATH" >&2
echo "" >&2
echo "正确流程:" >&2
echo "  1. 运行 /new-task 创建 checkpoint 分支" >&2
echo "  2. 在 cp-xxx 分支上开发" >&2
echo "  3. 运行 /finish 完成任务" >&2
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
exit 2
