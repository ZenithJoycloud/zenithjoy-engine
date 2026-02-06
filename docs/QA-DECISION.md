# QA Decision

Decision: NO_RCI
Priority: P2
RepoType: Engine

## Scope

允许修改的范围（glob patterns）：

- docs/platform-monitoring/**
- docs/QA-DECISION.md
- .prd.md
- .dod.md

## Forbidden

禁止修改的区域（glob patterns）：

- src/**
- hooks/**
- skills/**
- .github/**
- scripts/**
- tests/**
- package.json
- node_modules/*
- .git/*
- dist/*

## Tests

每个 DoD 条目对应的测试方式：

Tests:
  - dod_item: "创建主技术设计文档 docs/platform-monitoring/TECH_DESIGN.md"
    method: manual
    location: manual:检查文件 docs/platform-monitoring/TECH_DESIGN.md 存在且包含架构图、数据流图、系统组件说明

  - dod_item: "技术栈方案对比在 TECH_DESIGN.md 中"
    method: manual
    location: manual:验证 TECH_DESIGN.md 包含至少 3 种时序数据库对比（InfluxDB、TimescaleDB、ClickHouse），有优缺点分析和明确推荐

  - dod_item: "创建 API 设计文档 docs/platform-monitoring/API_DESIGN.md"
    method: manual
    location: manual:检查文件 docs/platform-monitoring/API_DESIGN.md 存在且定义至少 5 个核心 API（包含请求/响应示例和错误码）

  - dod_item: "核心接口定义"
    method: manual
    location: manual:验证 API_DESIGN.md 包含 5 个核心接口（POST /api/v1/metrics/ingest, GET /api/v1/metrics/query, POST /api/v1/baseline/calculate, GET /api/v1/anomalies/detect, POST /api/v1/reports/generate）

  - dod_item: "创建数据库 Schema 文档 docs/platform-monitoring/DATABASE_SCHEMA.md"
    method: manual
    location: manual:检查文件 docs/platform-monitoring/DATABASE_SCHEMA.md 存在且包含流量数据表、基线数据表的 CREATE TABLE 语句，索引设计和分区策略

  - dod_item: "数据保留策略"
    method: manual
    location: manual:验证 DATABASE_SCHEMA.md 定义了热数据保留期限、冷数据归档策略和数据清理规则

  - dod_item: "月报模板设计 docs/platform-monitoring/REPORT_TEMPLATE.md"
    method: manual
    location: manual:检查文件 docs/platform-monitoring/REPORT_TEMPLATE.md 存在且包含月报样例、关键指标定义（流量趋势、基线对比、异常统计）和自动生成逻辑说明

  - dod_item: "所有文档使用正确的 Markdown 格式"
    method: manual
    location: manual:验证每个文档有 H1 标题、代码块使用 ```、有目录或 TOC

  - dod_item: "文档包含必要的元信息"
    method: manual
    location: manual:检查每个文档开头有 frontmatter（YAML 格式）、有参考章节和术语表（如需要）

  - dod_item: "文档完整性检查"
    method: manual
    location: manual:ls docs/platform-monitoring/*.md | wc -l 确认有 4 个核心文档，无 TODO/TBD 占位符，文档间链接有效

  - dod_item: "技术深度验证"
    method: manual
    location: manual:验证 TECH_DESIGN.md 考虑扩展性、API_DESIGN.md 使用 RESTful 规范、DATABASE_SCHEMA.md 考虑性能优化

## RCI

涉及的回归契约：

RCI:
  new: []      # 无需新增 RCI（这是纯文档/设计任务）
  update: []   # 无需更新 RCI（不涉及代码功能变更）

## Reason

这是纯技术调研和文档设计任务，不涉及代码实现或功能变更，输出物是技术设计文档（TECH_DESIGN.md、API_DESIGN.md、DATABASE_SCHEMA.md、REPORT_TEMPLATE.md），无需纳入回归契约。验收标准全部为文档完整性和技术深度的人工审查，不涉及自动化测试或运行时行为变更。

## Documentation Quality Standards

### 文档结构规范

1. **Frontmatter 必须包含**：
   - `id`: 文档唯一标识符
   - `version`: 版本号（初始为 1.0.0）
   - `created`: 创建日期（YYYY-MM-DD）
   - `updated`: 最后更新日期
   - `changelog`: 版本变更记录

2. **内容组织规范**：
   - 必须有清晰的目录（TOC）
   - 使用语义化的标题层级（H1-H4）
   - 每个技术选型必须有对比表格
   - 代码示例必须使用语法高亮的代码块
   - 架构图推荐使用 Mermaid 格式（可内嵌渲染）

3. **技术设计深度要求**：
   - **TECH_DESIGN.md**: 必须包含系统架构图、数据流图、技术选型对比（至少 3 个维度：性能、成本、运维复杂度）、扩展性分析
   - **API_DESIGN.md**: 每个接口必须包含完整的 Request/Response Schema（JSON 格式）、错误码定义（至少 5 个常见错误）、认证方式说明、限流策略
   - **DATABASE_SCHEMA.md**: 必须包含完整的 DDL 语句、索引设计理由、分区策略（时间分区）、数据生命周期管理、性能优化建议
   - **REPORT_TEMPLATE.md**: 必须包含报告模板示例（Markdown 格式）、图表占位符说明、自动生成逻辑伪代码、报告分发机制

### 验收检查清单

**阶段 1: 文档存在性验证**
```bash
# 验证 4 个核心文档都已创建
test -f docs/platform-monitoring/TECH_DESIGN.md || echo "FAIL: TECH_DESIGN.md 缺失"
test -f docs/platform-monitoring/API_DESIGN.md || echo "FAIL: API_DESIGN.md 缺失"
test -f docs/platform-monitoring/DATABASE_SCHEMA.md || echo "FAIL: DATABASE_SCHEMA.md 缺失"
test -f docs/platform-monitoring/REPORT_TEMPLATE.md || echo "FAIL: REPORT_TEMPLATE.md 缺失"
```

**阶段 2: 文档格式验证**
```bash
# 检查每个文档是否有 frontmatter
for file in docs/platform-monitoring/*.md; do
  head -1 "$file" | grep -q "^---$" || echo "FAIL: $file 缺少 frontmatter"
done

# 检查每个文档是否有主标题
for file in docs/platform-monitoring/*.md; do
  grep -q "^# " "$file" || echo "FAIL: $file 缺少 H1 标题"
done

# 检查代码块格式
for file in docs/platform-monitoring/*.md; do
  grep -q '```' "$file" || echo "WARN: $file 可能缺少代码示例"
done
```

**阶段 3: 内容完整性验证**
```bash
# TECH_DESIGN.md 必须包含的关键字
grep -qi "InfluxDB\|TimescaleDB\|ClickHouse" docs/platform-monitoring/TECH_DESIGN.md || echo "FAIL: TECH_DESIGN.md 缺少数据库对比"
grep -qi "架构图\|architecture" docs/platform-monitoring/TECH_DESIGN.md || echo "FAIL: TECH_DESIGN.md 缺少架构图"
grep -qi "推荐\|recommendation" docs/platform-monitoring/TECH_DESIGN.md || echo "FAIL: TECH_DESIGN.md 缺少推荐方案"

# API_DESIGN.md 必须有至少 5 个 API 端点
api_count=$(grep -c "^###.*\/api\/v1" docs/platform-monitoring/API_DESIGN.md)
[ "$api_count" -ge 5 ] || echo "FAIL: API_DESIGN.md 只有 $api_count 个 API，需要至少 5 个"

# DATABASE_SCHEMA.md 必须包含表定义和索引
grep -qi "CREATE TABLE" docs/platform-monitoring/DATABASE_SCHEMA.md || echo "FAIL: DATABASE_SCHEMA.md 缺少表定义"
grep -qi "INDEX\|索引" docs/platform-monitoring/DATABASE_SCHEMA.md || echo "FAIL: DATABASE_SCHEMA.md 缺少索引设计"

# REPORT_TEMPLATE.md 必须包含示例和自动化逻辑
grep -qi "示例\|example" docs/platform-monitoring/REPORT_TEMPLATE.md || echo "FAIL: REPORT_TEMPLATE.md 缺少示例"
grep -qi "自动生成\|automation" docs/platform-monitoring/REPORT_TEMPLATE.md || echo "FAIL: REPORT_TEMPLATE.md 缺少自动化说明"
```

**阶段 4: 技术深度验证**
```bash
# 验证没有未完成的占位符
grep -l "TODO\|TBD\|占位\|待补充" docs/platform-monitoring/*.md && echo "FAIL: 文档包含未完成占位符"

# 验证文档间引用有效性
for file in docs/platform-monitoring/*.md; do
  # 提取 Markdown 链接 [text](./file.md)
  grep -oP '\]\(\./[^)]+\.md\)' "$file" | while read link; do
    target=$(echo "$link" | sed 's/](\.\///' | sed 's/)//')
    test -f "docs/platform-monitoring/$target" || echo "FAIL: $file 中的链接 $target 无效"
  done
done
```

### 验收通过标准

**MUST HAVE（必须满足，否则不通过）**:
1. 4 个核心文档全部存在
2. 每个文档有正确的 frontmatter
3. TECH_DESIGN.md 包含至少 3 种技术栈对比和明确推荐
4. API_DESIGN.md 定义至少 5 个核心 API，每个都有完整 Schema
5. DATABASE_SCHEMA.md 包含完整的 DDL、索引和分区策略
6. REPORT_TEMPLATE.md 包含月报样例和自动化逻辑
7. 无 TODO/TBD/占位符
8. 文档间链接全部有效

**SHOULD HAVE（建议满足，影响质量评分）**:
1. 架构图使用 Mermaid 格式（可渲染）
2. API 文档包含认证和限流策略
3. 数据库文档包含性能优化建议和容量规划
4. 月报模板包含图表占位符和数据来源说明
5. 技术选型有成本分析（硬件成本、人力成本、学习曲线）

**NICE TO HAVE（加分项）**:
1. 包含术语表（Glossary）
2. 包含参考文献或外部链接
3. 包含示例数据或测试数据
4. 包含部署架构图（production topology）
5. 包含监控和告警策略建议

---

Generated by: QA Decision Node (Documentation Task Mode)
Generated at: 2026-02-06
