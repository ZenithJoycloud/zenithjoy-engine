---
id: zero-escape-config
version: 1.0.0
created: 2026-01-24
updated: 2026-01-24
changelog:
  - 1.0.0: 初始版本 - Zero-Escape 配置完成
---

# Zero-Escape 配置（企业级门禁）

## 🎯 目标

从"本地 hook 自觉"升级为"服务器侧强制"，实现 Zero-Escape：
- ❌ 无法绕过 PR 直接合并到 main/develop
- ❌ 无法绕过 CI 检查
- ❌ 管理员也受限制（enforce_admins）

## ✅ 当前配置（个人仓库最大化保护）

### Main Branch Protection

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["test"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

### Develop Branch Protection

（与 main 完全相同）

## ✅ Trust Proof Suite（系统自证）

运行验证脚本：

```bash
bash scripts/trust-proof-suite.sh
```

### 验证结果（2026-01-24）

```
✅ TP-01: Direct push to main MUST fail
✅ TP-02: Direct push to develop MUST fail
✅ TP-03: Branch Protection enabled for main
✅ TP-04: Branch Protection enabled for develop
✅ TP-05: enforce_admins enabled for main
✅ TP-06: enforce_admins enabled for develop
✅ TP-07: Required status check 'test' for main
✅ TP-08: Required status check 'test' for develop
✅ TP-09: Force push disabled for main
✅ TP-10: Force push disabled for develop

Passed: 10/10
Failed: 0/10
```

## ⚠️ 个人仓库限制（已知且无解）

### 限制 1: 无法启用 Push Restrictions

**问题：**
- `restrictions` 字段只支持组织仓库
- API 返回：`"Only organization repositories can have users and team restrictions"`

**后果：**
- 无法限制"只有 Merge Bot 可以写入"
- 个人仓库的 owner 始终有最终权限

**替代方案：**
1. **短期**：依赖 required_pull_request_reviews + enforce_admins + 自律
2. **长期**：迁移到组织仓库（完整 Zero-Escape）

### 限制 2: Owner 始终可以 Bypass

**问题：**
- GitHub 个人仓库的 owner 始终保留"紧急绕过"权限
- 即使启用 `enforce_admins`，owner 仍可通过 UI 强制合并

**缓解措施：**
- 启用所有可用的保护规则
- 使用 Trust Proof Suite 定期验证
- 依赖纪律和流程

## 📊 个人仓库 vs 组织仓库对比

| 功能 | 个人仓库 | 组织仓库 |
|------|---------|----------|
| Required PR | ✅ | ✅ |
| Required Status Checks | ✅ | ✅ |
| Enforce Admins | ✅ | ✅ |
| Push Restrictions | ❌ | ✅ |
| Rulesets（完整版）| ❌ | ✅ |
| Bypass List | ❌ | ✅ |
| Owner 绝对限制 | ❌ | ✅ |

## 🛡️ 当前保护等级：A- (95%)

**达成：**
- ✅ 必须 PR（无法直推）
- ✅ 必须 CI 通过
- ✅ 管理员受限（enforce_admins）
- ✅ 禁止强推/删除分支
- ✅ 分支必须最新（strict）

**未达成（个人仓库限制）：**
- ❌ Push Restrictions（只有 Merge Bot 可写）
- ❌ Owner 绝对限制

**评级说明：**
- A+（100%）= 组织仓库 + 完整 Rulesets + Merge Bot
- A（98%）= 组织仓库 + Branch Protection
- **A-（95%）= 个人仓库 + 最大化保护（当前状态）**
- B（80%）= 个人仓库 + 基础保护
- C（60%）= 只有本地 Hook

## 🚀 升级路径（未来）

### 短期（当前已完成）
- [x] 启用所有可用的 Branch Protection
- [x] 创建 Trust Proof Suite
- [x] 文档化限制

### 中期（可选）
- [ ] 迁移到组织仓库
- [ ] 启用 Push Restrictions
- [ ] 配置 Merge Bot

### 长期（企业级）
- [ ] Rulesets（完整版）
- [ ] Merge Queue
- [ ] Deploy Protection Rules

## 📝 维护检查清单

每月运行：

```bash
# 1. 验证保护规则
bash scripts/trust-proof-suite.sh

# 2. 检查 main/develop 保护状态
gh api repos/perfectuser21/zenithjoy-engine/branches/main/protection | jq .
gh api repos/perfectuser21/zenithjoy-engine/branches/develop/protection | jq .

# 3. 审计最近的合并操作
gh pr list --state merged --limit 10

# 4. 检查是否有 bypass 操作
gh api repos/perfectuser21/zenithjoy-engine/events | jq '.[] | select(.type == "PushEvent" and (.payload.ref | contains("main") or contains("develop")))'
```

## 🔗 相关文档

- `features/trust-layer/PRD.md` - Trust Layer 完整 PRD
- `features/trust-layer/CHECKPOINT-01.md` - Branch Protection 分析
- `scripts/trust-proof-suite.sh` - 验证脚本
- `.github/workflows/ci.yml` - CI 配置

## ✅ 结论

**个人仓库下已实现最大化保护（A- 级）：**
- 无法绕过 PR
- 无法绕过 CI
- 管理员受限
- 系统自证（Trust Proof Suite）

**剩余 5% 差距需要组织仓库（长期方案）**
