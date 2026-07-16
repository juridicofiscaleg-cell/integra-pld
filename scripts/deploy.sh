#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Build de Integra PLD"
npm run build

echo ""
echo "==> Para publicar en GitHub Pages:"
echo "1. Crea repo en GitHub (ej: integra-pld)"
echo "2. Agrega secrets en el repo → Settings → Secrets:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "3. Push a main:"
echo "   git add . && git commit -m 'Deploy Integra PLD' && git push -u origin main"
echo "4. En Settings → Pages → Source: GitHub Actions"
echo ""
echo "==> O publica en Vercel (más fácil):"
echo "1. Instala: npm i -g vercel"
echo "2. Corre: vercel"
echo "3. Agrega las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el dashboard"
