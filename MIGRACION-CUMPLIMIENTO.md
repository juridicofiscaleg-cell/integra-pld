# Migración cumplimiento — IMPORTANTE

Si ves el error **"Could not find the table client_compliance_officers"**, ejecuta esto:

## Paso único en Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → proyecto → **SQL Editor**
2. Abre el archivo **`supabase/migration-cumplimiento.sql`** de este repo
3. Copia **todo** el contenido y pégalo en el editor
4. Clic en **Run**

Es seguro ejecutarlo aunque ya corriste migraciones anteriores (usa `IF NOT EXISTS`).

## Qué crea

- Tabla **`client_compliance_officers`** — oficiales por cliente
- Columnas en **`training_sessions`** — cliente + oficial + constancias
- Columna **`client_id`** en **`compliance_manuals`** — manuales por cliente
- Políticas RLS y bucket **`cumplimiento`**

## Después

```bash
cd ~/Projects/crm-juridico
./scripts/publicar.sh "Cumplimiento por cliente"
```

Recarga la app y prueba **Oficiales de Cumplimiento** en el menú lateral.
