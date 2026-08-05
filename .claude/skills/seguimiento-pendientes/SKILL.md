---
name: seguimiento-pendientes
description: "Sistema de seguimiento de pendientes de Adrián: captura, cierra, consulta y reporta tareas pendientes. Usar SIEMPRE que el usuario diga cosas como 'anota este pendiente', 'recuérdame X', 'esto queda para después', '¿qué tengo pendiente?', '¿qué se rezagó?', 'ya terminé X', 'ciérralo', 'sincroniza', 'revisa mis capturas', 'dame el reporte del día/semanal', 'arranque del día', 'cierre del día', o cuando confirme/ajuste pendientes tras recibir un reporte automático. Captura principal por correo a los alias +pend/+urg/+hecho. También activar cuando de una tarea trabajada con Claude quede claramente algo por hacer. La libreta vive en la rama de git 'seguimiento-pendientes-data'."
---

# Seguimiento de pendientes de Adrián

Herramienta para dar seguimiento a los pendientes del día: capturarlos conforme surgen,
cerrarlos cuando se hacen, arrastrar los rezagados al día siguiente, y generar reportes de
**Arranque** (inicio del día) y **Cierre** (fin del día) como borrador de correo.

## Fuente de verdad

Toda la lógica y el modelo de datos están en **`runbook.md`** de la rama de git
**`seguimiento-pendientes-data`** de este repositorio. **Antes de cualquier operación**,
trae y lee ese runbook y la libreta:

```bash
cd <repo>
git fetch origin seguimiento-pendientes-data
git worktree add /tmp/pend-data seguimiento-pendientes-data 2>/dev/null || \
  (git stash -u >/dev/null 2>&1; git checkout seguimiento-pendientes-data && git pull origin seguimiento-pendientes-data)
```

Usa un `git worktree` para no perder el checkout actual del usuario si estás en medio de otro
trabajo. Lee `runbook.md` y `estado.json` de esa rama y sigue el runbook al pie de la letra.
Al terminar de escribir, commit + push a `seguimiento-pendientes-data` (reintenta con backoff),
y limpia el worktree (`git worktree remove /tmp/pend-data`).

## Captura relámpago por correo (canal principal)

Adrián captura pendientes en segundos mandando un correo (incluso por voz) a un alias `+`:
`+pend` (pendiente medio), `+urg` (alta), `+hecho` (algo ya resuelto, para el conteo).
La **ingesta** (Sección 3 del runbook) lee esos correos, los estructura, y los marca con la
etiqueta `Capturado`. Corre en Arranque, Cierre, Reporte Semanal y cuando el usuario diga
"sincroniza" / "revisa capturas".

## Qué hace cada intención del usuario

| El usuario dice… | Modo (ver runbook) |
|---|---|
| "anota…", "recuérdame…", "queda pendiente…" | **CAPTURA** — agrega pendiente, confirma en una línea |
| "ya hice X", "listo lo de Y", "ciérralo" | **CAPTURA/cierre** — marca `hecho`, fija `cerrado` |
| "sincroniza", "revisa mis capturas" | **INGESTA** — lee los correos de los alias y actualiza libreta |
| "¿qué tengo?", "¿qué se rezagó?", "lo de {cliente}" | **CONSULTA** — responde en texto, sin correo |
| "arranque del día", "¿con qué empiezo?" | **ARRANQUE** — genera reporte (borrador Gmail) |
| "cierre del día", "reporte del día" | **CIERRE** — actualiza rezagos y genera reporte |
| "reporte semanal", "el de mi jefe" | **REPORTE SEMANAL** — agrupado por cliente (borrador) |
| confirma cambios tras un reporte automático | aplica los cambios a `estado.json` y guarda |

## Entrega de reportes

Los reportes de Arranque y Cierre se crean como **borrador de Gmail** dirigido a
`juridicofiscaleg@gmail.com` (el conector Gmail de esta cuenta solo permite crear borradores,
no enviar). Adrián los abre en su carpeta **Borradores**. Formato en la sección 6 del runbook.

## Automatización

Tres tareas programadas (Routines) llaman este flujo sin intervención:
- **Arranque** — 9:00 a.m. (Hermosillo), L–V → reporte de inicio del día.
- **Cierre** — 6:00 p.m. (Hermosillo), L–V → reporte de fin del día.
- **Reporte Semanal** — lunes 8:00 a.m. → consolidado por cliente para el jefe.

Corren en sesión nueva, leen el runbook de la rama de datos y siguen su modo. Nota: si la
organización dispara las tareas **sin conectores**, la sesión automática no podrá leer el
correo ni crear el borrador; en ese caso la ingesta y el reporte se hacen en la próxima
sesión interactiva (que sí tiene conectores) o habilitando el conector Gmail en la Routine
desde los ajustes de claude.ai.

## Idioma y voz

Todo en español. Observa y entrega; no regañes, no adules, no rellenes (ver sección 9 del runbook).
