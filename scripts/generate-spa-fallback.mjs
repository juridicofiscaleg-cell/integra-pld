import { readFileSync, writeFileSync } from 'node:fs'

const base = process.env.VITE_BASE_PATH || '/'
const indexPath = 'dist/index.html'
let index = readFileSync(indexPath, 'utf8')

const recoveryScript = `<script>(function(){var r=sessionStorage.redirect;delete sessionStorage.redirect;if(r&&r!==location.href){history.replaceState(null,"",r);}})();</script>`

if (!index.includes('sessionStorage.redirect')) {
  index = index.replace('<head>', `<head>${recoveryScript}`)
  writeFileSync(indexPath, index)
}

const redirect404 = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><script>sessionStorage.redirect=location.href;</script><meta http-equiv="refresh" content="0;URL='${base}'"></head><body></body></html>`
writeFileSync('dist/404.html', redirect404)

console.log('✓ SPA fallback generado (404.html + recovery script)')
