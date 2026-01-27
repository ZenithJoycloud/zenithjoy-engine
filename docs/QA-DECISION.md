# QA Decision

Decision: UPDATE_RCI
Priority: P1
RepoType: Engine

Tests:
  - dod_item: "skills/dev/SKILL.md 版本号更新为 2.2.0"
    method: manual
    location: manual:检查 frontmatter 版本号
  - dod_item: "所有 p0/p1/p2 阶段相关内容已删除"
    method: manual
    location: manual:检查指定行号内容已删除
  - dod_item: "detect-phase.sh 调用已删除"
    method: manual
    location: manual:grep 检查无 detect-phase.sh 引用
  - dod_item: "新增统一完成条件章节"
    method: manual
    location: manual:检查包含统一完成条件章节
  - dod_item: "新增 Task Checkpoint 追踪章节"
    method: manual
    location: manual:检查包含 TaskCreate/TaskUpdate 说明
  - dod_item: "执行流程图改为单一流程"
    method: manual
    location: manual:检查流程图不分阶段
  - dod_item: "核心规则更新为统一流程"
    method: manual
    location: manual:检查核心规则章节
  - dod_item: "版本号、CHANGELOG 已同步更新"
    method: manual
    location: manual:检查 registry.json、CHANGELOG.md
  - dod_item: "测试验证 TaskCreate/TaskUpdate 使用"
    method: manual
    location: manual:运行 dev-with-loop 观察行为

RCI:
  new: []
  update:
    - W7-001  # Ralph Loop 自动化（删除阶段检测，改为统一完成条件）
    - W7-003  # 版本号自动更新（使用 Task Checkpoint 追踪）

Reason: 删除错误的阶段检测逻辑，添加 Task Checkpoint 追踪规范，影响 Ralph Loop 工作流执行方式，需要更新相关 RCI
