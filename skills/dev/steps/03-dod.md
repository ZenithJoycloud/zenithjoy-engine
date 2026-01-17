# Step 3: DoD

> 定义验收标准（Definition of Done）

---

## DoD 模板

```markdown
## DoD - 验收标准

### 自动测试
- [ ] TEST: <测试命令/断言 1>
- [ ] TEST: <测试命令/断言 2>

### 人工确认
- [ ] CHECK: <需要用户确认的点>
```

---

## 示例

```markdown
## DoD - 用户登录功能

### 自动测试
- [ ] TEST: 正确用户名密码能登录成功
- [ ] TEST: 错误密码显示错误提示
- [ ] TEST: 空用户名不能提交

### 人工确认
- [ ] CHECK: 登录页面样式符合设计
- [ ] CHECK: 登录成功后跳转正确
```

---

## PRD + DoD 确认后

**用户确认后，设置 PRD 确认标记**：

```bash
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
git config branch."$BRANCH_NAME".prd-confirmed true
echo "✅ PRD 已确认，可以开始写代码"
```

**这个标记用于 Hook 检查**：没有确认 PRD 不能写代码。
