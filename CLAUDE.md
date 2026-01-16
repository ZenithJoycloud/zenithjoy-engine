# ZenithJoy Engine

AI 开发工作流引擎。

---

## 唯一真实源

| 内容 | 位置 |
|------|------|
| 版本号 | `package.json` |
| 变更历史 | `CHANGELOG.md` |
| 工作流定义 | `skills/dev/SKILL.md` |
| 知识架构 | `docs/ARCHITECTURE.md` |
| 开发经验 | `docs/LEARNINGS.md` |

---

## 核心规则

1. **只在 cp-* 分支写代码** - Hook 强制
2. **每个 PR 更新版本号** - semver
3. **完成度检查必须跑** - □ 必要项全部完成
4. **CI 绿是唯一完成标准**

---

## 入口

| 命令 | 说明 |
|------|------|
| `/dev` | 开始开发流程 |

---

## 目录结构

```
zenithjoy-engine/
├── hooks/           # Claude Code Hooks
├── skills/dev/      # /dev 工作流
├── docs/            # 详细文档
│   ├── ARCHITECTURE.md  # 知识分层架构
│   └── LEARNINGS.md     # 开发经验
├── templates/       # 文档模板
├── .github/         # CI 配置
└── src/             # 代码
```

---

## 分支策略（频繁回主线）

```
main (stable, 始终最新)
  └── feature/* (临时，完成即删)
        └── cp-* (任务分支，Hook 强制)
```

**核心原则**：
- feature 是临时的，完成就合并回 main 并删除
- 只在 cp-* 分支写代码（Hook 强制）
- 保持 main 始终最新，减少分支同步负担

详细文档见 `docs/`。
