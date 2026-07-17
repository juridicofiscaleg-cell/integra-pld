#!/bin/bash
# Sube cambios a GitHub (evita error OAuth con .github/workflows)
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-Integra PLD — actualización}"

git fetch origin main

# Mantener deploy.yml del remoto (incluye cambios hechos en github.com)
git checkout origin/main -- .github/workflows/deploy.yml 2>/dev/null || true

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add .
  git reset HEAD .github/ 2>/dev/null || true
  git commit -m "$MSG" || true
else
  echo "ℹ No hay cambios nuevos para commitear."
fi

git pull origin main --no-rebase --no-edit
git push origin push-clean:main

echo ""
echo "✓ Listo. Revisa Actions en GitHub (debería salir verde en ~2 min)."
echo "  https://juridicofiscaleg-cell.github.io/integra-pld/"
echo ""
echo "  ⚠ Usa SIEMPRE la URL con /integra-pld/ — sin eso la página queda en blanco."
echo ""
echo "Nota: si cambias deploy.yml, hazlo en github.com (Add file), no desde terminal."
