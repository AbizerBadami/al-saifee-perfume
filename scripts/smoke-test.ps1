# ============================================================
# Al-Saifee Perfumes — Automated PowerShell Smoke Test Script
# Tests all critical endpoints against the deployed Cloudflare Worker
# ============================================================

param(
    [string]$BaseUrl = "https://al-saifee-api.al-saifee-worker.workers.dev"
)

$passCount = 0
$failCount = 0

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Al-Saifee API Smoke Tests on: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

function Run-Test {
    param(
        [string]$Description,
        [string]$Method,
        [string]$Path,
        [int]$ExpectedStatus,
        [string]$Body = $null
    )

    $url = "$BaseUrl$Path"
    try {
        $params = @{
            Uri = $url
            Method = $Method
            UseBasicParsing = $true
        }
        if ($Body) {
            $params["Body"] = $Body
            $params["ContentType"] = "application/json"
        }
        $res = Invoke-WebRequest @params
        $statusCode = $res.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
        } else {
            $statusCode = 0
        }
    }

    if ($statusCode -eq $ExpectedStatus) {
        Write-Host "  [PASS] $Description -> HTTP $statusCode" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  [FAIL] $Description -> Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
        $script:failCount++
    }
}

# 1. Health check
Run-Test -Description "1. Health check GET /" -Method "GET" -Path "/" -ExpectedStatus 200

# 2. Products catalog
Run-Test -Description "2. Public catalog GET /api/products" -Method "GET" -Path "/api/products" -ExpectedStatus 200

# 3. Single product
Run-Test -Description "3. Single product GET /api/products/prod-001" -Method "GET" -Path "/api/products/prod-001" -ExpectedStatus 200

# 4. Public reviews
Run-Test -Description "4. Public reviews GET /api/reviews" -Method "GET" -Path "/api/reviews" -ExpectedStatus 200

# 5. Protected orders without token
Run-Test -Description "5. Protected orders GET /api/orders (no auth)" -Method "GET" -Path "/api/orders" -ExpectedStatus 401

# 6. Protected tasks without token
Run-Test -Description "6. Protected tasks GET /api/tasks (no auth)" -Method "GET" -Path "/api/tasks" -ExpectedStatus 401

# 7. Protected admin auth
Run-Test -Description "7. Protected admin auth GET /api/auth/me" -Method "GET" -Path "/api/auth/me" -ExpectedStatus 401

# 8. Orders lookup missing params
Run-Test -Description "8. Orders lookup GET /api/orders/lookup (empty params)" -Method "GET" -Path "/api/orders/lookup" -ExpectedStatus 400

# 9. Admin register short password validation
Run-Test -Description "9. Admin register short password validation" -Method "POST" -Path "/api/auth/register" -ExpectedStatus 400 -Body '{"email":"test@example.com","password":"short"}'

# 10. Checkout order creation with verified items
Run-Test -Description "10. Checkout create-order POST /api/checkout/create-order" -Method "POST" -Path "/api/checkout/create-order" -ExpectedStatus 200 -Body '{"items":[{"productId":"prod-001","quantity":1,"selectedSize":"50ml Spray"}],"customerName":"Smoke Test","customerEmail":"smoke@example.com"}'

# 11. Checkout verify fake signature rejection
Run-Test -Description "11. Checkout verify forgery rejection" -Method "POST" -Path "/api/checkout/verify" -ExpectedStatus 400 -Body '{"razorpay_order_id":"order_fake","razorpay_payment_id":"pay_fake","razorpay_signature":"invalid_sig"}'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Tests Complete: $passCount Passed, $failCount Failed" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
}
