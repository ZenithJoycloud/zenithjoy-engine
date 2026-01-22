#!/usr/bin/env bash
# SessionStart Hook - 会话开始时强制引导 /dev
#
# 触发时机：
# - 新会话开始
# - 恢复旧会话 (--resume, --continue)
# - /clear 命令后
# - compact 后
#
# 输出会被 Claude 看到，用于引导流程

set -euo pipefail

# 获取当前状态
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# 检测是否有未完成的开发任务
HAS_DOD=false
HAS_PR=false
CI_STATUS=""

if [[ -f "$PROJECT_ROOT/.dod.md" ]]; then
    HAS_DOD=true
fi

if [[ "$CURRENT_BRANCH" =~ ^(cp-|feature/) ]]; then
    PR_NUMBER=$(gh pr list --head "$CURRENT_BRANCH" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
    if [[ -n "$PR_NUMBER" ]]; then
        HAS_PR=true
        CI_STATUS=$(gh pr checks "$PR_NUMBER" 2>/dev/null | grep -q "fail" && echo "red" || echo "green")
    fi
fi

# 输出状态给 Claude
cat << EOF
[SESSION_START]
项目: $PROJECT_NAME
分支: $CURRENT_BRANCH
DoD: $([ "$HAS_DOD" = true ] && echo "存在" || echo "无")
PR: $([ "$HAS_PR" = true ] && echo "#$PR_NUMBER ($CI_STATUS)" || echo "无")

[SKILL_REQUIRED: dev]
请运行 /dev skill 开始或继续开发流程。/dev 会自动检测当前状态并引导你。
EOF
