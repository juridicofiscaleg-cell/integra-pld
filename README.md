# Integra PLD

Sistema web para seguimiento de asuntos legales, expedientes de clientes, KYC y timeline de procesos — pensado para despachos de PLD/FT.

## Módulos

| Módulo | Función |
|--------|---------|
| **Dashboard** | Vista general: expedientes activos, alertas, actividad reciente |
| **Clientes** | Alta y seguimiento por cliente, nivel de riesgo |
| **Expedientes** | Asuntos con timeline de etapas y avance del proceso |
| **KYC** | Checklist de documentación, score de riesgo, PEP, listas negras |
| **Documentos** | Subida y descarga en cada expediente |
| **Alertas** | Vencimientos y recordatorios |
| **Buscar** | Búsqueda en clientes, expedientes y KYC |

## Inicio local

```bash
export PATH="$HOME/.local/node-v22.17.0-darwin-arm64/bin:$PATH"
cd ~/Projects/crm-juridico
cp .env.example .env   # y llena tus credenciales Supabase
npm run dev
```

## Publicar en internet

### Opción A — Vercel (recomendado)

1. Crea cuenta en [vercel.com](https://vercel.com)
2. Conecta el repo de GitHub o corre `npx vercel` desde esta carpeta
3. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático en cada push

### Opción B — GitHub Pages

1. Sube el repo a GitHub
2. En **Settings → Secrets**, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. En **Settings → Pages → Source**, elige **GitHub Actions**
4. Push a `main` — el workflow `.github/workflows/deploy.yml` publica automáticamente

## Supabase

Ejecuta `supabase/schema.sql` y `supabase/fix-auth.sql` en el SQL Editor de tu proyecto.

