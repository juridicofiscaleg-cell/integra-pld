import { readFileSync, writeFileSync } from 'node:fs'

const base = process.env.VITE_BASE_PATH || '/'
const indexPath = 'dist/index.html'
let index = readFileSync(indexPath, 'utf8')

const recoveryScript = `<script>(function(){try{var r=sessionStorage.getItem('spa-path');sessionStorage.removeItem('spa-path');if(r){var u=new URL(r,location.origin);if(u.origin===location.origin){history.replaceState(null,'',u.pathname+u.search+u.hash);}}}catch(e){}})();</script>`

if (!index.includes('spa-path')) {
  index = index.replace('<head>', `<head>${recoveryScript}`)
  writeFileSync(indexPath, index)
}

const redirect404 = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>try{sessionStorage.setItem('spa-path',location.pathname+location.search+location.hash);}catch(e){}location.replace('${base}');</script></head><body><p style="font-family:system-ui;text-align:center;padding:2rem">Cargando Integra PLD…</p></body></html>`
writeFileSync('dist/404.html', redirect404)

console.log('✓ SPA fallback generado (404.html + recovery script)')
