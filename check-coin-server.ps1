# Script kiểm tra cài đặt Coin Server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KIỂM TRA CÀI ĐẶT COIN SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Kiểm tra Node.js
Write-Host "[1/6] Kiểm tra Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js chưa được cài đặt!" -ForegroundColor Red
    $allGood = $false
}

# Kiểm tra npm
Write-Host "[2/6] Kiểm tra npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npm chưa được cài đặt!" -ForegroundColor Red
    $allGood = $false
}

# Kiểm tra thư mục coin-server
Write-Host "[3/6] Kiểm tra thư mục coin-server..." -ForegroundColor Yellow
if (Test-Path ".\coin-server") {
    Write-Host "  ✓ Thư mục coin-server tồn tại" -ForegroundColor Green
} else {
    Write-Host "  ✗ Không tìm thấy thư mục coin-server!" -ForegroundColor Red
    $allGood = $false
}

# Kiểm tra node_modules
Write-Host "[4/6] Kiểm tra dependencies..." -ForegroundColor Yellow
if (Test-Path ".\coin-server\node_modules") {
    Write-Host "  ✓ Dependencies đã được cài đặt" -ForegroundColor Green
} else {
    Write-Host "  ✗ Chưa cài đặt dependencies! Chạy: cd coin-server; npm install" -ForegroundColor Red
    $allGood = $false
}

# Kiểm tra .env
Write-Host "[5/6] Kiểm tra file .env..." -ForegroundColor Yellow
if (Test-Path ".\coin-server\.env") {
    Write-Host "  ✓ File .env tồn tại" -ForegroundColor Green
} else {
    Write-Host "  ⚠ File .env chưa tồn tại (sẽ dùng mặc định)" -ForegroundColor Yellow
}

# Kiểm tra firebase-service-account.json
Write-Host "[6/6] Kiểm tra Firebase Service Account..." -ForegroundColor Yellow
if (Test-Path ".\coin-server\firebase-service-account.json") {
    Write-Host "  ✓ Firebase service account đã được cấu hình" -ForegroundColor Green
} else {
    Write-Host "  ✗ Chưa có file firebase-service-account.json!" -ForegroundColor Red
    Write-Host "     Xem hướng dẫn tại: coin-server\GET_FIREBASE_KEY.md" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✓ TẤT CẢ ĐỀU OK! Sẵn sàng chạy server!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Để chạy server, sử dụng lệnh:" -ForegroundColor Cyan
    Write-Host "  cd coin-server" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✗ CÒN MỘT SỐ VẤN ĐỀ CẦN KHẮC PHỤC" -ForegroundColor Red
    Write-Host ""
    Write-Host "Xem hướng dẫn chi tiết tại:" -ForegroundColor Yellow
    Write-Host "  - COIN_SERVER_SETUP_GUIDE.md" -ForegroundColor White
    Write-Host "  - coin-server\GET_FIREBASE_KEY.md" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
