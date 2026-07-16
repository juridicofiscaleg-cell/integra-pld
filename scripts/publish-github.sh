#!/bin/bash
set -euo pipefail

GH="/tmp/gh_2.96.0_macOS_arm64/bin/gh"
REPO_NAME="integra-pld"

if [ ! -x "$GH" ]; then
  echo "Instala GitHub CLI o descarga gh desde https://cli.github.com"
  exit 1
fi

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Inicia sesión en GitHub:"
  "$GH" auth login -h github.com -p https -w
fi

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init -b main
fi

git add .
git status

if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
Publicar Integra PLD en GitHub Pages.

EOF
)"
fi

if ! "$GH" repo view "$REPO_NAME" >/dev/null 2>&1; then
  "$GH" repo create "$REPO_NAME" --public --source=. --remote=origin
else
  git remote add origin "https://github.com/$("$GH" api user -q .login)/$REPO_NAME.git" 2>/dev/null || true
fi

git push -u origin main

echo ""
echo "Siguiente: en GitHub → Settings → Secrets and variables → Actions"
echo "Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY"
echo ""
echo "Luego: Settings → Pages → Build and deployment → Source: GitHub Actions"
echo ""
echo "Tu link será: https://$("$GH" api user -q .login).github.io/$REPO_NAME/"
