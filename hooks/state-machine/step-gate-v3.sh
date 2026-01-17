#!/bin/bash
# ============================================================================
# PreToolUse Hook: 步骤关卡 V3（每一步都跑验证命令）
# ============================================================================
#
# 核心原理：
#   - 每一步都有验证命令
#   - 命令不过 → 卡住，不让进入下一步
#   - 100% 可靠，因为是真正执行验证
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
# 验证命令（每一步的关卡）
# ============================================================================

# Step 1: 验证分支已创建
verify_step1() {
    if git branch --list | grep -q "$BRANCH"; then
        return 0
    fi
    return 1
}

# Step 2: 验证 PRD（跑检查脚本）
verify_step2() {
    local prd_file=""
    for f in "$PROJECT_ROOT/docs/PRD.md" "$PROJECT_ROOT/PRD.md"; do
        [[ -f "$f" ]] && prd_file="$f" && break
    done

    [[ -z "$prd_file" ]] && return 1

    # 检查：文件存在 + 有标题 + 内容 > 100 字符
    if grep -q "^#" "$prd_file" && [[ $(wc -c < "$prd_file") -gt 100 ]]; then
        return 0
    fi
    return 1
}

# Step 3: 验证 DoD（跑检查脚本）
verify_step3() {
    local dod_file=""
    for f in "$PROJECT_ROOT/docs/DoD.md" "$PROJECT_ROOT/DoD.md"; do
        [[ -f "$f" ]] && dod_file="$f" && break
    done

    [[ -z "$dod_file" ]] && return 1

    # 检查：文件存在 + 有 checkbox + 内容 > 50 字符
    if grep -qE "^-\s*\[" "$dod_file" && [[ $(wc -c < "$dod_file") -gt 50 ]]; then
        return 0
    fi
    return 1
}

# Step 4: 验证代码能编译
verify_step4() {
    cd "$PROJECT_ROOT"

    # 有 package.json 且有 typecheck 脚本
    if [[ -f "package.json" ]] && grep -q '"typecheck"' package.json; then
        if npm run typecheck >/dev/null 2>&1; then
            return 0
        fi
        return 1
    fi

    # 没有 typecheck，默认通过
    return 0
}

# Step 5: 验证有测试文件
verify_step5() {
    # 检查是否有测试文件改动
    local test_files=$(find "$PROJECT_ROOT/src" "$PROJECT_ROOT/tests" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | head -1)
    [[ -n "$test_files" ]] && return 0

    # 或者 git diff 里有测试文件
    git diff --name-only HEAD 2>/dev/null | grep -qE '\.(test|spec)\.' && return 0
    git diff --cached --name-only 2>/dev/null | grep -qE '\.(test|spec)\.' && return 0

    return 1
}

# Step 6: 验证测试通过
verify_step6() {
    cd "$PROJECT_ROOT"

    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        if npm test >/dev/null 2>&1; then
            return 0
        fi
        return 1
    fi

    return 0
}

# Step 7: 验证可以提 PR（测试 + lint 都过）
verify_step7() {
    cd "$PROJECT_ROOT"

    # 测试必须过
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        if ! npm test >/dev/null 2>&1; then
            return 1
        fi
    fi

    # lint 必须过（如果有）
    if [[ -f "package.json" ]] && grep -q '"lint"' package.json; then
        if ! npm run lint >/dev/null 2>&1; then
            return 1
        fi
    fi

    return 0
}

# ============================================================================
# 阻止函数
# ============================================================================

block() {
    local step="$1"
    local failed_check="$2"
    local hint="$3"

    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  STEP GATE V3: Step $step 验证失败" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  验证命令: $failed_check" >&2
    echo "  结果: 未通过" >&2
    echo "" >&2
    echo "  需要: $hint" >&2
    echo "" >&2
    echo "  这是真正执行验证命令，不是检查状态变量。" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
}

# ============================================================================
# 判断操作类型
# ============================================================================

get_operation() {
    local tool="$1"
    local input="$2"

    if [[ "$tool" == "Write" || "$tool" == "Edit" ]]; then
        local file_path=$(echo "$input" | jq -r '.file_path // empty' 2>/dev/null)

        [[ "$file_path" =~ PRD\.md$ ]] && echo "write_prd" && return
        [[ "$file_path" =~ DoD\.md$ ]] && echo "write_dod" && return
        [[ "$file_path" =~ \.(test|spec)\. ]] && echo "write_test" && return
        [[ "$file_path" =~ \.(ts|tsx|js|jsx|py|go|rs|java)$ ]] && echo "write_code" && return
    fi

    if [[ "$tool" == "Bash" ]]; then
        local cmd=$(echo "$input" | jq -r '.command // empty' 2>/dev/null)

        [[ "$cmd" =~ gh[[:space:]]+pr[[:space:]]+create ]] && echo "create_pr" && return
        [[ "$cmd" =~ npm[[:space:]]+test ]] && echo "run_test" && return

        # Bash 写代码文件
        if [[ "$cmd" =~ \.(ts|tsx|js|jsx|py|go|rs|java) ]] && [[ "$cmd" =~ (\>|echo|cat|tee) ]]; then
            [[ "$cmd" =~ \.(test|spec)\. ]] && echo "write_test" && return
            echo "write_code" && return
        fi
    fi

    echo "other"
}

# ============================================================================
# 主逻辑：每个操作前跑对应的验证命令
# ============================================================================

OP=$(get_operation "$TOOL_NAME" "$TOOL_INPUT")

case "$OP" in
    "write_prd"|"write_dod")
        # 写 PRD/DoD 需要 Step 1 通过
        if ! verify_step1; then
            block "1" "git branch 检查" "先创建 cp-* 分支"
        fi
        ;;

    "write_code")
        # 写代码需要 Step 2, 3 通过
        if ! verify_step2; then
            block "2" "PRD 检查" "创建 PRD.md，包含标题，内容 > 100 字符"
        fi
        if ! verify_step3; then
            block "3" "DoD 检查" "创建 DoD.md，包含 checkbox (- [ ])，内容 > 50 字符"
        fi
        ;;

    "write_test")
        # 写测试需要 Step 2, 3, 4 通过
        if ! verify_step2; then
            block "2" "PRD 检查" "先完成 PRD"
        fi
        if ! verify_step3; then
            block "3" "DoD 检查" "先完成 DoD"
        fi
        # Step 4 (typecheck) 可选，不强制
        ;;

    "run_test")
        # 跑测试：放行（这本身就是验证步骤）
        ;;

    "create_pr")
        # 提 PR 需要所有步骤通过
        if ! verify_step2; then
            block "2" "PRD 检查" "先完成 PRD"
        fi
        if ! verify_step3; then
            block "3" "DoD 检查" "先完成 DoD"
        fi
        if ! verify_step6; then
            block "6" "npm test" "测试必须通过"
        fi
        if ! verify_step7; then
            block "7" "npm test + lint" "测试和 lint 都必须通过"
        fi
        ;;

    *)
        # 其他操作放行
        ;;
esac

exit 0
