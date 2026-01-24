#!/usr/bin/env bash
# ============================================================================
# Stop Hook: 质检门控
# ============================================================================
# 会话结束前检查质检是否通过
# 如果质检未通过，阻止会话结束，强制 AI 继续 Retry Loop
# ============================================================================
# 防止无限循环: 检查 stop_hook_active 标志
# ============================================================================

set -euo pipefail

# ===== 读取 Hook 输入（JSON） =====
# Stop Hook 接收 JSON 输入，包含 stop_hook_active 等字段
HOOK_INPUT=$(cat)

# ===== 检查是否已经因为 Stop Hook 而继续过一次 =====
# 防止无限循环：如果 stop_hook_active=true，说明已经重试过了
STOP_HOOK_ACTIVE=$(echo "$HOOK_INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo "false")

if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "  [Stop Hook: 防止无限循环]" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "  检测到 stop_hook_active=true" >&2
    echo "  已经重试过一次，允许会话结束（防止无限循环）" >&2
    echo "" >&2
    echo "  如果质检仍未通过，请手动运行:" >&2
    echo "    npm run qa:gate" >&2
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 0  # 允许结束，防止无限循环
fi

# ===== 获取项目根目录 =====
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# ===== 检查是否在 git 仓库中 =====
if ! git rev-parse --git-dir &>/dev/null; then
    exit 0  # 不在 git 仓库，跳过
fi

# ===== 获取当前分支 =====
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [[ -z "$CURRENT_BRANCH" ]]; then
    exit 0  # 无法获取分支，跳过
fi

# ===== 只检查功能分支 =====
if [[ ! "$CURRENT_BRANCH" =~ ^cp- ]] && [[ ! "$CURRENT_BRANCH" =~ ^feature/ ]]; then
    exit 0  # 不是功能分支，跳过（main/develop 可以正常退出）
fi

# ===== Step 7 质检流程检查 =====
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  [Stop Hook: Step 7 质检门控]" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2
echo "  分支: $CURRENT_BRANCH" >&2
echo "" >&2

# ===== Step 7.1: 检查 Audit 报告 (L2A) =====
AUDIT_REPORT="$PROJECT_ROOT/docs/AUDIT-REPORT.md"

if [[ ! -f "$AUDIT_REPORT" ]]; then
    echo "  ❌ Step 7.1: Audit 报告缺失！" >&2
    echo "" >&2
    echo "  找不到: docs/AUDIT-REPORT.md" >&2
    echo "" >&2
    echo "  你需要:" >&2
    echo "    1. 调用 /audit Skill 生成审计报告" >&2
    echo "    2. 或手动创建 docs/AUDIT-REPORT.md" >&2
    echo "" >&2
    echo "  参考: skills/dev/steps/07-quality.md" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
fi

# ===== Step 7.2: 检查 Audit Decision (Blocker) =====
AUDIT_DECISION=$(grep -i "^Decision:" "$AUDIT_REPORT" | head -1 | awk '{print $2}' | tr -d ' \n\r')

if [[ "$AUDIT_DECISION" != "PASS" ]]; then
    echo "  ❌ Step 7.2: Audit 未通过！" >&2
    echo "" >&2
    echo "  当前 Decision: $AUDIT_DECISION" >&2
    echo "" >&2
    echo "  Audit 报告显示有 blocker（L1/L2 问题）" >&2
    echo "" >&2
    echo "  你需要:" >&2
    echo "    1. 查看 docs/AUDIT-REPORT.md 中的 Findings" >&2
    echo "    2. 修复所有 L1 和 L2 问题" >&2
    echo "    3. 重新运行 /audit" >&2
    echo "    4. 确保 Decision: PASS" >&2
    echo "" >&2
    echo "  (Retry Loop: Audit → FAIL → 修复 → 重新审计)" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
fi

echo "  ✅ Step 7.1: Audit 报告存在" >&2
echo "  ✅ Step 7.2: Decision: PASS (无 blocker)" >&2
echo "" >&2

# ===== Step 7.3: 检查自动化测试 (L1) =====
QUALITY_GATE_FILE="$PROJECT_ROOT/.quality-gate-passed"

if [[ ! -f "$QUALITY_GATE_FILE" ]]; then
    echo "  ❌ Step 7.3: 自动化测试未通过！" >&2
    echo "" >&2
    echo "  找不到质检门控文件: .quality-gate-passed" >&2
    echo "" >&2
    echo "  你需要:" >&2
    echo "    1. 运行: npm run qa:gate" >&2
    echo "    2. 确保 typecheck + test + build 全部通过" >&2
    echo "    3. 生成 .quality-gate-passed 文件" >&2
    echo "" >&2
    echo "  如果测试失败，请修复后重新运行 npm run qa:gate" >&2
    echo "  (Retry Loop: 失败 → 修复 → 再试，直到通过)" >&2
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 2
fi

# ===== 检查质检文件时效性 =====
# 确保质检是最新的（代码改动后需要重新质检）

# 获取最新的代码文件修改时间
LATEST_CODE_MTIME=0
while IFS= read -r -d '' file; do
    FILE_MTIME=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null || echo "0")
    if (( FILE_MTIME > LATEST_CODE_MTIME )); then
        LATEST_CODE_MTIME=$FILE_MTIME
    fi
done < <(find "$PROJECT_ROOT/src" "$PROJECT_ROOT/tests" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) -print0 2>/dev/null)

# 获取质检文件修改时间
GATE_MTIME=$(stat -c %Y "$QUALITY_GATE_FILE" 2>/dev/null || stat -f %m "$QUALITY_GATE_FILE" 2>/dev/null || echo "0")

if (( LATEST_CODE_MTIME > GATE_MTIME )); then
    echo "  ⚠️  代码已修改，质检结果过期！" >&2
    echo "" >&2
    echo "  最新代码修改: $(date -d @$LATEST_CODE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $LATEST_CODE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" >&2
    echo "  质检文件时间: $(date -d @$GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" >&2
    echo "" >&2
    echo "  请重新运行质检: npm run qa" >&2
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

    # exit 2: 阻止会话结束
    exit 2
fi

# ===== Step 7 全部通过 =====
echo "  ✅ Step 7.3: 自动化测试通过 (L1)" >&2
echo "" >&2
echo "  质检完成时间: $(date -d @$GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" >&2
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  ✅ Step 7 质检全部通过！" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2
echo "  完成项:" >&2
echo "    ✅ L2A: Audit 审计 (Decision: PASS)" >&2
echo "    ✅ L1: 自动化测试 (typecheck + test + build)" >&2
echo "" >&2
echo "  下一步: Step 8 提交 PR" >&2
echo "    gh pr create --title \"...\" --body \"...\"" >&2
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

# exit 0: 允许会话结束
exit 0
