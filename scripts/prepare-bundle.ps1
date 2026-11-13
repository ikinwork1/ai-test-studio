# prepare-bundle.ps1
# Run from any folder: .\scripts\prepare-bundle.ps1
$ErrorActionPreference = "Stop"

$Root   = Split-Path -Parent $PSScriptRoot
$Bundle = Join-Path $Root "bundle"

Write-Host "==> Cleaning $Bundle" -ForegroundColor Cyan
if (Test-Path $Bundle) { Remove-Item $Bundle -Recurse -Force }
New-Item -ItemType Directory -Path $Bundle            | Out-Null
New-Item -ItemType Directory -Path "$Bundle\app"      | Out-Null
New-Item -ItemType Directory -Path "$Bundle\node_modules" | Out-Null
New-Item -ItemType Directory -Path "$Bundle\playwright-browsers" | Out-Null

# --- Backend ---
Write-Host "==> Building backend" -ForegroundColor Cyan
Set-Location "$Root\backend"
npm ci
npm run build
Copy-Item -Recurse -Force "dist" "$Bundle\app\backend-dist"

# --- Frontend ---
Write-Host "==> Building frontend" -ForegroundColor Cyan
Set-Location "$Root\frontend"
npm ci
npm run build
Copy-Item -Recurse -Force "dist" "$Bundle\app\frontend-dist"

# --- Sources and configs ---
Set-Location $Root
Copy-Item -Recurse -Force "cases"       "$Bundle\app\cases"
Copy-Item -Recurse -Force "config"      "$Bundle\app\config"
Copy-Item -Force ".env.example"         "$Bundle\app\.env.example"

# --- Production dependencies for backend ---
Write-Host "==> Installing production deps into bundle" -ForegroundColor Cyan
Set-Location "$Root\backend"
npm ci --omit=dev
Copy-Item -Recurse -Force "node_modules" "$Bundle\node_modules"

# --- Chromium for Playwright ---
Write-Host "==> Downloading Chromium into bundle" -ForegroundColor Cyan
Set-Location $Root
$env:PLAYWRIGHT_BROWSERS_PATH = "$Bundle\playwright-browsers"
npx playwright install chromium

# --- Ollama models ---
Write-Host "==> Copying Ollama models" -ForegroundColor Cyan
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Ollama is not installed. Install from https://ollama.com/download and retry." -ForegroundColor Red
    exit 1
}

$models = ollama list | Out-String
if ($models -notmatch "qwen2.5vl") {
    Write-Host "Pulling qwen2.5vl:7b (may take several minutes)..." -ForegroundColor Yellow
    ollama pull qwen2.5vl:7b
}

$ollamaModelsDir = Join-Path $env:HOMEPATH ".ollama\models"
if (-not (Test-Path $ollamaModelsDir)) {
    Write-Host "ERROR: Ollama models folder not found: $ollamaModelsDir" -ForegroundColor Red
    exit 1
}
Copy-Item -Recurse -Force $ollamaModelsDir "$Bundle\ollama-models"

# --- Summary ---
Write-Host ""
Write-Host "DONE. Bundle: $Bundle" -ForegroundColor Green
$size = (Get-ChildItem $Bundle -Recurse | Measure-Object Length -Sum).Sum / 1GB
Write-Host ("Total size: {0:N2} GB" -f $size)