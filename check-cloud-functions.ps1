# Script kiểm tra còn Cloud Functions reference nào không
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  KIỂM TRA CLOUD FUNCTIONS REFERENCES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$foundIssues = $false

# Kiểm tra imports
Write-Host "[1/4] Kiểm tra imports httpsCallable..." -ForegroundColor Yellow
$httpsCallableFiles = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,*.snap | 
    Select-String -Pattern "httpsCallable" -SimpleMatch

if ($httpsCallableFiles) {
    Write-Host "  ⚠ Tìm thấy httpsCallable trong các file:" -ForegroundColor Yellow
    $httpsCallableFiles | ForEach-Object {
        Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
    }
    $foundIssues = $true
} else {
    Write-Host "  ✓ Không có httpsCallable" -ForegroundColor Green
}

# Kiểm tra getFunctions
Write-Host "[2/4] Kiểm tra imports getFunctions..." -ForegroundColor Yellow
$getFunctionsFiles = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,*.snap | 
    Select-String -Pattern "getFunctions" -SimpleMatch

if ($getFunctionsFiles) {
    Write-Host "  ⚠ Tìm thấy getFunctions trong các file:" -ForegroundColor Yellow
    $getFunctionsFiles | ForEach-Object {
        Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
    }
    $foundIssues = $true
} else {
    Write-Host "  ✓ Không có getFunctions" -ForegroundColor Green
}

# Kiểm tra fbFunctions hoặc functions variable
Write-Host "[3/4] Kiểm tra biến functions..." -ForegroundColor Yellow
$functionsVarFiles = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,*.snap,firebaseConfig.js,firebaseConfig.ts | 
    Select-String -Pattern "fbFunctions|from.*functions" 

if ($functionsVarFiles) {
    Write-Host "  ⚠ Tìm thấy references đến functions trong các file:" -ForegroundColor Yellow
    $functionsVarFiles | ForEach-Object {
        Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
    }
    $foundIssues = $true
} else {
    Write-Host "  ✓ Không có functions references" -ForegroundColor Green
}

# Kiểm tra xem coinServerApi đã được import chưa
Write-Host "[4/4] Kiểm tra coinServerApi được sử dụng..." -ForegroundColor Yellow
$coinServerApiFiles = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx -Exclude node_modules,*.snap | 
    Select-String -Pattern "coinServerApi" -SimpleMatch

if ($coinServerApiFiles) {
    Write-Host "  ✓ coinServerApi được sử dụng trong:" -ForegroundColor Green
    $coinServerApiFiles | Select-Object -First 5 | ForEach-Object {
        Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
    }
    if ($coinServerApiFiles.Count -gt 5) {
        Write-Host "    ... và $($coinServerApiFiles.Count - 5) file khác" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ CHƯA có file nào dùng coinServerApi!" -ForegroundColor Yellow
    Write-Host "     Có thể bạn cần import và sử dụng nó." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($foundIssues) {
    Write-Host "⚠ CÒN MỘT SỐ CLOUD FUNCTIONS REFERENCES" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Hãy xem lại các file trên và:" -ForegroundColor Yellow
    Write-Host "  1. Xóa imports: httpsCallable, getFunctions" -ForegroundColor White
    Write-Host "  2. Thay thế bằng: coinServerApi" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✓ MIGRATION HOÀN TẤT!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tất cả Cloud Functions đã được thay thế." -ForegroundColor Green
    Write-Host ""
    Write-Host "Bước tiếp theo:" -ForegroundColor Cyan
    Write-Host "  1. Lấy Firebase Service Account Key" -ForegroundColor White
    Write-Host "     → Xem: coin-server\GET_FIREBASE_KEY.md" -ForegroundColor Gray
    Write-Host "  2. Chạy coin server:" -ForegroundColor White
    Write-Host "     → cd coin-server" -ForegroundColor Gray
    Write-Host "     → npm run dev" -ForegroundColor Gray
    Write-Host "  3. Test app của bạn!" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
