# Script để tải file âm thanh mẫu
# Chạy script này để tự động tải các file âm thanh cần thiết

Write-Host "🔊 Downloading sound files for ChappAt..." -ForegroundColor Cyan

$soundsDir = "c:\Users\Admin\Desktop\Chat\ChappAt\assets\sounds"

# Tạo thư mục nếu chưa có
if (-not (Test-Path $soundsDir)) {
    New-Item -ItemType Directory -Path $soundsDir -Force
}

# URLs âm thanh mẫu (free sounds)
$sounds = @{
    "notification.mp3" = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"
    "sent.mp3" = "https://assets.mixkit.co/active_storage/sfx/2363/2363-preview.mp3"
    "success.mp3" = "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3"
    "error.mp3" = "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3"
}

Write-Host "`nDownloading files..." -ForegroundColor Yellow

foreach ($file in $sounds.Keys) {
    $url = $sounds[$file]
    $destination = Join-Path $soundsDir $file
    
    Write-Host "  Downloading $file..." -ForegroundColor Gray
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
        Write-Host "  ✓ Downloaded $file" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ Failed to download $file" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n✅ Sound files download complete!" -ForegroundColor Green
Write-Host "📁 Location: $soundsDir" -ForegroundColor Cyan
Write-Host "`nNote: You may need to add more sound files manually:" -ForegroundColor Yellow
Write-Host "  - ring.mp3 (call ringtone)" -ForegroundColor Gray
Write-Host "  - end.mp3 (call end sound)" -ForegroundColor Gray
Write-Host "  - accepted.mp3 (call accepted)" -ForegroundColor Gray
Write-Host "  - typing.mp3 (typing indicator)" -ForegroundColor Gray
Write-Host "`nRecommended sources:" -ForegroundColor Yellow
Write-Host "  - https://mixkit.co/free-sound-effects/" -ForegroundColor Blue
Write-Host "  - https://pixabay.com/sound-effects/" -ForegroundColor Blue
Write-Host "  - https://freesound.org/" -ForegroundColor Blue
