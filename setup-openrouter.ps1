# Setup OpenRouter for ChappAt
# Run: .\setup-openrouter.ps1

Write-Host "🔧 Setting up OpenRouter Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

# Check if OPENROUTER_API_KEY exists in .env
$envContent = Get-Content ".env" -Raw
if ($envContent -match "OPENROUTER_API_KEY") {
    Write-Host "✅ OPENROUTER_API_KEY already configured" -ForegroundColor Green
} else {
    Write-Host "⚠️  OPENROUTER_API_KEY not found in .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Get your API key at: https://openrouter.ai/keys" -ForegroundColor Cyan
    Write-Host ""
    
    $apiKey = Read-Host "Enter your OpenRouter API Key"
    
    if ($apiKey) {
        Add-Content ".env" ""
        Add-Content ".env" "# OPENROUTER CONFIGURATION"
        Add-Content ".env" "OPENROUTER_API_KEY=$apiKey"
        Add-Content ".env" "OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct"
        Write-Host "✅ API Key added to .env" -ForegroundColor Green
    } else {
        Write-Host "❌ API Key not provided" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan

# Check if node-fetch is installed
if (!(npm list node-fetch 2>$null | Select-String "node-fetch")) {
    Write-Host "📥 Installing node-fetch..." -ForegroundColor Yellow
    npm install node-fetch@2
} else {
    Write-Host "✅ node-fetch already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  node openrouter-cli.mjs ""Your prompt here""" -ForegroundColor White
Write-Host "  node openrouter-cli.mjs ""What is React?"" --model claude-haiku" -ForegroundColor White
Write-Host "  node openrouter-cli.mjs ""Write code"" --stream" -ForegroundColor White
Write-Host ""
Write-Host "Available models:" -ForegroundColor Cyan
Write-Host "  llama-3-8b (FREE)" -ForegroundColor Yellow
Write-Host "  llama-2-7b (FREE)" -ForegroundColor Yellow
Write-Host "  mistral (FREE)" -ForegroundColor Yellow
Write-Host "  claude-opus" -ForegroundColor White
Write-Host "  claude-sonnet" -ForegroundColor White
Write-Host "  claude-haiku" -ForegroundColor White
Write-Host ""
