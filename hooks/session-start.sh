#!/usr/bin/env bash
# SessionStart Hook - 会话开始时引导 /dev
#
# 简单提示，不做复杂检测（检测逻辑在 /dev 里）
# P1 修复: 输出到 stderr，防止 Hook 框架误解析 stdout

echo "[SKILL_REQUIRED: dev]" >&2
echo "请运行 /dev skill 开始开发流程。/dev 会自动检测状态并引导你。" >&2
