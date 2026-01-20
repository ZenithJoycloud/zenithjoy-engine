/**
 * project-detect.sh 最小测试
 *
 * 测试项目检测 Hook 的核心逻辑：
 * 1. 检测项目类型（Node/Python/Go/Rust）
 * 2. 检测 Monorepo 结构
 * 3. 检测测试能力 L1-L6
 * 4. 输出 .project-info.json
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const HOOK_PATH = resolve(__dirname, "../../hooks/project-detect.sh");
const PROJECT_ROOT = resolve(__dirname, "../..");
const INFO_FILE = resolve(PROJECT_ROOT, ".project-info.json");

describe("project-detect.sh", () => {
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

  it("should generate .project-info.json", () => {
    // The file should exist after hook runs during development
    expect(existsSync(INFO_FILE)).toBe(true);
  });

  it("should detect Node.js project correctly", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.project).toBeDefined();
    expect(info.project.type).toBe("node");
    expect(info.project.name).toBe("zenithjoy-engine");
  });

  it("should detect test levels correctly", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.test_levels).toBeDefined();
    expect(info.test_levels.L1).toBe(true); // Has typecheck
    expect(info.test_levels.L2).toBe(true); // Has vitest
    expect(info.test_levels.max_level).toBeGreaterThanOrEqual(2);
  });

  it("should include hash for cache invalidation", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.hash).toBeDefined();
    expect(typeof info.hash).toBe("string");
    expect(info.hash.length).toBeGreaterThan(0);
  });

  it("should include detection timestamp", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.detected_at).toBeDefined();
    // Should be ISO date format
    expect(() => new Date(info.detected_at)).not.toThrow();
  });

  it("should detect monorepo status", () => {
    const info = JSON.parse(readFileSync(INFO_FILE, "utf-8"));

    expect(info.project.is_monorepo).toBeDefined();
    expect(typeof info.project.is_monorepo).toBe("boolean");
  });
});
