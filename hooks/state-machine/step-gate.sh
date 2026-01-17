#!/bin/bash
# ============================================================================
# PreToolUse Hook: 步骤关卡（每一步都验证）
# ============================================================================
#
# 核心原理：
#   - 不看任何状态文件（Claude 可以篡改）
#   - 自己检查真实条件（文件存在、测试通过等）
#   - 条件不满足？阻止操作
#
# 关卡设计：
#   想写代码 → PRD.md + DoD.md 必须存在
#   想提 PR  → npm test 必须通过
#
# ============================================================================

set -e

# 读取输入
INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty' 2>/dev/null)

# 获取项目根目录
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# 获取当前分支
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# ============================================================================
# 辅助函数
# ============================================================================

block_with_message() {
    local msg="$1"
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  STEP GATE: 关卡未通过" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  $msg" >&2
    echo "" >&2
    echo "  这是真实检查，不是看状态文件。" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    exit 2
}

# ============================================================================
# 关卡 1: 写代码前必须有 PRD + DoD
# ============================================================================

check_before_write_code() {
    local file_path="$1"

    # 只检查代码文件（.ts, .tsx, .js, .jsx, .py 等）
    if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx|py|go|rs|java)$ ]]; then
        return 0
    fi

    # 排除测试文件
    if [[ "$file_path" =~ \.(test|spec)\. ]]; then
        return 0
    fi

    # 排除配置文件
    if [[ "$file_path" =~ (config|\.config\.) ]]; then
        return 0
    fi

    # 检查 PRD 文件
    local prd_exists=false
    if [[ -f "$PROJECT_ROOT/docs/PRD.md" ]] || \
       [[ -f "$PROJECT_ROOT/PRD.md" ]] || \
       [[ -f "$PROJECT_ROOT/.claude/PRD.md" ]]; then
        prd_exists=true
    fi

    # 检查 DoD 文件
    local dod_exists=false
    if [[ -f "$PROJECT_ROOT/docs/DoD.md" ]] || \
       [[ -f "$PROJECT_ROOT/DoD.md" ]] || \
       [[ -f "$PROJECT_ROOT/.claude/DoD.md" ]]; then
        dod_exists=true
    fi

    # 也接受 PRD 和 DoD 写在 git config 里（但我们自己读取验证）
    local prd_in_config=$(git config --get branch."$BRANCH".prd 2>/dev/null || echo "")
    local dod_in_config=$(git config --get branch."$BRANCH".dod 2>/dev/null || echo "")

    if [[ -n "$prd_in_config" ]]; then
        prd_exists=true
    fi
    if [[ -n "$dod_in_config" ]]; then
        dod_exists=true
    fi

    if [[ "$prd_exists" != "true" ]]; then
        block_with_message "想写代码？先写 PRD！

  我检查了这些位置，都没找到 PRD：
    - $PROJECT_ROOT/docs/PRD.md
    - $PROJECT_ROOT/PRD.md
    - git config branch.$BRANCH.prd

  请先完成 Step 2（PRD）再写代码。"
    fi

    if [[ "$dod_exists" != "true" ]]; then
        block_with_message "想写代码？先写 DoD！

  我检查了这些位置，都没找到 DoD：
    - $PROJECT_ROOT/docs/DoD.md
    - $PROJECT_ROOT/DoD.md
    - git config branch.$BRANCH.dod

  请先完成 Step 3（DoD）再写代码。"
    fi

    return 0
}

# ============================================================================
# 关卡 2: 提 PR 前必须测试通过
# ============================================================================

check_before_pr() {
    local command="$1"

    if [[ "$command" != *"gh pr create"* ]]; then
        return 0
    fi

    # 自己跑测试
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if grep -q '"test"' "$PROJECT_ROOT/package.json"; then
            cd "$PROJECT_ROOT"
            if ! npm test >/dev/null 2>&1; then
                block_with_message "想提 PR？测试没过！

  我自己跑了 npm test，失败了。

  请先修复测试再提 PR。"
            fi
        fi
    fi

    return 0
}

# ============================================================================
# 主逻辑
# ============================================================================

# 只在 cp-* 或 feature/* 分支生效
if [[ ! "$BRANCH" =~ ^(cp-|feature/) ]]; then
    exit 0
fi

# 处理 Write 工具
if [[ "$TOOL_NAME" == "Write" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
    check_before_write_code "$FILE_PATH"
fi

# 处理 Edit 工具
if [[ "$TOOL_NAME" == "Edit" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
    check_before_write_code "$FILE_PATH"
fi

# 处理 Bash 工具
if [[ "$TOOL_NAME" == "Bash" ]]; then
    COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

    # 检查是否用 Bash 写代码文件（绕过 Write 工具）
    if [[ "$COMMAND" =~ \.(ts|tsx|js|jsx|py|go|rs|java)[[:space:]]*$ ]] || \
       [[ "$COMMAND" =~ \.(ts|tsx|js|jsx|py|go|rs|java)\" ]] || \
       [[ "$COMMAND" =~ \.(ts|tsx|js|jsx|py|go|rs|java)\' ]]; then
        # 检查是否是写入操作
        if [[ "$COMMAND" =~ (\>|echo|cat|tee|printf) ]]; then
            # 触发代码写入检查
            check_before_write_code "dummy.ts"
        fi
    fi

    # 检查 PR
    check_before_pr "$COMMAND"
fi

exit 0
