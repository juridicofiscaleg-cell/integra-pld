#!/bin/bash
# Sube el código SIN el archivo de Actions (evita el error de permiso "workflow")
# Después agregas deploy.yml manualmente en github.com (Paso B del README)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Preparando push sin .github/workflows..."

git checkout --orphan push-clean
git add -A
git reset HEAD .github 2>/dev/null || true
git commit -m "Integra PLD — código base"

echo ""
echo "==> Ahora corre:"
echo "  git push -f origin push-clean:main"
echo ""
echo "Si pide usuario/contraseña:"
echo "  Usuario: juridicofiscaleg-cell"
echo "  Contraseña: tu token de GitHub (o contraseña si no usas token)"
echo ""
echo "==> Después del push exitoso, ve a GitHub y crea el workflow (Paso B)."
