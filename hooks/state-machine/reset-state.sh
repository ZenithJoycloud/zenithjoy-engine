#!/bin/bash
# ============================================================================
# 辅助脚本：重置状态文件
# ============================================================================

STATE_FILE="/tmp/claude-workflow-state.json"

cat > "$STATE_FILE" << EOF
{
    "session_id": "$(date +%s)",
    "started_at": "$(date -Iseconds)",
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

echo "✅ 状态已重置: $STATE_FILE"
cat "$STATE_FILE" | jq .
