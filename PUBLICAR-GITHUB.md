# Publicar en GitHub Pages — guía paso a paso

## El error que viste

```
refusing to allow an OAuth App to create or update workflow without workflow scope
```

Significa: la credencial de Cursor/GitHub **no puede subir** el archivo `.github/workflows/deploy.yml`.

**Solución:** subir el código primero (sin ese archivo) y crear el workflow **en la página web de GitHub**.

---

## PASO A — Subir el código (Terminal)

```bash
cd ~/Projects/crm-juridico
chmod +x scripts/push-sin-workflow.sh
./scripts/push-sin-workflow.sh
git push -f origin push-clean:main
```

Si pide login, usa tu usuario `juridicofiscaleg-cell`.

---

## PASO B — Crear el workflow en GitHub (navegador)

1. Abre: https://github.com/juridicofiscaleg-cell/integra-pld
2. Clic en **Add file** → **Create new file**
3. En el nombre del archivo escribe exactamente:

   `.github/workflows/deploy.yml`

4. Copia y pega el contenido del archivo `deploy.yml` de este proyecto
5. Abajo: **Commit changes** → **Commit directly to main**

---

## PASO C — Secrets (si no los pusiste)

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://cglsgbowfiwbbpiwgfgs.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (copia del archivo `.env`) |

---

## PASO D — Activar Pages

**Settings** → **Pages** → Source: **GitHub Actions**

---

## PASO E — Ver el deploy

**Actions** → workflow **Deploy Integra PLD** → espera check verde

**Link:** https://juridicofiscaleg-cell.github.io/integra-pld/

---

## PASO F — Supabase (login en la web)

**Authentication** → **URL Configuration**

- Site URL: `https://juridicofiscaleg-cell.github.io/integra-pld/`
- Redirect URLs: la misma URL

---

## Si quieres usar token (opcional)

Usa **Classic** (no Fine-grained):

https://github.com/settings/tokens/new

Marca:
- **repo**
- **workflow**

Luego borra credencial vieja:

```bash
printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase
```

Y vuelve a hacer `git push`.
