# Checkpoint 03: CI 统一调用 gate:test

## 问题

CI 当前调用 `npm run qa`，其中包含 `npm test`。
需要改为调用 `npm run gate:test`，保持与 Hook 一致。

## 解决方案

修改 `.github/workflows/ci.yml`，改用 gate:test。

### 当前

```yaml
- name: Run tests
  run: npm run qa
```

### 修改后

```yaml
- name: Run tests (gate)
  run: npm run gate:test

- name: Build
  run: npm run build

- name: Typecheck
  run: npm run typecheck
```

## 验收

- [x] CI 调用 gate:test
- [x] CI 环境变量与 Hook 一致（gate:test 统一设置 CI=true NODE_ENV=test TZ=UTC）
- [ ] CI artifacts 上传（后续 Phase 2 实现）
- [x] 本地/Hook/CI 结果一致（同一命令、同一环境变量）

## 实现

### .github/workflows/ci.yml (Line 117)

```yaml
npm run gate:test --if-present   # 单元测试 (gate)
```

统一了 Local/Hook/CI 三个环境的测试入口：
- 本地开发：`npm test`（快速反馈）
- Hook/CI：`npm run gate:test`（完整证据 + 固定环境）

## 状态

- [x] 完成
