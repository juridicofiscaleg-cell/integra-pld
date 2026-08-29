#!/bin/bash
# Sube cambios a GitHub (evita error OAuth con .github/workflows)
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-Integra PLD — actualización}"

# El credential helper de gh en /tmp suele romperse tras reiniciar Mac.
# Forzamos osxkeychain solo en este script (no modifica tu git config global).
git_cmd() {
  git -c credential.helper=osxkeychain "$@"
}

AHEAD=$(git rev-list --left-right --count origin/main...HEAD 2>/dev/null | awk '{print $2}' || echo "?")
if git config --get-all credential.https://github.com.helper 2>/dev/null | grep -q '/tmp/gh'; then
  echo "⚠ Detecté gh roto en /tmp — este script usará osxkeychain."
  echo "  Para arreglarlo permanente, ejecuta:"
  echo "  git config --global --unset-all credential.https://github.com.helper"
  echo ""
fi

git_cmd fetch origin main

# Mantener deploy.yml del remoto (incluye cambios hechos en github.com)
git checkout origin/main -- .github/workflows/deploy.yml 2>/dev/null || true

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add .
  git reset HEAD .github/ 2>/dev/null || true
  git commit -m "$MSG" || true
else
  echo "ℹ No hay cambios nuevos para commitear."
fi

if [ "${AHEAD:-0}" != "0" ] && [ "${AHEAD:-0}" != "?" ]; then
  echo "→ Subiendo ${AHEAD} commit(s) pendiente(s) a main..."
fi

git_cmd pull origin main --no-rebase --no-edit
git_cmd push origin HEAD:main

echo ""
echo "✓ Push completado. Revisa Actions (~2 min):"
echo "  https://github.com/juridicofiscaleg-cell/integra-pld/actions"
echo ""
echo "  Sitio: https://juridicofiscaleg-cell.github.io/integra-pld/"
echo ""
echo "  Si pide contraseña en GitHub, usa un Personal Access Token (no tu contraseña)."
echo "  Crear token: GitHub → Settings → Developer settings → Personal access tokens"
echo ""
echo "Nota: si cambias deploy.yml, hazlo en github.com (Add file), no desde terminal."
