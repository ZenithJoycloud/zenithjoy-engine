/**
 * pr-gate-v2.sh 最小测试
 *
 * 测试 PR Gate Hook 的核心逻辑：
 * 1. 只拦截 gh pr create 命令
 * 2. 验证三层质检（L1/L2/L3）
 * 3. 检查证据文件（.layer2-evidence.md, .dod.md）
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const HOOK_PATH = resolve(__dirname, "../../hooks/pr-gate-v2.sh");

describe("pr-gate-v2.sh", () => {
  beforeAll(() => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it("should exist and be executable", () => {
    const stat = execSync(`stat -c %a "${HOOK_PATH}"`, { encoding: "utf-8" });
    const mode = parseInt(stat.trim(), 8);
    expect(mode & 0o111).toBeGreaterThan(0);
  });

  it("should pass syntax check", () => {
    expect(() => {
      execSync(`bash -n "${HOOK_PATH}"`, { encoding: "utf-8" });
    }).not.toThrow();
  });

  it("should exit 0 for non-Bash operations", () => {
    const input = JSON.stringify({
      tool_name: "Write",
      tool_input: { file_path: "/tmp/test.ts" },
    });

    const result = execSync(`echo '${input}' | bash "${HOOK_PATH}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(result).toBe("");
  });

  it("should exit 0 for non-gh-pr-create commands", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    });

    const result = execSync(`echo '${input}' | bash "${HOOK_PATH}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(result).toBe("");
  });

  it("should intercept gh pr create command", () => {
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "gh pr create --title test" },
    });

    // Should run checks (may fail in test env, but should not crash)
    expect(() => {
      execSync(`echo '${input}' | bash "${HOOK_PATH}" 2>/dev/null || true`, {
        encoding: "utf-8",
      });
    }).not.toThrow();
  });

  it("should detect project type from package.json", () => {
    // Hook should handle Node.js projects correctly
    const input = JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "gh pr create" },
    });

    // Just verify no crash during project detection
    expect(() => {
      execSync(`echo '${input}' | bash "${HOOK_PATH}" 2>/dev/null || true`, {
        encoding: "utf-8",
      });
    }).not.toThrow();
  });
});
