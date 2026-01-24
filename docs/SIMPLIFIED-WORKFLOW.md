---
id: simplified-workflow
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 1.0.0: 极简工作流 - PreToolUse 入口 + Ralph Loop
---

# 极简工作流

**一句话**: PreToolUse 检查入口，Ralph Loop 自己跑，跑不完不让结束。

---

## 完整流程

```
用户: /ralph-loop "实现功能 X，质检通过后输出 DONE"
    ↓
┌─────────────────────────────────────────────────────────┐
│  PreToolUse:Write/Edit (入口检查) - 只在第一次写文件时  │
├─────────────────────────────────────────────────────────┤
│  hooks/branch-protect.sh 检查:                          │
│    ✅ 正确的 Repository（git 仓库）                      │
│    ✅ 正确的 Branch (cp-* 或 feature/*)                 │
│    ✅ 是否需要 Worktree（并行开发检测）                  │
│    ✅ PRD 存在且有效                                     │
│    ✅ DoD 存在且有效                                     │
│                                                         │
│  不通过 → exit 2 → 阻止写文件                           │
│  通过 → exit 0 → 放行 ✅                                │
└─────────────────────────────────────────────────────────┘
    ↓
┌═════════════════════════════════════════════════════════┐
║  Ralph Loop - 让它自己跑                                ║
╠═════════════════════════════════════════════════════════╣
║  AI 自由发挥:                                           ║
║    - 写代码                                             ║
║    - 写测试                                             ║
║    - 调用 /audit                                        ║
║    - 运行 npm run qa                                    ║
║    - 修复问题                                           ║
║    - 重复直到完成                                       ║
╚═════════════════════════════════════════════════════════╝
    ↓ (每次尝试结束时)
┌─────────────────────────────────────────────────────────┐
│  Stop Hook (质检门控) - 跑不完不让结束                   │
├─────────────────────────────────────────────────────────┤
│  hooks/stop.sh 检查:                                    │
│    ✅ Audit 通过？(Decision: PASS)                      │
│    ✅ 测试通过？(.quality-gate-passed 存在)             │
│                                                         │
│  未完成 → exit 2 → Ralph 继续循环 🔄                    │
│  完成 → exit 0 → Ralph 检测 completion-promise → 结束 ✅│
└─────────────────────────────────────────────────────────┘
```

---

## 两个 Hook 的职责

### Hook 1: PreToolUse:Write/Edit（入口检查）

**时机**: 第一次写文件时

**检查**:
```bash
✅ Repository（在 git 仓库中）
✅ Branch（cp-* 或 feature/*，不能在 main/develop）
✅ Worktree（检测并行开发，提示是否需要）
✅ PRD 存在且有效（至少 3 行，包含关键字段）
✅ DoD 存在且有效（至少 3 行，包含验收清单）
```

**作用**: 保证进入正确的环境

**强制能力**: ✅ 100%（唯一路径，无法绕过）

---

### Hook 2: Stop Hook（质检门控）

**时机**: AI 尝试结束会话时

**检查**:
```bash
✅ Audit 审计通过（docs/AUDIT-REPORT.md 存在 + Decision: PASS）
✅ 自动化测试通过（.quality-gate-passed 存在 + 时效性检查）
```

**作用**: 跑不完不让结束

**强制能力**: ✅ 100%（Stop Hook exit 2 阻止会话结束）

---

## 使用方法

### 1. 启动 Ralph Loop

```bash
/ralph-loop "实现功能 X。

要求:
1. 调用 /audit，必须 Decision: PASS
2. 运行 npm run qa:gate，必须全部通过
3. 完成时输出 <promise>DONE</promise>

如果失败就修复重试，直到成功。" \
  --max-iterations 20 \
  --completion-promise "DONE"
```

### 2. Ralph Loop 自动执行

```
迭代 1: 写代码 → /audit → FAIL → Stop Hook 阻止 → Ralph 继续
迭代 2: 修复 → /audit → PASS → npm qa → 失败 → Stop Hook 阻止 → Ralph 继续
迭代 3: 修复测试 → npm qa → 成功 → 输出 DONE → Stop Hook 放行 → Ralph 结束 ✅
```

### 3. 创建 PR（阶段 2）

```bash
# 阶段 1 完成后，手动或另一个 Ralph Loop 创建 PR
gh pr create ...
```

---

## 优势

| 项目 | 传统方式 | Ralph Loop 方式 |
|------|---------|----------------|
| **入口检查** | 人工确认 | ✅ PreToolUse 自动 |
| **质检执行** | 人工提醒 AI | ✅ Stop Hook 强制 |
| **失败重试** | 人工重跑 | ✅ Ralph 自动循环 |
| **完成确认** | 人工判断 | ✅ completion-promise |
| **无限循环** | 可能卡住 | ✅ max-iterations 保护 |

---

## 核心原则

**PreToolUse 管入口，Ralph Loop 管执行，Stop Hook 管出口**

```
入口 (PreToolUse)
    ├─ 正确的 Repository
    ├─ 正确的 Branch
    ├─ 正确的 Worktree
    └─ 正确的 PRD/DoD
    ↓
执行 (Ralph Loop)
    └─ AI 自由发挥，自动重试
    ↓
出口 (Stop Hook)
    └─ 跑不完不让出去
```

---

## 对比：有头 vs 无头

### 有头模式（手动启动）

```bash
# 用户在 Claude Code 中
/ralph-loop "实现功能 X..." --max-iterations 20
```

### 无头模式（Cecelia）

```bash
# N8N 或脚本调用
cecelia-run "实现功能 X..." --max-iterations 20
```

**共同点**: 都用 Ralph Loop + Stop Hook，流程完全一样

---

## 总结

### 两个 Hook，各司其职

| Hook | 时机 | 检查什么 | 强制能力 |
|------|------|---------|---------|
| PreToolUse:Write | 写文件前 | Repository + Branch + PRD/DoD | ✅ 100% |
| Stop | 结束前 | Audit + 测试 | ✅ 100% |

### 一个循环，全自动

```
Ralph Loop
    └─ 失败 → 修复 → 重试 → 直到成功
```

### 零人工干预

```
用户: /ralph-loop "任务..."
    ↓
（等待 5-30 分钟）
    ↓
完成 ✅
```

**Over！** 🎉

---

*生成时间: 2026-01-24*
