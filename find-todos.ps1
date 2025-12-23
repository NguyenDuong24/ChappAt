# Find Files Needing Navigation Updates

Write-Host "Scanning for old navigation paths..." -ForegroundColor Cyan
Write-Host ""

$count = 0

# Search patterns
$screens = @(
    "UserProfileScreen",
    "ProfileEditScreen",
    "PostDetailScreen",
    "HashtagScreen",
    "NotificationsScreen",
    "CallScreen",
    "IncomingCallScreen",
    "ListenCallAcceptedScreen",
    "CoinWalletScreen",
    "HotSpotsScreen",
    "HotSpotDetailScreen",
    "HotSpotChatScreen",
    "GroupManagementScreen"
)

foreach ($screen in $screens) {
    Write-Host "Checking: $screen..." -ForegroundColor Yellow
    
    $matches = Select-String -Path "app\**\*.tsx","app\**\*.ts","app\**\*.jsx","app\**\*.js","components\**\*.tsx","components\**\*.ts","hooks\**\*.js","services\**\*.ts" -Pattern "/$screen" -ErrorAction SilentlyContinue | Where-Object { $_.Line -notmatch "\(screens\)" }
    
    if ($matches) {
        foreach ($match in $matches) {
            Write-Host "  File: $($match.Filename)" -ForegroundColor White
            Write-Host "  Line $($match.LineNumber): $($match.Line.Trim())" -ForegroundColor Gray
            Write-Host ""
            $count++
        }
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Total locations found: $count" -ForegroundColor Green  
Write-Host "================================" -ForegroundColor Green
Write-Host ""

if ($count -eq 0) {
    Write-Host "All paths are already migrated!" -ForegroundColor Green
} else {
    Write-Host "Please update these files to use new (screens) paths" -ForegroundColor Yellow
    Write-Host "See NAVIGATION_MIGRATION_GUIDE.md for details" -ForegroundColor Yellow
}
