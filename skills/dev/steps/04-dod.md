# Step 4: DoD

> 定义验收标准（Definition of Done）

**Task Checkpoint**: `TaskUpdate({ taskId: "4", status: "in_progress" })`

---

## DoD 草稿

把 PRD 里的"成功标准"变成可勾选的清单：

```
PRD 成功标准: "用户能登录"
    ↓
DoD 草稿:
  - [ ] 用户输入正确密码能登录成功
  - [ ] 用户输入错误密码显示错误提示
```

---

## DoD 定稿

每个条目包含测试方式：

```markdown
# DoD - <功能名>

## 验收标准

### 功能验收
- [ ] 用户输入正确密码能登录成功
      Test: tests/auth.test.ts
- [ ] 用户输入错误密码显示错误提示
      Test: tests/auth.test.ts

### 测试验收
- [ ] npm run qa 通过
      Test: CI
```

---

## DoD 模板

```markdown
# DoD - <功能名>

## 验收标准

### 功能验收
- [ ] <功能点 1>
      Test: tests/... | manual:...
- [ ] <功能点 2>
      Test: tests/... | manual:...

### 测试验收
- [ ] CI 通过
      Test: CI
```

---

## 完成后

DoD 已定稿，继续 Step 5。

**Task Checkpoint**: `TaskUpdate({ taskId: "4", status: "completed" })`
