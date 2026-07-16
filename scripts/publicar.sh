#!/bin/bash
# Sube cambios a GitHub (un solo comando)
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-Integra PLD — actualización}"

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "$MSG"
else
  echo "ℹ No hay cambios nuevos para commitear."
fi

git pull origin main
git push origin push-clean:main

echo ""
echo "✓ Listo. Revisa Actions en GitHub (debería salir verde en ~2 min)."
echo "  https://juridicofiscaleg-cell.github.io/integra-pld/"
