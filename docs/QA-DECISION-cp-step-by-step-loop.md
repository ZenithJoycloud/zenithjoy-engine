# QA Decision - 移除 /dev 中所有 Subagent 调用

Decision: NO_RCI
Priority: P1
RepoType: Engine

## 测试方式

Tests:
  - dod_item: "Step 文件修改完成（6 个文件）"
    method: manual
    location: manual:检查每个 Step 文件是否包含 DISABLED 注释

  - dod_item: "注释格式规范"
    method: manual
    location: manual:验证 HTML 注释格式正确

  - dod_item: "CI 严格性验证"
    method: auto
    location: .github/workflows/ci.yml

  - dod_item: "连续执行测试（推荐）"
    method: manual
    location: manual:运行 /dev 观察是否连续执行

## RCI 影响

RCI:
  new: []
  update: []

## 决策理由

**为什么 NO_RCI？**
- 这是工作流元层面的优化（修改工作流本身）
- 不涉及功能代码的改动
- 主要是文档（Step 文件）的结构性调整
- 不需要新增回归测试用例

**优先级 P1 的原因：**
- 解决 /dev 工作流频繁停顿的核心问题
- 直接影响开发效率和体验
- 但不是阻塞性问题（现有流程仍可工作）

**质量保障策略：**
- 依赖现有的严格 CI（7 层检查）
- PreToolUse Hook 保证 PRD/DoD 存在
- 手动验证 Subagent 调用已正确禁用
- 推荐进行连续执行测试验证

## 影响范围

**修改的文件：**
- skills/dev/steps/01-prd.md
- skills/dev/steps/04-dod.md
- skills/dev/steps/05-code.md
- skills/dev/steps/06-test.md
- skills/dev/steps/07-quality.md
- skills/dev/steps/10-learning.md

**不影响：**
- gate:xxx skills 代码（保留，可用于事后审核）
- Stop Hook 机制
- CI 配置
- 其他仓库

## 测试计划

**自动化测试：**
- CI 会验证所有质量层级（TypeCheck/Tests/Build/Gates/Evidence/Regression）
- 不需要新增自动化测试

**手动验证：**
1. 检查 6 个 Step 文件的 DISABLED 注释
2. 验证全局和仓库文件同步
3. （推荐）运行 /dev 测试连续执行

**验收标准：**
- 所有 Subagent 调用已被 HTML 注释包裹
- 原有代码保留未删除
- CI 全部通过
