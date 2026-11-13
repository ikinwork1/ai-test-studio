@echo off
setlocal

REM === Project paths ===
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "BROWSERS_DIR=%PROJECT_ROOT%\playwright-browsers"

echo ========================================
echo   AI Test Studio - startup
echo ========================================
echo.

REM === 1. Check Ollama ===
echo [1/3] Checking Ollama...
powershell -NoProfile -Command "try { Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo    Ollama is not responding. Starting it in a separate PowerShell window...
    start "Ollama Server" powershell -NoExit -Command "ollama serve"
    echo    Waiting 8 seconds for Ollama to come up...
    timeout /t 8 /nobreak >nul

    powershell -NoProfile -Command "try { Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }"
    if errorlevel 1 (
        echo.
        echo [ERROR] Ollama did not start.
        echo Make sure Ollama is installed and "ollama" is available in PATH.
        pause
        exit /b 1
    )
    echo    Ollama started.
) else (
    echo    Ollama is already running.
)

REM === 2. Check model ===
echo.
echo [2/3] Checking qwen2.5vl-16k model...
powershell -NoProfile -Command "$tags = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 5; if (-not ($tags.models.name -match 'qwen2.5vl-16k')) { exit 1 } else { exit 0 }"
if errorlevel 1 (
    echo.
    echo [WARNING] Model qwen2.5vl-16k not found in Ollama.
    echo Create it with:
    echo    ollama create qwen2.5vl-16k -f Modelfile
    echo where Modelfile contains:
    echo    FROM qwen2.5vl:7b
    echo    PARAMETER num_ctx 16384
    echo.
    pause
    exit /b 1
)
echo    Model found.

REM === 3. Start server ===
echo.
echo [3/3] Starting AI Test Studio server...
echo.

cd /d "%BACKEND_DIR%"

REM Environment variables
set "PLAYWRIGHT_BROWSERS_PATH=%BROWSERS_DIR%"
set "NODE_OPTIONS=--import ./disable-undici-timeouts.mjs"

REM Open browser in 3 seconds (server will be up by then)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM Run server in the current window
node dist\server.js

REM If server stops - keep the window open
echo.
echo ========================================
echo   Server stopped. Press any key to exit.
echo ========================================
pause >nul