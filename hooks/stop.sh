#!/usr/bin/env bash
# ============================================================================
# Stop Hook: 质检门控
# ============================================================================
# 会话结束前检查质检是否通过
# 如果质检未通过，阻止会话结束，强制 AI 继续 Retry Loop
# ============================================================================

set -euo pipefail

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

# ===== 检查质检门控文件 =====
QUALITY_GATE_FILE="$PROJECT_ROOT/.quality-gate-passed"

echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  [Stop Hook: 质检门控]" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "" >&2
echo "  分支: $CURRENT_BRANCH" >&2
echo "" >&2

if [[ ! -f "$QUALITY_GATE_FILE" ]]; then
    echo "  ❌ 质检未通过！" >&2
    echo "" >&2
    echo "  找不到质检门控文件: .quality-gate-passed" >&2
    echo "" >&2
    echo "  你需要:" >&2
    echo "    1. 运行质检: npm run qa" >&2
    echo "    2. 修复所有失败的测试" >&2
    echo "    3. 确保生成 .quality-gate-passed 文件" >&2
    echo "" >&2
    echo "  如果测试失败，请修复后重新运行 npm run qa" >&2
    echo "  (Retry Loop: 失败 → 修复 → 再试，直到通过)" >&2
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

    # exit 2: 阻止会话结束
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

# ===== 质检通过 =====
echo "  ✅ 质检已通过！" >&2
echo "" >&2
echo "  质检时间: $(date -d @$GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $GATE_MTIME '+%Y-%m-%d %H:%M:%S' 2>/dev/null)" >&2
echo "" >&2
echo "  下一步: 创建 PR" >&2
echo "    gh pr create --title \"...\" --body \"...\"" >&2
echo "" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

# exit 0: 允许会话结束
exit 0
