#!/bin/bash
# Quita .github del commit para que el push no pida permiso "workflow"
set -euo pipefail
cd "$(dirname "$0")/.."

git checkout push-clean 2>/dev/null || git checkout -b push-clean
git rm -rf .github 2>/dev/null || true
git add -A
git commit -m "Integra PLD — código completo" --allow-empty 2>/dev/null || git commit -m "Integra PLD — código completo"

echo ""
echo "✓ Listo. Ahora corre:"
echo "  git push -f origin push-clean:main"
echo ""
echo "Luego en GitHub vuelve a crear deploy.yml (Paso B en PUBLICAR-GITHUB.md)"
