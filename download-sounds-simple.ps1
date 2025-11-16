# Download sound files script
# Run this to download sample sound files

$soundsDir = "assets\sounds"

Write-Host "Downloading sound files..." -ForegroundColor Cyan

# notification.mp3
Write-Host "Downloading notification.mp3..."
Invoke-WebRequest -Uri "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" -OutFile "$soundsDir\notification.mp3"

# sent.mp3
Write-Host "Downloading sent.mp3..."
Invoke-WebRequest -Uri "https://assets.mixkit.co/active_storage/sfx/2363/2363-preview.mp3" -OutFile "$soundsDir\sent.mp3"

# success.mp3  
Write-Host "Downloading success.mp3..."
Invoke-WebRequest -Uri "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" -OutFile "$soundsDir\success.mp3"

# error.mp3
Write-Host "Downloading error.mp3..."
Invoke-WebRequest -Uri "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" -OutFile "$soundsDir\error.mp3"

Write-Host "Done!" -ForegroundColor Green
