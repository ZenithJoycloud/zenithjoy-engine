# PRD: pr-gate-v2 压力测试发现的 Bug 修复

## 背景

pr-gate-v2.sh 证据链质检机制完成开发后，进行压力测试发现一个 Bug。

## 问题描述

### Bug: HTTP_STATUS 匹配过宽

**现象**：T5 测试中，curl 证据块不包含有效的 `HTTP_STATUS: 200` 格式，但检查却通过了。

**根因**：
```bash
# 旧代码 (line 275-276)
if echo "$CURL_BLOCK" | grep -q "HTTP_STATUS" 2>/dev/null; then
```

问题：`### C1: 缺少 HTTP_STATUS` 标题行本身包含 "HTTP_STATUS" 字符串，grep 匹配到了标题而非实际 curl 输出。

**影响**：Agent 可以用任意包含 "HTTP_STATUS" 单词的内容绕过检查。

## 修复方案

```bash
# 新代码
# 匹配 "HTTP_STATUS: 数字" 格式，避免匹配标题中的单词
if echo "$CURL_BLOCK" | grep -qE "HTTP_STATUS:\s*[0-9]+" 2>/dev/null; then
```

**验证**：
| 输入 | 旧逻辑 | 新逻辑 |
|------|--------|--------|
| `HTTP_STATUS: 200` | ✅ 匹配 | ✅ 匹配 |
| `HTTP_STATUS` 单词 | ❌ 误匹配 | ✅ 不匹配 |
| `缺少 HTTP_STATUS` 标题 | ❌ 误匹配 | ✅ 不匹配 |

## 修改文件

| 文件 | 修改 |
|------|------|
| `hooks/pr-gate-v2.sh` | Line 275-280: 修改 grep 正则表达式 |

## DoD

- [ ] pr-gate-v2.sh 中 HTTP_STATUS 检查使用 `grep -qE "HTTP_STATUS:\s*[0-9]+"`
- [ ] 错误提示更新为 `缺少 HTTP_STATUS: xxx` 和 `curl 输出必须包含 HTTP_STATUS: 200 格式`
- [ ] 压力测试 T5 通过（缺少有效 HTTP_STATUS 时被阻止）

## 备注

当前 develop 分支的 pr-gate-v2.sh 已有修改（未提交），可以直接 commit。

```bash
# 查看修改
git diff hooks/pr-gate-v2.sh

# 或者直接应用已有修改
git add hooks/pr-gate-v2.sh
```
