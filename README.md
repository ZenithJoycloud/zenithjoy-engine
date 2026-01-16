# zenithjoy-core

AI 开发工作流核心组件。提供 Hooks、Skills 和 CI 模板，实现强制的开发流程保护。

## 功能

- **分支保护 Hook**: 强制在 `cp-*` 分支开发
- **CI 自动合并**: PR 通过 CI 后自动合并
- **开发流程 Skill**: 自动生成 PRD + DoD，自测后提交

## Installation

### 1. 链接 Hooks

```bash
ln -sf /path/to/zenithjoy-core/hooks/branch-protect.sh ~/.claude/hooks/
```

### 2. 链接 Skills

```bash
ln -sf /path/to/zenithjoy-core/skills/dev ~/.claude/skills/
ln -sf /path/to/zenithjoy-core/skills/new-task ~/.claude/skills/
ln -sf /path/to/zenithjoy-core/skills/finish ~/.claude/skills/
```

### 3. 复制 CI 模板

```bash
cp /path/to/zenithjoy-core/.github/workflows/ci.yml your-project/.github/workflows/
```

## Hooks 配置

在 `~/.claude/settings.json` 中配置 Hooks：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/branch-protect.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/project-detect.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook 类型

| Hook | 触发时机 | 用途 |
|------|---------|------|
| PreToolUse | 工具执行前 | 拦截 Write/Edit，检查分支 |
| PostToolUse | 工具执行后 | 检测项目状态 |

### branch-protect.sh

检查是否在 `cp-*` 分支，不是则阻止写代码文件。

## Usage

### 开发流程

```
1. 说需求 → Claude 自动生成 PRD + DoD
2. 确认后 → Claude 创建 cp-* 分支
3. Claude 写代码 + 自测
4. 自测通过 → /finish → PR → CI → 自动合并
```

### 命令

| 命令 | 说明 |
|------|------|
| `/dev` | 启动开发流程 |
| `/new-task` | 创建 checkpoint 分支 |
| `/finish` | 提交、推送、创建 PR |

## 分支保护

GitHub 层面的强制保护：
- main 禁止直接 push
- PR 必须过 CI
- CI 通过后自动合并

## License

MIT
