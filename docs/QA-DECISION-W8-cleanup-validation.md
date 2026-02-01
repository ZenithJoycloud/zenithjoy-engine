# QA Decision - W8 Cleanup Validation

## 基本信息
- **任务**: W8-cleanup-validation
- **类型**: Feature (添加验证机制)
- **优先级**: P1
- **仓库**: Engine

## Decision
**UPDATE_RCI**

## 变更范围
- `skills/dev/scripts/cleanup.sh` - 添加3个验证检查
- `hooks/stop.sh` - 确认向后兼容性（无需修改）
- `skills/dev/steps/11-cleanup.md` - 文档更新

## 测试策略

### 功能测试
| DoD 项 | 方法 | 位置 |
|--------|------|------|
| 删除前验证所有步骤完成 | auto | tests/scripts/cleanup-validation.test.ts |
| 有步骤未完成时报错 | auto | tests/scripts/cleanup-validation.test.ts |
| 删除后验证文件不存在 | auto | tests/scripts/cleanup-validation.test.ts |
| 文件仍存在时报错 | auto | tests/scripts/cleanup-validation.test.ts |
| 验证 gate 文件存在 | auto | tests/scripts/cleanup-validation.test.ts |
| gate 文件缺失时警告 | auto | tests/scripts/cleanup-validation.test.ts |
| 标记方式统一 | auto | tests/scripts/cleanup-validation.test.ts |
| Stop Hook 向后兼容 | auto | tests/hooks/stop-hook.test.ts (已有) |

### Regression Contract

需要新增以下 RCI：

**新增 RCI**:
- `C7-001`: cleanup.sh 删除前验证所有步骤完成
- `C7-002`: cleanup.sh 删除后验证 .dev-mode 不存在
- `C7-003`: cleanup.sh 统一使用 step_11_cleanup: done 标记

**更新 RCI**:
- `contract:H7-002` (Stop Hook 循环控制) - 确认向后兼容 cleanup_done: true

## RCI 判定理由

1. **核心流程变更**: 修改 cleanup.sh 的验证逻辑，属于 /dev 核心流程
2. **错误处理关键**: 验证逻辑失败会导致 cleanup 无法完成，必须回归测试
3. **向后兼容**: Stop Hook 需要兼容新旧标记方式，需要回归测试

## Trigger 规则

```yaml
trigger: always
paths:
  - skills/dev/scripts/cleanup.sh
  - hooks/stop.sh
priority: P1
```

## Golden Path 判定

**不属于 Golden Path**：
- 理由：cleanup 验证是质量保障机制，不是用户核心流程
- 但必须有 RCI 确保稳定性

## 决策理由

这是 /dev 核心流程的增强，验证逻辑失败会导致 cleanup 质量下降，必须通过 RCI 确保：
1. 所有步骤完成才允许删除 .dev-mode
2. 删除后文件确实不存在
3. 标记方式统一，Stop Hook 向后兼容

**测试覆盖度**:
- 单元测试：cleanup.sh 的3个验证函数
- 集成测试：Stop Hook 的向后兼容性
- 回归测试：RCI C7-001/002/003 + 更新 H7-002
