# Chat Performance Optimization Script
# Tự động áp dụng các tối ưu hóa chat

param(
    [switch]$Backup,
    [switch]$Apply,
    [switch]$Restore,
    [switch]$Test
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

Write-Host "🚀 Chat Performance Optimization Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Yellow

function Backup-Files {
    Write-Host "📋 Creating backups..." -ForegroundColor Cyan
    
    $filesToBackup = @(
        "app\chat\[id].tsx",
        "components\chat\MessageList.tsx",
        "components\chat\MessageItem.tsx",
        "hooks\useOptimizedChatMessages.ts"
    )
    
    foreach ($file in $filesToBackup) {
        $fullPath = Join-Path $ProjectRoot $file
        if (Test-Path $fullPath) {
            $backupPath = $fullPath -replace '\.(tsx?|ts)$', '.backup.$1'
            Copy-Item $fullPath $backupPath -Force
            Write-Host "  ✅ Backed up: $file" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Not found: $file" -ForegroundColor Yellow
        }
    }
    
    Write-Host "📋 Backup completed!" -ForegroundColor Green
}

function Apply-Optimizations {
    Write-Host "🔧 Applying optimizations..." -ForegroundColor Cyan
    
    # Create backup first
    Backup-Files
    
    # Apply optimizations
    $optimizations = @(
        @{
            From = "app\chat\optimized\[id].tsx"
            To = "app\chat\[id].tsx"
            Description = "Optimized chat room"
        },
        @{
            From = "components\chat\OptimizedMessageList.tsx" 
            To = "components\chat\MessageList.tsx"
            Description = "Optimized message list with FlatList"
        },
        @{
            From = "components\chat\OptimizedMessageItem.tsx"
            To = "components\chat\MessageItem.tsx" 
            Description = "Optimized message item with memo"
        },
        @{
            From = "hooks\useSuperOptimizedChat.ts"
            To = "hooks\useOptimizedChatMessages.ts"
            Description = "Super optimized chat hook"
        }
    )
    
    foreach ($opt in $optimizations) {
        $fromPath = Join-Path $ProjectRoot $opt.From
        $toPath = Join-Path $ProjectRoot $opt.To
        
        if (Test-Path $fromPath) {
            Copy-Item $fromPath $toPath -Force
            Write-Host "  ✅ Applied: $($opt.Description)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Missing: $($opt.From)" -ForegroundColor Red
        }
    }
    
    Write-Host "🔧 Optimizations applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. npm run build (or expo build)" -ForegroundColor White
    Write-Host "  2. Test the app thoroughly" -ForegroundColor White
    Write-Host "  3. Monitor performance improvements" -ForegroundColor White
    Write-Host "  4. Run with -Restore if any issues" -ForegroundColor White
}

function Restore-Files {
    Write-Host "🔄 Restoring original files..." -ForegroundColor Cyan
    
    $filesToRestore = @(
        "app\chat\[id].tsx",
        "components\chat\MessageList.tsx", 
        "components\chat\MessageItem.tsx",
        "hooks\useOptimizedChatMessages.ts"
    )
    
    foreach ($file in $filesToRestore) {
        $fullPath = Join-Path $ProjectRoot $file
        $backupPath = $fullPath -replace '\.(tsx?|ts)$', '.backup.$1'
        
        if (Test-Path $backupPath) {
            Copy-Item $backupPath $fullPath -Force
            Write-Host "  ✅ Restored: $file" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ No backup found: $file" -ForegroundColor Yellow
        }
    }
    
    Write-Host "🔄 Restoration completed!" -ForegroundColor Green
}

function Test-Performance {
    Write-Host "📊 Testing performance optimizations..." -ForegroundColor Cyan
    
    # Check if optimized files exist
    $optimizedFiles = @(
        "hooks\useOptimizedChat.ts",
        "hooks\useSuperOptimizedChat.ts",
        "components\chat\OptimizedMessageList.tsx",
        "components\chat\OptimizedMessageItem.tsx",
        "components\chat\OptimizedMessageInput.tsx",
        "services\chatPerformanceService.ts"
    )
    
    $allExist = $true
    foreach ($file in $optimizedFiles) {
        $fullPath = Join-Path $ProjectRoot $file
        if (Test-Path $fullPath) {
            Write-Host "  ✅ Found: $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Missing: $file" -ForegroundColor Red
            $allExist = $false
        }
    }
    
    if ($allExist) {
        Write-Host ""
        Write-Host "🎉 All optimization files are ready!" -ForegroundColor Green
        Write-Host "📋 You can now:" -ForegroundColor Yellow
        Write-Host "  • Run with -Apply to apply optimizations" -ForegroundColor White
        Write-Host "  • Test manually by visiting /chat/optimized/[id]" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "⚠️ Some files are missing. Please create them first." -ForegroundColor Red
    }
}

function Show-Help {
    Write-Host "📚 Usage:" -ForegroundColor Yellow
    Write-Host "  .\apply-chat-optimization.ps1 -Backup    # Create backups only" -ForegroundColor White
    Write-Host "  .\apply-chat-optimization.ps1 -Apply     # Apply optimizations" -ForegroundColor White
    Write-Host "  .\apply-chat-optimization.ps1 -Restore   # Restore original files" -ForegroundColor White
    Write-Host "  .\apply-chat-optimization.ps1 -Test      # Test if files are ready" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Examples:" -ForegroundColor Yellow
    Write-Host "  # Safe approach - backup first, then apply" -ForegroundColor Gray
    Write-Host "  .\apply-chat-optimization.ps1 -Backup" -ForegroundColor Gray
    Write-Host "  .\apply-chat-optimization.ps1 -Apply" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Quick test to see if ready" -ForegroundColor Gray
    Write-Host "  .\apply-chat-optimization.ps1 -Test" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # If something goes wrong" -ForegroundColor Gray
    Write-Host "  .\apply-chat-optimization.ps1 -Restore" -ForegroundColor Gray
}

# Main execution
try {
    if ($Backup) {
        Backup-Files
    } elseif ($Apply) {
        Apply-Optimizations
    } elseif ($Restore) {
        Restore-Files
    } elseif ($Test) {
        Test-Performance
    } else {
        Show-Help
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "📋 Please check the file paths and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "🏁 Script completed!" -ForegroundColor Green
