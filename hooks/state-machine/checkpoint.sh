#!/bin/bash
# ============================================================================
# Stop/SubagentStop Hook: 结果检查点
# ============================================================================
#
# 设计原理：
#   - 不控制过程（Claude 可以用任何方式干活）
#   - 只在"里程碑"验证结果
#   - 结果不对？不让过
#
# 检查点：
#   CP1: PRD/DoD 存在
#   CP2: 代码能编译
#   CP3: 测试通过
#   CP4: PR 状态正常
#
# ============================================================================

set -euo pipefail

INPUT=$(cat)

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# 只在 cp-* 或 feature/* 分支生效
if [[ ! "$BRANCH" =~ ^(cp-|feature/) ]]; then
    exit 0
fi

# 防止无限循环
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
    exit 0
fi

# ============================================================================
# 检查点验证函数
# ============================================================================

# CP1: PRD/DoD 存在且有内容
checkpoint_prd_dod() {
    local prd_ok=false
    local dod_ok=false

    for f in "$PROJECT_ROOT/docs/PRD.md" "$PROJECT_ROOT/PRD.md"; do
        if [[ -f "$f" ]] && [[ $(wc -c < "$f") -gt 100 ]]; then
            prd_ok=true
            break
        fi
    done

    for f in "$PROJECT_ROOT/docs/DoD.md" "$PROJECT_ROOT/DoD.md"; do
        if [[ -f "$f" ]] && [[ $(wc -c < "$f") -gt 50 ]]; then
            dod_ok=true
            break
        fi
    done

    if [[ "$prd_ok" == "true" && "$dod_ok" == "true" ]]; then
        return 0
    fi
    return 1
}

# CP2: 代码能编译
checkpoint_typecheck() {
    cd "$PROJECT_ROOT"

    if [[ ! -f "package.json" ]]; then
        return 0  # 没有 package.json，跳过
    fi

    if ! grep -q '"typecheck"' package.json; then
        return 0  # 没有 typecheck script，跳过
    fi

    if npm run typecheck >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# CP3: 测试通过
checkpoint_test() {
    cd "$PROJECT_ROOT"

    if [[ ! -f "package.json" ]]; then
        return 0
    fi

    if ! grep -q '"test"' package.json; then
        return 0
    fi

    if npm test >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# CP4: lint 通过
checkpoint_lint() {
    cd "$PROJECT_ROOT"

    if [[ ! -f "package.json" ]]; then
        return 0
    fi

    if ! grep -q '"lint"' package.json; then
        return 0
    fi

    if npm run lint >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# ============================================================================
# 阻止函数
# ============================================================================

block() {
    local cp="$1"
    local reason="$2"
    local cmd="$3"

    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  CHECKPOINT $cp: 验证失败" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  原因: $reason" >&2
    echo "  验证命令: $cmd" >&2
    echo "" >&2
    echo "  这是结果检查，不是过程控制。" >&2
    echo "  你可以用任何方式工作，但结果必须满足条件。" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
}

# ============================================================================
# 主逻辑：运行所有检查点
# ============================================================================

echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  CHECKPOINT: 验证中..." >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

# CP1: PRD/DoD
echo -n "  CP1 PRD/DoD... " >&2
if checkpoint_prd_dod; then
    echo "✅" >&2
else
    echo "❌" >&2
    block "1" "PRD 或 DoD 不存在/内容不足" "test -f docs/PRD.md && wc -c < docs/PRD.md"
fi

# CP2: Typecheck
echo -n "  CP2 Typecheck... " >&2
if checkpoint_typecheck; then
    echo "✅" >&2
else
    echo "❌" >&2
    block "2" "代码编译失败" "npm run typecheck"
fi

# CP3: Test
echo -n "  CP3 Test... " >&2
if checkpoint_test; then
    echo "✅" >&2
else
    echo "❌" >&2
    block "3" "测试失败" "npm test"
fi

# CP4: Lint
echo -n "  CP4 Lint... " >&2
if checkpoint_lint; then
    echo "✅" >&2
else
    echo "❌" >&2
    block "4" "Lint 失败" "npm run lint"
fi

echo "" >&2
echo "  所有检查点通过 ✅" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

exit 0
