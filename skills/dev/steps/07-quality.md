# Step 7: Quality Gate

> 在 PR 前跑所有本地检查，提前发现问题

**Task Checkpoint**: `TaskUpdate({ taskId: "7", status: "in_progress" })`

---

## 本地检查

运行以下命令检查代码质量：

```bash
# TypeCheck
npm run typecheck

# Tests
npm run test

# Build
npm run build

# Shell 语法检查（如果有 .sh 文件）
bash -n scripts/*.sh
```

---

## 完成后

本地检查通过，继续 Step 8。

**Task Checkpoint**: `TaskUpdate({ taskId: "7", status: "completed" })`
