# Pasos manuales — Actualización Integra PLD (v4)

## 1. SQL en Supabase (obligatorio)

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard/project/cglsgbowfiwbbpiwgfgs) → **SQL Editor**
2. Ejecuta el contenido completo de:
   - `supabase/migration-v4.sql`

Esto agrega:
- Matriz de riesgo en clientes
- Beneficiarios controladores y cuestionario PEP en KYC
- Tablas `pld_operations` y `unusual_notices`
- Permisos RLS: asistentes no pueden eliminar clientes/expedientes/KYC/documentos

Si no ejecutaste migraciones anteriores, también corre:
- `supabase/migration-v2.sql`
- `supabase/migration-v3.sql`

## 2. Publicar la app web

```bash
cd ~/Projects/crm-juridico
./scripts/publicar.sh
```

O manualmente:
```bash
git add -A
git commit -m "Integra PLD v4: operaciones, matriz riesgo, filtros, mi día"
git pull origin main --no-rebase
git push origin push-clean:main
```

Espera que GitHub Actions quede verde (~2 min).

## 3. Edge Function OpenSanctions (cuando tengas cuota)

1. Supabase → **Edge Functions → sanctions-check**
2. Pega `supabase/functions/sanctions-check/index.ts`
3. **Deploy**
4. Verifica secret `OPENSANCTIONS_API_KEY`

## 4. Probar las nuevas funciones

| Ruta | Qué probar |
|------|------------|
| `/` | Panel **Mi día** |
| `/clientes` | Filtros por riesgo, actividad vulnerable |
| `/clientes/:id` | Semáforo cumplimiento, matriz de riesgo, timeline 360° |
| `/expedientes` | Filtros + responsable asignado |
| `/expedientes/:id` | Editar, notas en etapas |
| `/kyc` | Filtros; editar → PEP, beneficiarios, renovar KYC |
| `/operaciones` | Registrar operaciones y avisos PLD |
| `/calendario` | Vencimientos KYC y alertas |
| `/alertas` | Crear tareas manuales + notificación email |
| `/bitacora` | Historial completo + export CSV |

## 5. Roles del equipo

- **Asistente**: puede cargar docs y avanzar etapas; no puede eliminar (ahora también en base de datos)
- **Abogado / Admin**: acceso completo
- Asigna responsables en expedientes y alertas para que aparezcan en **Mi día**

## 6. Plantillas de documentos

1. Sube plantillas en **Biblioteca** marcándolas como plantilla
2. Al subir documentos en cliente/expediente, elige la plantilla y descárgala como base

---

**Nota:** Las notificaciones por email abren un borrador en tu cliente de correo (mailto); no envían automáticamente sin un servicio SMTP adicional.
