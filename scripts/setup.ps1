# setup.ps1 - one-shot installer for Windows 10
# Run from project root: PowerShell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

Write-Host "[1/7] Checking Node.js" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Install Node.js 20 LTS." -ForegroundColor Red
    exit 1
}
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 20) {
    Write-Host "ERROR: Node.js 20+ required, found $nodeMajor" -ForegroundColor Red
    exit 1
}

Write-Host "[2/7] Checking Ollama" -ForegroundColor Cyan
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Ollama not found. Install from https://ollama.com/download" -ForegroundColor Red
    exit 1
}
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 | Out-Null
} catch {
    Write-Host "Starting Ollama in background..." -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

Write-Host "[3/7] Backend dependencies and build" -ForegroundColor Cyan
Set-Location -Path (Join-Path $Root "backend")
npm ci
npm run build

Write-Host "[4/7] Frontend dependencies and build" -ForegroundColor Cyan
Set-Location -Path (Join-Path $Root "frontend")
npm ci
npm run build

Write-Host "[5/7] Playwright Chromium" -ForegroundColor Cyan
Set-Location -Path $Root
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $Root "playwright-browsers"
npx playwright install chromium

Write-Host "[6/7] Ollama model" -ForegroundColor Cyan
$models = ollama list | Out-String
if ($models -notmatch "qwen2.5vl") {
    Write-Host "Pulling qwen2.5vl:7b ..." -ForegroundColor Yellow
    ollama pull qwen2.5vl:7b
}

Write-Host "[7/7] Config folders" -ForegroundColor Cyan
New-Item -ItemType Directory -Path (Join-Path $Root "config\apps")  -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Root ".auth")        -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Root "midscene_run") -Force | Out-Null

$envFile = Join-Path $Root ".env"
if (-not (Test-Path -Path $envFile)) {
    Copy-Item -Path (Join-Path $Root ".env.example") -Destination $envFile
}

Write-Host ""
Write-Host "SETUP COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Start server: cd $Root\backend"
Write-Host "     Then: node dist\server.js"
Write-Host "  2. Open http://localhost:3000"
Write-Host "  3. Add application and test, then run"
Write-Host "  4. Internet can be disconnected after verification"