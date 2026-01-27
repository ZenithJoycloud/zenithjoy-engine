# QA Decision

Decision: UPDATE_RCI
Priority: P1
RepoType: Engine

Tests:
  - dod_item: "/dev 在 Step 7 自动启动 Ralph Loop"
    method: manual
    location: manual:执行/dev观察日志中是否自动调用 Ralph Loop

  - dod_item: "Ralph Loop max-iterations=20"
    method: manual
    location: manual:检查命令参数

  - dod_item: "p1 阶段自动启动 Ralph Loop"
    method: manual
    location: manual:触发CI失败观察行为

  - dod_item: "SHA 不匹配问题解决（一次性提交）"
    method: manual
    location: manual:完整流程CI通过

  - dod_item: "版本号自动更新（feat/fix/feat!）"
    method: manual
    location: manual:检查package.json自动更新

  - dod_item: "CHANGELOG 自动更新"
    method: manual
    location: manual:检查CHANGELOG新增条目

  - dod_item: "hook-core/VERSION 自动更新"
    method: manual
    location: manual:检查VERSION文件同步

  - dod_item: "Registry 自动更新（改核心文件时）"
    method: manual
    location: manual:改hooks/确认registry更新

  - dod_item: "派生视图自动生成"
    method: manual
    location: manual:确认docs/paths/更新

  - dod_item: "DoD 格式自动修复"
    method: manual
    location: manual:故意错误格式确认修复

  - dod_item: "CI SHA 检查支持单 commit"
    method: manual
    location: manual:CI通过验证

  - dod_item: "端到端测试：/dev → Loop → PR → CI pass → merge"
    method: manual
    location: manual:完整流程测试

RCI:
  new: []
  update:
    - W1-001  # 两阶段工作流 - Ralph Loop 成为自动化核心
    - W1-002  # p0 质检循环
    - W1-003  # p1 CI 修复循环
    - W7-001  # 新增：Ralph Loop 自动化能力（待创建）

Reason: Ralph Loop 自动化是 /dev 工作流的核心改进，解决循环死锁和版本号遗忘问题，需要更新现有 W1 RCI 并新增 W7 RCI
