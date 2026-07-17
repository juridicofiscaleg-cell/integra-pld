# Pasos manuales — Integra PLD v5

## 1. SQL en Supabase (obligatorio si no corriste v4/v5)

Ejecuta en **SQL Editor**, en orden:

1. `supabase/migration-v4.sql` (si no lo hiciste)
2. `supabase/migration-v5.sql` — manual PLD, capacitaciones, comentarios, bucket `cumplimiento`
3. `supabase/migration-v5b.sql` — ficha capacitaciones, constancias, datos del despacho

## 2. Edge Function constancias (opcional — IA)

Para constancias redactadas con IA:

1. Supabase → **Edge Functions** → deploy `generate-certificate`
2. **Secrets** → `OPENAI_API_KEY` = tu API key de OpenAI

Sin esto, la app genera constancias con plantilla profesional automáticamente.

## 3. Publicar la app

```bash
cd ~/Projects/crm-juridico
./scripts/publicar.sh
```

## 4. Probar lo nuevo

| Ruta | Novedad |
|------|---------|
| `/clientes` | Columna **Cumplimiento** (semáforo) |
| `/clientes/:id` | Operaciones/avisos, export JSON expediente, plantillas email |
| `/operaciones` | Editar ops/avisos, umbrales SAT, aviso automático |
| `/cumplimiento` | Oficial (ficha visible), despacho, manual, historial capacitaciones, constancias IA |
| `/expedientes/:id` | Comentarios internos, diagnóstico PLD (gap analysis) |
| `/reportes` | Export CSV operaciones y avisos |
| `/` | Widget PLD pendientes (ops sin reportar, avisos borrador) |

## 5. KYC — periodicidad por riesgo

Al renovar KYC, la fecha de vencimiento se calcula automáticamente:

- Bajo: 3 años · Medio: 2 años · Alto: 1 año · Crítico: 6 meses

## 6. OpenSanctions

Cuando tengas cuota, redeploy `sanctions-check` en Supabase.

---

**Nota:** Los umbrales SAT en operaciones son orientativos; ajústalos según tu actividad vulnerable y criterios internos.
