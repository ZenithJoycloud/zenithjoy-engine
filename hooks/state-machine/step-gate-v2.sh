#!/bin/bash
# ============================================================================
# PreToolUse Hook: 步骤关卡 V2（每一步都真实验证）
# ============================================================================
#
# 核心原理：
#   - 每一步都有"真实验证"，不是检查状态变量
#   - 验证的是：文件内容、git 状态、测试结果
#   - Claude 无法伪造这些真实状态
#
# 步骤流程：
#   Step 1: 分支创建 → 验证：git branch 存在
#   Step 2: PRD → 验证：PRD.md 存在且 > 100 字符
#   Step 3: DoD → 验证：DoD.md 存在且 > 50 字符
#   Step 4: 写代码 → 验证：Step 2+3 通过
#   Step 5: 写测试 → 验证：有代码改动
#   Step 6: 本地测试 → 验证：有测试文件
#   Step 7: 提 PR → 验证：npm test 通过
#
# ============================================================================

set -e

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty' 2>/dev/null)

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# 只在 cp-* 或 feature/* 分支生效
if [[ ! "$BRANCH" =~ ^(cp-|feature/) ]]; then
    exit 0
fi

# ============================================================================
# 真实验证函数（不可伪造）
# ============================================================================

# 验证 PRD 存在且有内容（>100字符）
verify_prd() {
    local prd_file=""
    for f in "$PROJECT_ROOT/docs/PRD.md" "$PROJECT_ROOT/PRD.md" "$PROJECT_ROOT/.claude/PRD.md"; do
        if [[ -f "$f" ]]; then
            prd_file="$f"
            break
        fi
    done

    if [[ -z "$prd_file" ]]; then
        return 1
    fi

    # 检查内容长度（去掉空白后 > 100 字符）
    local content_length=$(cat "$prd_file" | tr -d '[:space:]' | wc -c)
    if [[ "$content_length" -lt 100 ]]; then
        return 1
    fi

    return 0
}

# 验证 DoD 存在且有内容（>50字符）
verify_dod() {
    local dod_file=""
    for f in "$PROJECT_ROOT/docs/DoD.md" "$PROJECT_ROOT/DoD.md" "$PROJECT_ROOT/.claude/DoD.md"; do
        if [[ -f "$f" ]]; then
            dod_file="$f"
            break
        fi
    done

    if [[ -z "$dod_file" ]]; then
        return 1
    fi

    local content_length=$(cat "$dod_file" | tr -d '[:space:]' | wc -c)
    if [[ "$content_length" -lt 50 ]]; then
        return 1
    fi

    return 0
}

# 验证有代码改动
verify_code_changes() {
    local changes=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py|go|rs)$' | grep -v '\.test\.' | grep -v '\.spec\.' | head -1)
    if [[ -n "$changes" ]]; then
        return 0
    fi

    # 也检查暂存区
    changes=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py|go|rs)$' | grep -v '\.test\.' | grep -v '\.spec\.' | head -1)
    if [[ -n "$changes" ]]; then
        return 0
    fi

    return 1
}

# 验证有测试文件
verify_test_files() {
    local tests=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | head -1)
    if [[ -n "$tests" ]]; then
        return 0
    fi

    tests=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$' | head -1)
    if [[ -n "$tests" ]]; then
        return 0
    fi

    return 1
}

# 验证 npm test 通过
verify_tests_pass() {
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        return 0
    fi

    if ! grep -q '"test"' "$PROJECT_ROOT/package.json"; then
        return 0
    fi

    cd "$PROJECT_ROOT"
    if npm test >/dev/null 2>&1; then
        return 0
    fi

    return 1
}

# ============================================================================
# 阻止函数
# ============================================================================

block() {
    local step="$1"
    local reason="$2"
    local hint="$3"

    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  STEP GATE V2: 关卡 $step 未通过" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  原因: $reason" >&2
    echo "" >&2
    echo "  需要: $hint" >&2
    echo "" >&2
    echo "  这是真实验证（检查文件/git/测试），不是状态变量。" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
}

# ============================================================================
# 判断当前操作属于哪个步骤
# ============================================================================

get_operation_step() {
    local tool="$1"
    local input="$2"

    if [[ "$tool" == "Write" || "$tool" == "Edit" ]]; then
        local file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null)

        # PRD/DoD 文件 → Step 2/3（允许）
        if [[ "$file_path" =~ (PRD|DoD)\.md$ ]]; then
            echo "prd_dod"
            return
        fi

        # 测试文件 → Step 5
        if [[ "$file_path" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]]; then
            echo "test"
            return
        fi

        # 代码文件 → Step 4
        if [[ "$file_path" =~ \.(ts|tsx|js|jsx|py|go|rs|java)$ ]]; then
            echo "code"
            return
        fi
    fi

    if [[ "$tool" == "Bash" ]]; then
        local cmd=$(echo "$input" | jq -r '.command // empty' 2>/dev/null)

        # npm test → Step 6
        if [[ "$cmd" =~ npm[[:space:]]+test ]]; then
            echo "run_test"
            return
        fi

        # gh pr create → Step 7
        if [[ "$cmd" =~ gh[[:space:]]+pr[[:space:]]+create ]]; then
            echo "create_pr"
            return
        fi

        # 检查是否在写代码文件（用 echo/cat 等）
        if [[ "$cmd" =~ \.(ts|tsx|js|jsx|py|go|rs|java) ]] && [[ "$cmd" =~ (\>|echo|cat|tee) ]]; then
            if [[ "$cmd" =~ \.(test|spec)\. ]]; then
                echo "test"
            else
                echo "code"
            fi
            return
        fi
    fi

    echo "other"
}

# ============================================================================
# 主逻辑
# ============================================================================

OPERATION=$(get_operation_step "$TOOL_NAME" "$TOOL_INPUT")

case "$OPERATION" in
    "prd_dod")
        # 写 PRD/DoD 总是允许
        exit 0
        ;;

    "code")
        # 写代码 → 需要 PRD + DoD 都验证通过
        if ! verify_prd; then
            block "4" "PRD 未完成" "创建 PRD.md 且内容 > 100 字符"
        fi
        if ! verify_dod; then
            block "4" "DoD 未完成" "创建 DoD.md 且内容 > 50 字符"
        fi
        exit 0
        ;;

    "test")
        # 写测试 → 需要有代码改动
        if ! verify_prd; then
            block "5" "PRD 未完成" "先完成 PRD"
        fi
        if ! verify_dod; then
            block "5" "DoD 未完成" "先完成 DoD"
        fi
        # 注：不强制要求有代码改动，因为可能是先写测试
        exit 0
        ;;

    "run_test")
        # 跑测试 → 允许（这是验证步骤）
        exit 0
        ;;

    "create_pr")
        # 提 PR → 需要测试通过
        if ! verify_prd; then
            block "7" "PRD 未完成" "先完成 PRD"
        fi
        if ! verify_dod; then
            block "7" "DoD 未完成" "先完成 DoD"
        fi
        if ! verify_tests_pass; then
            block "7" "测试未通过" "运行 npm test 并确保通过"
        fi
        exit 0
        ;;

    *)
        # 其他操作放行
        exit 0
        ;;
esac
