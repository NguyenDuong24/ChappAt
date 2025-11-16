# Script to restart Metro bundler with clean cache

Write-Host "🔄 Restarting Metro Bundler with clean cache..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing Metro processes
Write-Host "Stopping existing Metro processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -like "*Metro*"} | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear cache and start Metro
Write-Host "Clearing cache and starting Metro..." -ForegroundColor Yellow
Write-Host ""

# Run expo start with clear cache
npx expo start -c

Write-Host ""
Write-Host "✅ Metro bundler started with clean cache!" -ForegroundColor Green
Write-Host "Now open your app and test the sounds!" -ForegroundColor Cyan
