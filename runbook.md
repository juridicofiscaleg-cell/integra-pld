# Runbook — Seguimiento de Pendientes de Adrián

Este archivo es la **fuente única de verdad** de la lógica del seguimiento de pendientes.
Lo siguen tanto la skill interactiva (`seguimiento-pendientes`) como las dos tareas
automáticas (Arranque 9:00 y Cierre 18:00, L–V).

Todo se opera en **español** y en zona horaria **America/Hermosillo (UTC−7, sin horario de verano)**.
Usuario: Adrián Gerardo — correo destino: `juridicofiscaleg@gmail.com`.

---

## 1. Dónde vive el estado

La libreta de pendientes es el archivo **`estado.json`** en la rama de git
**`seguimiento-pendientes-data`** de este mismo repositorio
(`juridicofiscaleg-cell/integra-pld`).

**Para leer y escribir el estado, siempre:**

```bash
cd <repo>
git fetch origin seguimiento-pendientes-data
git checkout seguimiento-pendientes-data
git pull origin seguimiento-pendientes-data
```

Si la rama no existe, créala desde este runbook (no debería pasar; ya está creada).

Después de modificar `estado.json`:

```bash
git add estado.json
git commit -m "seguimiento: <arranque|cierre|captura> <fecha>"
git push -u origin seguimiento-pendientes-data
```

Reintenta el push hasta 4 veces con espera 2s, 4s, 8s, 16s si falla por red.

> Nota: esta rama es **solo de datos**, nunca se fusiona a `main`. Contiene únicamente
> `estado.json`, `runbook.md` y `README.md`.

---

## 2. Modelo de datos (`estado.json`)

```json
{
  "version": 1,
  "zona_horaria": "America/Hermosillo",
  "correo_destino": "juridicofiscaleg@gmail.com",
  "actualizado": "YYYY-MM-DD HH:MM",
  "ultimo_arranque": "YYYY-MM-DD",
  "ultimo_cierre": "YYYY-MM-DD",
  "pendientes": [
    {
      "id": "P-0001",
      "titulo": "Texto corto y accionable",
      "detalle": "Contexto opcional",
      "prioridad": "alta | media | baja",
      "estado": "pendiente | en_curso | hecho | cancelado",
      "cliente": "Nombre del cliente/empresa o null",
      "origen": "sesion | correo | calendario | manual",
      "creado": "YYYY-MM-DD",
      "vence": "YYYY-MM-DD o null",
      "cerrado": "YYYY-MM-DD o null",
      "dias_rezagado": 0,
      "historial": [
        { "fecha": "YYYY-MM-DD", "evento": "creado", "nota": "" }
      ]
    }
  ]
}
```

Reglas:
- **IDs** consecutivos `P-0001`, `P-0002`, … nunca se reutilizan.
- Un pendiente está **activo** si su estado es `pendiente` o `en_curso`.
- **Rezagado** = pendiente activo cuyo `creado` es anterior a hoy. `dias_rezagado` cuenta
  cuántos cierres lleva sin completarse.
- Al marcar `hecho` o `cancelado`, fija `cerrado` a la fecha de hoy y agrega entrada al `historial`.
- Nunca borres pendientes cerrados; sirven para el reporte del día. (Puedes archivar los
  `hecho`/`cancelado` con más de 14 días quitándolos del arreglo si el archivo crece mucho.)

---

## 3. Detección automática (señales de Gmail y Calendar)

En Arranque y Cierre, además de la libreta, revisa señales para **proponer** pendientes
nuevos. **Nunca** los agregas en firme automáticamente: se listan en el reporte como
"Posibles pendientes detectados" para que Adrián los confirme (en la próxima sesión dirá
"sí, agrégalo" o los ignora). Esto evita ruido.

**Gmail** (usa el conector Gmail):
- Hilos donde a Adrián le pidieron algo y **no ha respondido**, de los últimos ~2 días.
  Búsqueda sugerida: `is:unread newer_than:2d` y `to:me newer_than:2d` que terminen en
  pregunta o petición. Un @mención grupal donde cualquiera puede responder **no** es un pendiente suyo.
- Extrae remitente, asunto y la petición en una frase (cita corta si ayuda). No abras
  ni marques nada; solo lee snippets.

**Calendar** (usa el conector Google Calendar):
- Eventos de hoy y de mañana. Los de mañana que Adrián organiza o que nombran un proyecto
  generan un posible "preparar: …" (documento a revisar, decisión que le pedirán, borrador que llevar).

Máximo ~6 candidatos por fuente. Si un conector no está disponible en la corrida, omite
esa sección sin disculparte.

---

## 4. Modo CIERRE (automático 18:00 L–V, o interactivo al terminar el día)

1. Carga `estado.json` (sección 1).
2. Fecha de hoy en Hermosillo.
3. Para cada pendiente **activo**:
   - Si su `creado` < hoy y sigue activo → `dias_rezagado += 1` y agrega historial
     `{fecha: hoy, evento: "sigue_pendiente"}`.
4. Ejecuta detección automática (sección 3).
5. Fija `ultimo_cierre = hoy` y `actualizado`.
6. Guarda `estado.json` (commit + push).
7. Genera el **reporte de Cierre** como borrador de Gmail (sección 6) con:
   - **Hecho hoy**: pendientes con `cerrado == hoy` (estado `hecho`).
   - **Sigue pendiente / se rezaga a mañana**: pendientes activos, ordenados por prioridad
     y por `dias_rezagado` desc. Marca con ⚠️ los de `dias_rezagado >= 2`.
   - **Posibles pendientes detectados** (de Gmail/Calendar), para confirmar.
   - **Preguntas de cierre** (texto, para que Adrián responda en la próxima sesión):
     "¿Qué de lo pendiente sí quedó hecho hoy? ¿Algo se cancela o cambia de prioridad?
     ¿Confirmo los pendientes detectados?"

> En corrida automática nadie contesta en vivo: el reporte **plantea** las preguntas y deja
> el estado tal cual. Adrián confirma después (sesión interactiva o respondiendo).

---

## 5. Modo ARRANQUE (automático 9:00 L–V, o interactivo al iniciar el día)

1. Carga `estado.json`.
2. Ejecuta detección automática (sección 3), enfocada en el día que empieza.
3. Fija `ultimo_arranque = hoy` y `actualizado`. Guarda (commit + push).
4. Genera el **reporte de Arranque** como borrador de Gmail con:
   - **Rezagado de días anteriores** (lo primero y más visible): pendientes activos con
     `dias_rezagado >= 1`, con una línea cada uno: "Esto viene arrastrándose desde {creado}
     ({dias_rezagado} día(s)). ¿Lo retomamos hoy o lo soltamos?". ⚠️ para `>= 2`.
   - **Prioridades sugeridas para hoy**: top 3–5 activos por prioridad y vencimiento, en orden.
   - **Vence hoy / esta semana**: activos con `vence` cercano.
   - **Posibles pendientes detectados** (Gmail/Calendar).
   - **Preguntas de arranque**: "¿Con qué arrancamos? ¿Cambio alguna prioridad?
     ¿Los rezagados siguen vigentes o alguno ya no aplica?"

---

## 6. Formato del reporte (borrador de Gmail)

> **Entrega:** el conector Gmail de esta cuenta **solo permite crear borradores**, no enviar.
> El reporte se crea con `create_draft` dirigido a `juridicofiscaleg@gmail.com`. Adrián lo
> abre en la carpeta **Borradores**. (Si más adelante se conecta un Gmail con permiso de
> envío, cambiar aquí a enviar en vez de borrador.)

- Herramienta: conector **Gmail → create_draft**.
- `to`: `juridicofiscaleg@gmail.com`
- `subject`:
  - Arranque: `🗂️ Pendientes — Arranque {d/mmm} ({N} activos, {R} rezagados)`
  - Cierre: `🗂️ Pendientes — Cierre {d/mmm} ({H} hecho, {A} siguen)`
- `body`: **HTML** limpio y legible en móvil. Estructura:
  - Encabezado con fecha larga (ej. "Miércoles · 5 de agosto de 2026") y una línea de resumen.
  - Secciones de la sección 4 o 5 según el modo, cada una con su título y lista.
  - Cada pendiente: **título en negrita** + prioridad (🔴 alta / 🟡 media / ⚪ baja) +
    cliente si aplica + antigüedad si está rezagado.
  - Al final, un bloque tenue con las **preguntas** y esta nota:
    "Responde estas preguntas en tu sesión de Claude (o dime los cambios) y actualizo tu libreta."
- Estilo sobrio, sin exagerar colores. Nada de firmas raras. En español.

Si no hay ningún pendiente ni señal: un reporte corto y tranquilo ("Sin pendientes activos.
Día limpio.").

---

## 7. Modo CAPTURA (interactivo, durante el día)

Cuando Adrián, trabajando con Claude, diga cosas como "anota este pendiente",
"esto queda para después", "recuérdame X", o cuando de una tarea claramente quede algo por hacer:
1. Carga `estado.json`.
2. Agrega un pendiente nuevo (`origen: "sesion"` o `"manual"`) con título accionable,
   prioridad estimada (pregunta si no es claro), cliente si aplica.
3. Guarda (commit + push). Confirma en una línea: "Anotado: {título} (prioridad {x})."

Para **cerrar** un pendiente: cuando diga "ya hice X" / "listo lo de Y", busca el pendiente,
pon `estado: "hecho"`, `cerrado: hoy`, historial, guarda, y confirma.

---

## 8. Modo CONSULTA (interactivo)

"¿Qué tengo pendiente?", "¿qué se rezagó?", "muéstrame lo de {cliente}": carga `estado.json`
y responde en texto (no hace falta borrador de correo), ordenado por prioridad y rezago.

---

## 9. Voz

Observa y entrega. No regañes ("ya deberías haber…"), no adules, no rellenes. Un día
tranquilo es un día tranquilo. Las preguntas son de verdad (para decidir prioridades),
no retóricas.
