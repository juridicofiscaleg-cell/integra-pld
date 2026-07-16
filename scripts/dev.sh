#!/bin/bash
# Inicia Integra PLD en local (un solo comando)
set -euo pipefail
export PATH="$HOME/.local/node-v22.17.0-darwin-arm64/bin:$PATH"
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node no encontrado. Instala Node o revisa la ruta en este script."
  exit 1
fi

# Cierra servidores viejos en puertos 5173-5179
for port in 5173 5174 5175 5176 5177 5178 5179; do
  lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

echo ""
echo "✓ Iniciando Integra PLD..."
echo "  Cuando veas la URL, ábrela en el navegador."
echo "  Para detener: Ctrl + C"
echo ""

npm run dev -- --port 5173
