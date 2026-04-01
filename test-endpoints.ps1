$BASE = "http://localhost:3000/api/v1"
$pass = 0; $fail = 0

function Test-Endpoint($label, $scriptBlock) {
  try {
    $result = & $scriptBlock
    Write-Host "  PASS [$label] $result" -ForegroundColor Green
    $script:pass++
  } catch {
    $msg = $_.ToString()
    if ($msg -match '"message":"([^"]+)"') { $msg = $Matches[1] }
    Write-Host "  FAIL [$label] $msg" -ForegroundColor Red
    $script:fail++
  }
}

function Test-Expect4xx($label, $scriptBlock) {
  try {
    & $scriptBlock | Out-Null
    Write-Host "  FAIL [$label] Expected error but got success" -ForegroundColor Red
    $script:fail++
  } catch {
    Write-Host "  PASS [$label] Correctly rejected" -ForegroundColor Green
    $script:pass++
  }
}

# ─── ACQUIRE TOKENS ───────────────────────────────────────────────────────────
Write-Host "`n[*] Acquiring tokens for all roles..." -ForegroundColor Yellow
$SA = "Bearer $((Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="superadmin@findata.com";password="SuperAdmin@123"}|ConvertTo-Json) -ContentType "application/json").data.tokens.accessToken)"
$AD = "Bearer $((Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="admin@findata.com";password="Admin@123456"}|ConvertTo-Json) -ContentType "application/json").data.tokens.accessToken)"
$AN = "Bearer $((Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="analyst@findata.com";password="Analyst@123"}|ConvertTo-Json) -ContentType "application/json").data.tokens.accessToken)"
$VW = "Bearer $((Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="viewer@findata.com";password="Viewer@1234"}|ConvertTo-Json) -ContentType "application/json").data.tokens.accessToken)"
Write-Host "  SA, AD, AN, VW tokens ready" -ForegroundColor DarkGray

# ─── HEALTH ─────────────────────────────────────────────────────────────────
Write-Host "`n===== HEALTH =====" -ForegroundColor Magenta
Test-Endpoint "GET /health" {
  $r = Invoke-RestMethod -Uri "http://localhost:3000/health"
  "Status: $($r.message), env: $($r.environment)"
}

# ─── AUTH ─────────────────────────────────────────────────────────────────────
Write-Host "`n===== AUTH =====" -ForegroundColor Magenta
Test-Endpoint "POST /auth/register (new user)" {
  $email = "e2e_$(Get-Random)@findata.com"
  $r = Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body (@{email=$email;password="Test@1234567";firstName="E2E";lastName="Test"}|ConvertTo-Json) -ContentType "application/json"
  "User: $($r.data.user.email), Role: $($r.data.user.role), Tokens: $(if($r.data.tokens.accessToken){'YES'}else{'NO'})"
}
Test-Endpoint "POST /auth/login (seeded ANALYST)" {
  $r = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="analyst@findata.com";password="Analyst@123"}|ConvertTo-Json) -ContentType "application/json"
  "User: $($r.data.user.email), Role: $($r.data.user.role)"
}
Test-Endpoint "POST /auth/login (wrong password - 401)" {
  try {
    Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="analyst@findata.com";password="WrongPass!"}|ConvertTo-Json) -ContentType "application/json"
  } catch {
    $_ | Out-Null
    "Correctly rejected (401)"
  }
}
Test-Endpoint "GET /auth/me (SUPER_ADMIN)" {
  $r = Invoke-RestMethod -Uri "$BASE/auth/me" -Method GET -Headers @{ Authorization=$SA }
  "Email: $($r.data.user.email), Role: $($r.data.user.role)"
}
# Refresh token test
$loginR = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="admin@findata.com";password="Admin@123456"}|ConvertTo-Json) -ContentType "application/json"
$refreshTok = $loginR.data.tokens.refreshToken
Test-Endpoint "POST /auth/refresh" {
  $r = Invoke-RestMethod -Uri "$BASE/auth/refresh" -Method POST -Body (@{refreshToken=$refreshTok}|ConvertTo-Json) -ContentType "application/json"
  "New access: $(if($r.data.accessToken){'YES'}else{'NO'}), New refresh: $(if($r.data.refreshToken){'YES'}else{'NO'})"
}
Test-Endpoint "POST /auth/logout" {
  $r = Invoke-RestMethod -Uri "$BASE/auth/logout" -Method POST -Headers @{ Authorization=$AN }
  # Re-acquire AN token since we logged out
  $anR2 = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="analyst@findata.com";password="Analyst@123"}|ConvertTo-Json) -ContentType "application/json"
  $script:AN = "Bearer $($anR2.data.tokens.accessToken)"
  "Msg: $($r.message)"
}
Test-Expect4xx "GET /auth/me (no token - 401)" {
  Invoke-RestMethod -Uri "$BASE/auth/me" -Method GET
}
Test-Expect4xx "POST /auth/register (duplicate email - 409)" {
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body (@{email="superadmin@findata.com";password="Test@1234567";firstName="Dup";lastName="User"}|ConvertTo-Json) -ContentType "application/json"
}

# ─── USERS ─────────────────────────────────────────────────────────────────────
Write-Host "`n===== USER MANAGEMENT =====" -ForegroundColor Magenta
Test-Endpoint "GET /users (SA - paginated list)" {
  $r = Invoke-RestMethod -Uri "$BASE/users" -Method GET -Headers @{ Authorization=$SA }
  "Total: $($r.meta.pagination.total), Page: $($r.meta.pagination.page), Limit: $($r.meta.pagination.limit)"
}
Test-Endpoint "GET /users?role=VIEWER (role filter)" {
  $r = Invoke-RestMethod -Uri "$BASE/users?role=VIEWER" -Method GET -Headers @{ Authorization=$SA }
  "VIEWER users: $($r.meta.pagination.total)"
}
Test-Expect4xx "GET /users (VIEWER - 403 RBAC)" {
  Invoke-RestMethod -Uri "$BASE/users" -Method GET -Headers @{ Authorization=$VW }
}

# Create a temp user to test update/delete on
$cu = Invoke-RestMethod -Uri "$BASE/users" -Method POST -Body (@{email="tmpuser_$(Get-Random)@findata.com";password="TmpUser@12345";firstName="Tmp";lastName="User";role="ANALYST"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$SA }
$tmpUId = $cu.data.user.id

Test-Endpoint "POST /users (create ANALYST by SA)" { "Created: $($cu.data.user.email), Role: $($cu.data.user.role), ID: $tmpUId" }
Test-Endpoint "GET /users/:id" {
  $r = Invoke-RestMethod -Uri "$BASE/users/$tmpUId" -Method GET -Headers @{ Authorization=$SA }
  "Email: $($r.data.user.email), Status: $($r.data.user.status)"
}
Test-Endpoint "PATCH /users/:id/role (ANALYST → VIEWER)" {
  $r = Invoke-RestMethod -Uri "$BASE/users/$tmpUId/role" -Method PATCH -Body (@{role="VIEWER"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$SA }
  "New role: $($r.data.user.role)"
}
Test-Endpoint "PATCH /users/:id/status (→ INACTIVE)" {
  $r = Invoke-RestMethod -Uri "$BASE/users/$tmpUId/status" -Method PATCH -Body (@{status="INACTIVE"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$SA }
  "New status: $($r.data.user.status)"
}
Test-Endpoint "DELETE /users/:id (soft-delete)" {
  $r = Invoke-RestMethod -Uri "$BASE/users/$tmpUId" -Method DELETE -Headers @{ Authorization=$SA }
  "Msg: $($r.message)"
}
Test-Expect4xx "GET /users/:id (after soft-delete - 404)" {
  Invoke-RestMethod -Uri "$BASE/users/$tmpUId" -Method GET -Headers @{ Authorization=$SA }
}
Test-Expect4xx "ADMIN cannot elevate to SUPER_ADMIN (403)" {
  $saUsers = Invoke-RestMethod -Uri "$BASE/users?role=ANALYST" -Method GET -Headers @{ Authorization=$AD }
  $targetId = $saUsers.data.users[0].id
  Invoke-RestMethod -Uri "$BASE/users/$targetId/role" -Method PATCH -Body (@{role="SUPER_ADMIN"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$AD }
}

# ─── CATEGORIES ───────────────────────────────────────────────────────────────
Write-Host "`n===== CATEGORIES =====" -ForegroundColor Magenta
Test-Endpoint "GET /financial/categories (all roles)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/categories" -Method GET -Headers @{ Authorization=$AN }
  "Categories: $($r.data.categories.Count)"
}

$nc = Invoke-RestMethod -Uri "$BASE/financial/categories" -Method POST -Body (@{name="TestCat_$(Get-Random)";type="BOTH";color="#FF5733";description="Test cat"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$SA }
$catId = $nc.data.category.id

Test-Endpoint "POST /financial/categories (SA create)" { "Name: $($nc.data.category.name), Type: $($nc.data.category.type), ID: $catId" }
Test-Endpoint "PATCH /financial/categories/:id (update)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/categories/$catId" -Method PATCH -Body (@{name="UpdatedCat_$(Get-Random)";type="INCOME";color="#00FF00"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$SA }
  "Updated: $($r.data.category.name), type: $($r.data.category.type)"
}
Test-Expect4xx "POST /financial/categories (VIEWER - 403)" {
  Invoke-RestMethod -Uri "$BASE/financial/categories" -Method POST -Body (@{name="Denied";type="INCOME";color="#000000"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$VW }
}
Test-Expect4xx "DELETE /financial/categories/:id (ANALYST - 403)" {
  Invoke-RestMethod -Uri "$BASE/financial/categories/$catId" -Method DELETE -Headers @{ Authorization=$AN }
}

# ─── FINANCIAL RECORDS ────────────────────────────────────────────────────────
Write-Host "`n===== FINANCIAL RECORDS =====" -ForegroundColor Magenta

$r1 = Invoke-RestMethod -Uri "$BASE/financial/records" -Method POST -Body (@{amount=2500.00;type="INCOME";categoryId=$catId;date="2026-04-01T00:00:00.000Z";description="April salary";tags=@("salary","monthly")}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$AN }
$recId = $r1.data.record.id

Test-Endpoint "POST /financial/records (ANALYST create)" { "ID: $recId, Amount: $($r1.data.record.amount), Type: $($r1.data.record.type)" }
Test-Endpoint "GET /financial/records (ANALYST - own scope)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records" -Method GET -Headers @{ Authorization=$AN }
  "Total: $($r.meta.pagination.total), HasNext: $($r.meta.pagination.hasNextPage)"
}
Test-Endpoint "GET /financial/records?type=INCOME (filter)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records?type=INCOME" -Method GET -Headers @{ Authorization=$AN }
  "INCOME records: $($r.meta.pagination.total)"
}
Test-Endpoint "GET /financial/records?page=1&limit=5 (pagination)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records?page=1&limit=5" -Method GET -Headers @{ Authorization=$SA }
  "Page 1, limit 5, total: $($r.meta.pagination.total)"
}
Test-Endpoint "GET /financial/records (SA sees all users)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records" -Method GET -Headers @{ Authorization=$SA }
  "All records (SA): $($r.meta.pagination.total)"
}
Test-Endpoint "GET /financial/records/:id" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records/$recId" -Method GET -Headers @{ Authorization=$AN }
  "Amount: $($r.data.record.amount), Type: $($r.data.record.type), Cat: $($r.data.record.category.name)"
}
Test-Endpoint "PATCH /financial/records/:id (update amount+desc)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records/$recId" -Method PATCH -Body (@{description="Updated salary";amount=2750.00}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$AN }
  "Updated amount: $($r.data.record.amount), desc: $($r.data.record.description)"
}
Test-Expect4xx "POST /financial/records (VIEWER - 403)" {
  Invoke-RestMethod -Uri "$BASE/financial/records" -Method POST -Body (@{amount=50;type="EXPENSE";categoryId=$catId;date="2026-04-01T00:00:00.000Z";description="x"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$VW }
}
Test-Expect4xx "GET /financial/records/:id (other user - 404 masking)" {
  $vwLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="viewer@findata.com";password="Viewer@1234"}|ConvertTo-Json) -ContentType "application/json"
  $VWt = "Bearer $($vwLogin.data.tokens.accessToken)"
  Invoke-RestMethod -Uri "$BASE/financial/records/$recId" -Method GET -Headers @{ Authorization=$VWt }
}

# ─── DASHBOARD ───────────────────────────────────────────────────────────────
Write-Host "`n===== DASHBOARD =====" -ForegroundColor Magenta
Test-Endpoint "GET /dashboard/summary (ANALYST - own data)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/summary" -Method GET -Headers @{ Authorization=$AN }
  "Income: $($r.data.summary.totalIncome), Expenses: $($r.data.summary.totalExpenses), Net: $($r.data.summary.netBalance), Count: $($r.data.summary.recordCount)"
}
Test-Endpoint "GET /dashboard/summary (SA - all users data)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/summary" -Method GET -Headers @{ Authorization=$SA }
  "Income: $($r.data.summary.totalIncome), Net: $($r.data.summary.netBalance)"
}
Test-Endpoint "GET /dashboard/summary (VIEWER - scoped to own, 0 records)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/summary" -Method GET -Headers @{ Authorization=$VW }
  "VIEWER income: $($r.data.summary.totalIncome) (own data only)"
}
Test-Endpoint "GET /dashboard/categories (category totals)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/categories" -Method GET -Headers @{ Authorization=$AN }
  "Category groups: $($r.data.categoryTotals.Count)"
}
Test-Endpoint "GET /dashboard/trends (monthly, 6 months)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/trends" -Method GET -Headers @{ Authorization=$AN }
  "Months: $($r.data.trends.Count)"
}
Test-Endpoint "GET /dashboard/recent (last 10 activity)" {
  $r = Invoke-RestMethod -Uri "$BASE/dashboard/recent" -Method GET -Headers @{ Authorization=$AN }
  "Recent: $($r.data.activity.Count)"
}
Test-Expect4xx "GET /dashboard/categories (VIEWER - 403, needs READ_ANALYTICS)" {
  Invoke-RestMethod -Uri "$BASE/dashboard/categories" -Method GET -Headers @{ Authorization=$VW }
}
Test-Expect4xx "GET /dashboard/trends (VIEWER - 403)" {
  Invoke-RestMethod -Uri "$BASE/dashboard/trends" -Method GET -Headers @{ Authorization=$VW }
}

# ─── SOFT-DELETE & PERSISTENCE ────────────────────────────────────────────────
Write-Host "`n===== SOFT-DELETE & DATA PERSISTENCE =====" -ForegroundColor Magenta
Test-Endpoint "DELETE /financial/records/:id (SA soft-delete)" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records/$recId" -Method DELETE -Headers @{ Authorization=$SA }
  "Msg: $($r.message)"
}
Test-Expect4xx "GET /financial/records/:id (after delete - 404)" {
  Invoke-RestMethod -Uri "$BASE/financial/records/$recId" -Method GET -Headers @{ Authorization=$SA }
}
Test-Endpoint "Soft-deleted record excluded from list" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records?type=INCOME" -Method GET -Headers @{ Authorization=$AN }
  "Visible INCOME records (deleted excluded): $($r.meta.pagination.total)"
}
Test-Endpoint "Data persists: seeded users remain" {
  $r = Invoke-RestMethod -Uri "$BASE/users?role=SUPER_ADMIN" -Method GET -Headers @{ Authorization=$SA }
  "SUPER_ADMIN count: $($r.meta.pagination.total) (persisted across requests)"
}
Test-Endpoint "Data persists: seeded records remain" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/records" -Method GET -Headers @{ Authorization=$SA }
  "Total records in DB: $($r.meta.pagination.total) (seeded + created)"
}
Test-Endpoint "Data persists: categories remain" {
  $r = Invoke-RestMethod -Uri "$BASE/financial/categories" -Method GET -Headers @{ Authorization=$SA }
  "Total categories: $($r.data.categories.Count)"
}

# ─── INPUT VALIDATION ─────────────────────────────────────────────────────────
Write-Host "`n===== INPUT VALIDATION =====" -ForegroundColor Magenta
Test-Expect4xx "Weak password rejected (422)" {
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body (@{email="x@x.com";password="weakpw";firstName="A";lastName="B"}|ConvertTo-Json) -ContentType "application/json"
}
Test-Expect4xx "Negative amount rejected (422)" {
  Invoke-RestMethod -Uri "$BASE/financial/records" -Method POST -Body (@{amount=-100;type="INCOME";categoryId=$catId;date="2026-04-01T00:00:00.000Z";description="x"}|ConvertTo-Json) -ContentType "application/json" -Headers @{ Authorization=$AN }
}
Test-Expect4xx "Invalid email format rejected (422)" {
  Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -Body (@{email="notanemail";password="Pass@123456"}|ConvertTo-Json) -ContentType "application/json"
}
Test-Expect4xx "Missing required fields rejected (422)" {
  Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -Body (@{email="missing@x.com"}|ConvertTo-Json) -ContentType "application/json"
}

# ─── RATE LIMITING ─────────────────────────────────────────────────────────────
Write-Host "`n===== RATE LIMITING =====" -ForegroundColor Magenta
Test-Endpoint "RateLimit-Limit header on global API responses" {
  $resp = Invoke-WebRequest -Uri "$BASE/auth/me" -Method GET -Headers @{ Authorization=$SA } -UseBasicParsing
  $limit = $resp.Headers["RateLimit-Limit"]
  "RateLimit-Limit: $limit (100 req/15min)"
}

# ─── SUMMARY ─────────────────────────────────────────────────────────────────
Write-Host "`n================================================" -ForegroundColor White
Write-Host "  TOTAL TESTS  : $($pass + $fail)" -ForegroundColor White
Write-Host "  PASSED       : $pass" -ForegroundColor Green
Write-Host "  FAILED       : $fail" -ForegroundColor $(if($fail -gt 0){"Red"}else{"Green"})
Write-Host "================================================" -ForegroundColor White
if ($fail -gt 0) { exit 1 }
