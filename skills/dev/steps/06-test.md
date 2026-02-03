# Step 6: 写测试

> 每个功能必须有对应的测试

**Task Checkpoint**: `TaskUpdate({ taskId: "6", status: "in_progress" })`

---

## 核心原则

```
DoD 里写的验收标准 → 变成测试代码

例如：
  DoD: "用户能登录"
    ↓
  测试: it('用户能登录', () => { ... })
```

---

## 测试文件命名

- `功能.ts` → `功能.test.ts`
- 例：`login.ts` → `login.test.ts`

---

## 测试要求

- [ ] 必须有断言（expect）
- [ ] 覆盖核心功能路径
- [ ] 覆盖主要边界情况

---

## 完成后

测试已完成，继续 Step 7。

**Task Checkpoint**: `TaskUpdate({ taskId: "6", status: "completed" })`
