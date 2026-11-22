#!/usr/bin/env bash
# ============================================================
# Al-Saifee Perfumes — Automated API Smoke Test Script
# Tests all critical endpoints against the deployed Cloudflare Worker
# ============================================================

set -euo pipefail

BASE_URL="${API_URL:-https://api.alsaifeeperfumes.in}"
PASS_COUNT=0
FAIL_COUNT=0

echo "=========================================================="
echo " Starting Al-Saifee API Smoke Tests on: ${BASE_URL}"
echo "=========================================================="

test_endpoint() {
  local description="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  local data="${5:-}"

  local response_file
  response_file=$(mktemp)
  local status

  if [ -n "$data" ]; then
    status=$(curl -s -o "$response_file" -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/json" -d "$data" "${BASE_URL}${path}")
  else
    status=$(curl -s -o "$response_file" -w "%{http_code}" -X "$method" "${BASE_URL}${path}")
  fi

  if [ "$status" -eq "$expected_status" ]; then
    echo "  [PASS] ${description} -> HTTP ${status}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  [FAIL] ${description} -> Expected ${expected_status}, got ${status}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  rm -f "$response_file"
}

# 1. Health check
test_endpoint "1. Health check GET /" "GET" "/" 200

# 2. Products list
test_endpoint "2. Public catalog GET /api/products" "GET" "/api/products" 200

# 3. Single product
test_endpoint "3. Single product GET /api/products/prod-001" "GET" "/api/products/prod-001" 200

# 4. Reviews list (PII safe)
test_endpoint "4. Public reviews GET /api/reviews" "GET" "/api/reviews" 200

# 5. Protected orders without token
test_endpoint "5. Protected orders GET /api/orders (no auth)" "GET" "/api/orders" 401

# 6. Store settings
test_endpoint "6. Store settings GET /api/settings" "GET" "/api/settings" 200

# 7. Unauthenticated admin endpoint
test_endpoint "7. Protected admin auth GET /api/auth/me (no auth)" "GET" "/api/auth/me" 401

# 8. Order lookup missing params
test_endpoint "8. Orders lookup GET /api/orders/lookup (empty params)" "GET" "/api/orders/lookup" 400

# 9. Admin registration disabled (single-admin security policy)
test_endpoint "9. Admin register disabled (returns 403)" "POST" "/api/auth/register" 403 '{"email":"test@example.com","password":"password123"}'

# 10. Customer auth required for checkout
test_endpoint "10. Checkout create-order (no customer auth -> 401)" "POST" "/api/checkout/create-order" 401 '{"items":[{"productId":"prod-001","quantity":1,"selectedSize":"50ml Spray"}],"customerName":"Smoke Test","customerEmail":"smoke@example.com"}'

# 11. Customer auth required for checkout verification
test_endpoint "11. Checkout verify (no customer auth -> 401)" "POST" "/api/checkout/verify" 401 '{"razorpay_order_id":"order_fake","razorpay_payment_id":"pay_fake","razorpay_signature":"invalid_sig"}'

# 12. Customer me endpoint requires token
test_endpoint "12. Customer profile GET /api/customer/me (no auth -> 401)" "GET" "/api/customer/me" 401

echo "=========================================================="
echo " Tests Complete: ${PASS_COUNT} Passed, ${FAIL_COUNT} Failed"
echo "=========================================================="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
