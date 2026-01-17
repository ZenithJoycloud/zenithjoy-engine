#!/bin/bash
# ============================================================================
# PostToolUse Hook: 真实执行状态追踪器
# ============================================================================
#
# 核心原理：Claude 可以撒谎说"测试跑过了"，但它无法伪造 PostToolUse 的输出
# 因为 PostToolUse 在工具执行后触发，拿到的是真实的执行结果
#
# ============================================================================

set -e

# 状态文件位置
STATE_FILE="/tmp/claude-workflow-state.json"

# 签名密钥（只有 hook 知道）
SIGN_KEY="hook-secret-$(hostname)-$$"

# 初始化状态文件（如果不存在）
init_state_file() {
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" << 'EOF'
{
    "session_id": "",
    "started_at": "",
    "checks": {
        "tests_executed": false,
        "tests_passed": false,
        "lint_executed": false,
        "lint_passed": false,
        "typecheck_executed": false,
        "typecheck_passed": false,
        "build_executed": false,
        "build_passed": false
    },
    "history": []
}
EOF
    fi
}

# 更新状态
update_state() {
    local key="$1"
    local value="$2"

    local tmp_file=$(mktemp)
    jq --arg key "$key" --argjson value "$value" \
        '.checks[$key] = $value' "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

# 添加历史记录
add_history() {
    local action="$1"
    local result="$2"
    local timestamp=$(date -Iseconds)

    local tmp_file=$(mktemp)
    jq --arg action "$action" --arg result "$result" --arg ts "$timestamp" \
        '.history += [{"action": $action, "result": $result, "timestamp": $ts}]' \
        "$STATE_FILE" > "$tmp_file" && mv "$tmp_file" "$STATE_FILE"
}

# 重置状态（篡改检测时使用）
reset_state() {
    cat > "$STATE_FILE" << 'EOF'
{
    "session_id": "",
    "started_at": "",
    "checks": {
        "tests_executed": false,
        "tests_passed": false,
        "lint_executed": false,
        "lint_passed": false,
        "typecheck_executed": false,
        "typecheck_passed": false,
        "build_executed": false,
        "build_passed": false
    },
    "history": [],
    "tamper_detected": true
}
EOF
}

# 检测是否是合法的测试命令
is_legitimate_test_command() {
    local cmd="$1"
    if [[ "$cmd" =~ (npm[[:space:]]+(test|run[[:space:]]+(test|lint|typecheck|build))|vitest|jest|mocha|eslint|biome|tsc|vite[[:space:]]+build|next[[:space:]]+build) ]]; then
        return 0
    fi
    return 1
}

# ============================================================================
# 主逻辑
# ============================================================================

# 读取 stdin（PostToolUse 的输入）
INPUT=$(cat)

# 检查是否是 Bash 工具
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
if [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
fi

# 初始化状态文件
init_state_file

# 获取命令和输出
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_output.exit_code // 0' 2>/dev/null)

# ============================================================================
# 篡改检测：如果命令涉及状态文件且不是合法测试命令 → 重置状态
# ============================================================================
if [[ "$COMMAND" == *"claude-workflow-state"* ]] || \
   [[ "$COMMAND" == *"$STATE_FILE"* ]] || \
   [[ "$COMMAND" == *"/tmp/"*".json"* && "$COMMAND" == *"test"* ]] || \
   [[ "$COMMAND" == *"tests_passed"* ]] || \
   [[ "$COMMAND" == *"tests_executed"* ]]; then

    if ! is_legitimate_test_command "$COMMAND"; then
        # 检测到篡改尝试！重置状态
        reset_state
        add_history "TAMPER_DETECTED" "command: ${COMMAND:0:100}"
        exit 0
    fi
fi

# ============================================================================
# 检测各种操作并记录真实结果
# ============================================================================

# 检测 npm test
if [[ "$COMMAND" =~ (npm[[:space:]]+test|npm[[:space:]]+run[[:space:]]+test|vitest|jest|mocha) ]]; then
    update_state "tests_executed" "true"

    if [[ "$EXIT_CODE" -eq 0 ]]; then
        update_state "tests_passed" "true"
        add_history "npm_test" "passed"
    else
        update_state "tests_passed" "false"
        add_history "npm_test" "failed"
    fi
fi

# 检测 lint
if [[ "$COMMAND" =~ (npm[[:space:]]+run[[:space:]]+lint|eslint|biome[[:space:]]+check) ]]; then
    update_state "lint_executed" "true"

    if [[ "$EXIT_CODE" -eq 0 ]]; then
        update_state "lint_passed" "true"
        add_history "lint" "passed"
    else
        update_state "lint_passed" "false"
        add_history "lint" "failed"
    fi
fi

# 检测 typecheck
if [[ "$COMMAND" =~ (npm[[:space:]]+run[[:space:]]+typecheck|tsc[[:space:]]+(--noEmit|-b)|npx[[:space:]]+tsc) ]]; then
    update_state "typecheck_executed" "true"

    if [[ "$EXIT_CODE" -eq 0 ]]; then
        update_state "typecheck_passed" "true"
        add_history "typecheck" "passed"
    else
        update_state "typecheck_passed" "false"
        add_history "typecheck" "failed"
    fi
fi

# 检测 build
if [[ "$COMMAND" =~ (npm[[:space:]]+run[[:space:]]+build|vite[[:space:]]+build|next[[:space:]]+build) ]]; then
    update_state "build_executed" "true"

    if [[ "$EXIT_CODE" -eq 0 ]]; then
        update_state "build_passed" "true"
        add_history "build" "passed"
    else
        update_state "build_passed" "false"
        add_history "build" "failed"
    fi
fi

exit 0
