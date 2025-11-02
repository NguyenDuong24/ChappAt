# Script tạo Facebook Key Hash cho Windows
# Chạy script này từ thư mục project root

Write-Host "🔑 Tạo Facebook Key Hash..." -ForegroundColor Cyan
Write-Host ""

$keystorePath = "android\app\debug.keystore"
$alias = "androiddebugkey"
$storePass = "android"
$keyPass = "android"

if (Test-Path $keystorePath) {
    Write-Host "✅ Tìm thấy debug keystore: $keystorePath" -ForegroundColor Green
    
    try {
        # Tạo key hash
        $keyHash = keytool -exportcert -alias $alias -keystore $keystorePath -storepass $storePass -keypass $keyPass | openssl sha1 -binary | openssl base64
        
        Write-Host ""
        Write-Host "🎉 Facebook Key Hash (Debug):" -ForegroundColor Yellow
        Write-Host $keyHash -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Copy key hash này và paste vào Facebook Developer Console:" -ForegroundColor Cyan
        Write-Host "   Settings → Basic → Key Hashes → Add Platform → Android" -ForegroundColor Gray
        Write-Host ""
        
        # Copy to clipboard if possible
        $keyHash | Set-Clipboard -ErrorAction SilentlyContinue
        if ($?) {
            Write-Host "✅ Key hash đã được copy vào clipboard!" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "❌ Lỗi khi tạo key hash. Đảm bảo keytool và openssl đã được cài đặt." -ForegroundColor Red
        Write-Host "   Cài đặt OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Gray
    }
    
} else {
    Write-Host "❌ Không tìm thấy debug keystore tại: $keystorePath" -ForegroundColor Red
    Write-Host "   Hãy chạy 'npx expo run:android' trước để tạo keystore." -ForegroundColor Gray
}

Write-Host ""
Write-Host "📖 Xem hướng dẫn chi tiết trong SETUP_KEYS_GUIDE.md" -ForegroundColor Cyan
