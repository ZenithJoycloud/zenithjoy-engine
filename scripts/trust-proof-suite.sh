#!/usr/bin/env bash
# ============================================================================
# Trust Proof Suite - Zero-Escape 验证
# ============================================================================
#
# 这套测试证明系统是 "Zero-Escape"：
# - 任何人都无法绕过 PR 直接合并到 main/develop
# - 必须通过 CI 检查
# - 管理员也受限制
#
# 用法: bash scripts/trust-proof-suite.sh
# ============================================================================

set -euo pipefail

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数器
PASSED=0
FAILED=0

# 测试函数
test_case() {
    local name="$1"
    local expected="$2"  # "fail" or "pass"
    local command="$3"

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[TEST] $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    echo "  Command: $command"
    echo "  Expected: $expected"
    echo ""

    if eval "$command" > /tmp/tp-output.log 2>&1; then
        actual="pass"
    else
        actual="fail"
    fi

    if [[ "$actual" == "$expected" ]]; then
        echo -e "  ${GREEN}✅ PASS${NC} - $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC} - $name"
        echo "  Expected: $expected, Got: $actual"
        echo "  Output:"
        cat /tmp/tp-output.log | head -20
        FAILED=$((FAILED + 1))
    fi
}

# 仓库信息
REPO="perfectuser21/zenithjoy-engine"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "========================================"
echo "  Trust Proof Suite (Zero-Escape)"
echo "========================================"
echo ""
echo "  Repository: $REPO"
echo "  Current branch: $CURRENT_BRANCH"
echo ""

# ============================================================================
# TP-01: 直推 main 必失败
# ============================================================================
test_case "TP-01: Direct push to main MUST fail" "fail" \
    "git push origin HEAD:main --force-with-lease"

# ============================================================================
# TP-02: 直推 develop 必失败
# ============================================================================
test_case "TP-02: Direct push to develop MUST fail" "fail" \
    "git push origin HEAD:develop --force-with-lease"

# ============================================================================
# TP-03: Branch Protection 启用检查（API）
# ============================================================================
test_case "TP-03: Branch Protection enabled for main" "pass" \
    "gh api repos/$REPO/branches/main/protection | jq -e '.required_pull_request_reviews != null'"

test_case "TP-04: Branch Protection enabled for develop" "pass" \
    "gh api repos/$REPO/branches/develop/protection | jq -e '.required_pull_request_reviews != null'"

# ============================================================================
# TP-05: enforce_admins 必须启用
# ============================================================================
test_case "TP-05: enforce_admins enabled for main" "pass" \
    "gh api repos/$REPO/branches/main/protection | jq -e '.enforce_admins.enabled == true'"

test_case "TP-06: enforce_admins enabled for develop" "pass" \
    "gh api repos/$REPO/branches/develop/protection | jq -e '.enforce_admins.enabled == true'"

# ============================================================================
# TP-07: Required status checks 配置
# ============================================================================
test_case "TP-07: Required status check 'test' for main" "pass" \
    "gh api repos/$REPO/branches/main/protection | jq -e '.required_status_checks.contexts | contains([\"test\"])'"

test_case "TP-08: Required status check 'test' for develop" "pass" \
    "gh api repos/$REPO/branches/develop/protection | jq -e '.required_status_checks.contexts | contains([\"test\"])'"

# ============================================================================
# TP-09: 禁止 force push
# ============================================================================
test_case "TP-09: Force push disabled for main" "pass" \
    "gh api repos/$REPO/branches/main/protection | jq -e '.allow_force_pushes.enabled == false'"

test_case "TP-10: Force push disabled for develop" "pass" \
    "gh api repos/$REPO/branches/develop/protection | jq -e '.allow_force_pushes.enabled == false'"

# ============================================================================
# 总结
# ============================================================================
echo ""
echo "========================================"
echo "  Test Results"
echo "========================================"
echo ""
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ All tests passed - System is Zero-Escape compliant${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed - System has escape routes${NC}"
    echo ""
    exit 1
fi
