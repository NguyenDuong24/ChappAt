# Find all files that need navigation path updates

Write-Host "🔍 Scanning for files with old navigation paths..." -ForegroundColor Cyan
Write-Host ""

$results = @()

# Define search patterns
$patterns = @{
    "UserProfileScreen" = "/(screens)/user/UserProfileScreen"
    "ProfileEditScreen" = "/(screens)/user/ProfileEditScreen"
    "PostDetailScreen" = "/(screens)/social/PostDetailScreen"
    "HashtagScreen"= "/(screens)/social/HashtagScreen"
    "NotificationsScreen" = "/(screens)/social/NotificationsScreen"
    "CallScreen" = "/(screens)/call/CallScreen"
    "IncomingCallScreen" = "/(screens)/call/IncomingCallScreen"
    "ListenCallAcceptedScreen" = "/(screens)/call/ListenCallAcceptedScreen"
    "CoinWalletScreen" = "/(screens)/wallet/CoinWalletScreen"
    "HotSpotsScreen" = "/(screens)/hotspots/HotSpotsScreen"
    "HotSpotDetailScreen" = "/(screens)/hotspots/HotSpotDetailScreen"
    "HotSpotChatScreen" = "/(screens)/hotspots/HotSpotChatScreen"
    "GroupManagementScreen" = "/(screens)/groups/GroupManagementScreen"
}

# Search in app and components folders
$searchPaths = @("app", "components", "hooks", "services")

foreach ($screenName in $patterns.Keys) {
    Write-Host "Searching for: $screenName" -ForegroundColor Yellow
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            try {
                $files = Get-ChildItem -Path $path -Include "*.tsx","*.ts","*.jsx","*.js" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules" }
                
                foreach ($file in $files) {
                    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                    if ($content -match "['`"]/$screenName" -and $content -notmatch "\(screens\)") {
                        $lineNumber = 1
                        foreach ($line in (Get-Content $file.FullName)) {
                            if ($line -match "['`"]/$screenName" -and $line -notmatch "\(screens\)") {
                                $results += [PSCustomObject]@{
                                    File = $file.Name
                                    Path = $file.FullName
                                    Line = $lineNumber
                                    Screen = $screenName
                                    NewPath = $patterns[$screenName]
                                    Content = $line.Trim()
                                }
                            }
                            $lineNumber++
                        }
                    }
                }
            } catch {
                # Skip errors
            }
        }
    }
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host "RESULTS SUMMARY" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host ""

if ($results.Count -eq 0) {
    Write-Host "✅ No files found needing updates! All paths are already migrated." -ForegroundColor Green
} else {
    Write-Host "Found $($results.Count) locations needing updates:" -ForegroundColor Yellow
    Write-Host ""
    
    # Group by file
    $groupedResults = $results | Group-Object -Property File
    
    foreach ($group in $groupedResults) {
        Write-Host "📄 $($group.Name)" -ForegroundColor Cyan
        foreach ($item in $group.Group) {
            Write-Host "   Line $($item.Line): $($item.Screen)" -ForegroundColor White
            Write-Host "   Current: $($item.Content)" -ForegroundColor DarkGray
            Write-Host "   Update to: $($item.NewPath)" -ForegroundColor Yellow
            Write-Host ""
        }
    }
    
    # Save results to file
    $resultsFile = "migration-todo.txt"
    $results | Format-Table File, Line, Screen, Content -AutoSize | Out-File $resultsFile
    Write-Host "💾 Detailed results saved to: $resultsFile" -ForegroundColor Green
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host "NEXT STEPS" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host ""
Write-Host "1. Review the files listed above" -ForegroundColor White
Write-Host "2. Update each navigation path to use the new structure" -ForegroundColor White
Write-Host "3. Test the app with: npx expo start" -ForegroundColor White
Write-Host ""
