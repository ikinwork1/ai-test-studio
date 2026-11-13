bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"

echo "==> Проверка Node.js"
if ! command -v node >/dev/null; then
  echo "❌ Node.js не найден. Установите Node 20+ из прилагаемого архива."
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || { echo "❌ Требуется Node.js 20+"; exit 1; }

echo "==> Разворачивание приложения"
mkdir -p "$APP"
cp -r "$ROOT/backend-dist" "$APP/backend-dist" 2>/dev/null || true
cp -r "$ROOT/frontend-dist" "$APP/frontend-dist" 2>/dev/null || true
# Если структура бандла отличается — адаптируйте пути выше

echo "==> Настройка прав на конфигурацию"
mkdir -p "$APP/config/apps" "$APP/.auth" "$APP/midscene_run"
chmod 700 "$APP/config/apps" "$APP/.auth"

echo "==> Переменные окружения"
[ -f "$APP/.env" ] || cp "$ROOT/.env.example" "$APP/.env"

echo "==> Проверка Ollama"
if ! curl -sf http://localhost:11434/api/tags | grep -q qwen2.5vl; then
  echo "⚠️  Модель qwen2.5vl не найдена в Ollama."
  echo "    Скопируйте содержимое ollama-models/ в ~/.ollama/models/ и перезапустите ollama."
fi

echo "==> Установка Playwright browsers path"
export PLAYWRIGHT_BROWSERS_PATH="$ROOT/playwright-browsers"
echo "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH" >> "$APP/.env"

echo "==> Запуск сервера"
cd "$APP"
nohup node backend-dist/server.js > midscene_run/server.log 2>&1 &
echo "✅ Сервер запущен: http://localhost:3000"
echo "   Лог: $APP/midscene_run/server.log"
