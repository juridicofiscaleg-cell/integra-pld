# Runbook — Seguimiento de Pendientes de Adrián

Fuente única de verdad de la lógica del seguimiento de pendientes. La siguen la skill
interactiva (`seguimiento-pendientes`) y las tres tareas automáticas
(Arranque 9:00, Cierre 18:00 L–V, y Reporte Semanal lunes 8:00).

Todo en **español**, zona horaria **America/Hermosillo (UTC−7, sin horario de verano)**.
Usuario: Adrián Gerardo — correo destino: `juridicofiscaleg@gmail.com`.

---

## 1. Dónde vive el estado

`estado.json` en la rama de git **`seguimiento-pendientes-data`** de
`juridicofiscaleg-cell/integra-pld`.

Leer/escribir siempre así:

```bash
cd <repo>
git fetch origin seguimiento-pendientes-data
git checkout -f seguimiento-pendientes-data
git pull origin seguimiento-pendientes-data
# ...editar estado.json...
git add estado.json
git commit -m "seguimiento: <arranque|cierre|captura|semanal> <fecha>"
git push -u origin seguimiento-pendientes-data   # reintenta 2s,4s,8s,16s si falla por red
```

Rama **solo de datos**; nunca se fusiona a `main`.

---

## 2. Modelo de datos (`estado.json`)

Cabecera: `version`, `zona_horaria`, `correo_destino`, `alias_captura` (pend/urg/hecho),
`etiqueta_procesado`, `correos_procesados` (IDs de mensajes ya ingeridos, para dedup),
`actualizado`, `ultimo_arranque`, `ultimo_cierre`, `ultima_sincronizacion_correo`,
`ultimo_reporte_semanal`, `consecutivo`, `pendientes`.

Cada pendiente:

```json
{
  "id": "P-0001",
  "titulo": "Texto corto y accionable",
  "detalle": "Contexto opcional",
  "prioridad": "alta | media | baja",
  "estado": "pendiente | en_curso | hecho | cancelado",
  "cliente": "Nombre o null",
  "origen": "correo | sesion | calendario | manual",
  "creado": "YYYY-MM-DD",
  "creado_ts": "YYYY-MM-DD HH:MM",
  "vence": "YYYY-MM-DD o null",
  "cerrado": "YYYY-MM-DD o null",
  "dias_rezagado": 0,
  "historial": [ { "fecha": "YYYY-MM-DD HH:MM", "evento": "creado", "nota": "" } ]
}
```

Reglas:
- **IDs**: usa y aumenta el contador `consecutivo` de la cabecera. `P-0001`, `P-0002`, …
  Nunca se reutilizan.
- **Activo** = estado `pendiente` o `en_curso`. **Rezagado** = activo con `creado` < hoy.
- Al cerrar (`hecho`/`cancelado`): fija `cerrado` = hoy y agrega historial.
- Nunca borres cerrados (sirven para el reporte semanal). Puedes archivar a un arreglo
  `archivados` los `hecho`/`cancelado` con más de 60 días si el archivo crece mucho.

---

## 3. CAPTURA RELÁMPAGO POR CORREO  ← canal principal de captura

Adrián captura pendientes en 5 segundos mandando un correo (incluso por voz) a un alias
`+` de su propia cuenta. Todos llegan a su bandeja y se distinguen por el destinatario:

| Alias (`to:`) | Qué registrar |
|---|---|
| `juridicofiscaleg+pend@gmail.com` | pendiente nuevo, prioridad **media** |
| `juridicofiscaleg+urg@gmail.com` | pendiente nuevo, prioridad **alta** |
| `juridicofiscaleg+hecho@gmail.com` | algo **ya resuelto** → se registra con estado `hecho` y `cerrado`=fecha del correo (para el conteo semanal) |

**Un correo puede traer UNO o VARIOS pendientes.** Reglas de parseo:
- Si el cuerpo trae una **lista** (2+ líneas no vacías, o viñetas `•`/`-`/`*`, o numeración
  `1.` `2.`, o ítems separados por `;`): **cada ítem = un pendiente INDIVIDUAL**, todos con
  el alias/prioridad/estado del correo. En ese caso el asunto se toma como encabezado y se ignora.
- Si el cuerpo es una sola línea o va vacío: es **un** pendiente; su texto es esa línea, o el
  asunto si el cuerpo está vacío.
- **Ignora** líneas de firma y cortesías (p. ej. "Director Jurídico", "Lic. Adrian Gerardo",
  "EG EMPRESARIAL", "Enviado desde mi…", saludos/despedidas) y cualquier texto citado (`>`).

Interpreta cada ítem en **lenguaje natural**:
- Cliente: si menciona un cliente/empresa conocido o escribe `@Nombre`.
- Prioridad: `+urg` = alta; palabras como "urgente/hoy/ya" suben prioridad.
- Fecha límite: "para el viernes", "antes del 15" → `vence`.

### Ingesta (correr en Arranque, Cierre, Reporte Semanal, y sync a pedido)

1. Con el conector **Gmail**, busca correos de captura recientes:
   `to:(juridicofiscaleg+pend@gmail.com OR juridicofiscaleg+urg@gmail.com OR juridicofiscaleg+hecho@gmail.com) newer_than:20d`
2. Por cada correo (del más viejo al más nuevo), **omite los que ya estén en
   `correos_procesados`** de la cabecera (dedup por ID de mensaje — control anti-duplicados
   principal, no depende de escribir en Gmail). Para los nuevos:
   - Crea un pendiente nuevo (`origen: "correo"`) con el título interpretado, la prioridad
     y el estado según el alias. `creado_ts` = fecha/hora del correo.
   - Para `+hecho`: estado `hecho`, `cerrado` = fecha del correo, historial "capturado_hecho".
   - **Agrega el ID del mensaje a `correos_procesados`**.
   - *Opcional (si hay permiso de escritura en Gmail):* aplica la etiqueta `Capturado`
     (créala con `create_label` si no existe; id vía `list_labels`) para verlo marcado en la
     bandeja. Si la escritura no está disponible, omite sin fallar.
3. Actualiza `ultima_sincronizacion_correo` y guarda `estado.json` (commit + push).
4. Si el conector Gmail **no está disponible** en esta corrida (p. ej. tarea automática sin
   conectores), **omite la ingesta**, no falles, y anótalo en el resumen: la próxima corrida
   con conector recogerá esos correos (por eso la búsqueda usa `newer_than:20d`, no solo
   `is:unread`).

> La captura también funciona diciéndomelo en una sesión de Claude ("anota…", "ya hice…"):
> ver Sección 8.

---

## 4. Detección automática (señales, NO captura en firme)

Además de la captura explícita, en Arranque/Cierre revisa señales para **proponer**
pendientes (nunca los agregas en firme; se listan como "Posibles pendientes detectados"
para que Adrián confirme):
- **Gmail**: hilos donde le pidieron algo y no ha respondido, últimos ~2 días
  (`to:me newer_than:2d`, `is:unread newer_than:2d`), que terminen en pregunta/petición.
  Un @mención grupal no es pendiente suyo. Solo snippets; no abrir ni marcar.
- **Calendar**: eventos de hoy y mañana; los de mañana que organiza o nombran un proyecto
  generan un posible "preparar: …".

Máx. ~6 por fuente. Conector ausente → omitir sin disculparse.

---

## 5. Modo CIERRE (automático 18:00 L–V, o interactivo)

1. Carga `estado.json`. **Ingesta de captura por correo** (Sección 3).
2. Fecha de hoy (Hermosillo). Para cada activo con `creado` < hoy: `dias_rezagado += 1` +
   historial `sigue_pendiente`.
3. Detección automática (Sección 4).
4. Fija `ultimo_cierre` y `actualizado`. Guarda (commit + push).
5. Reporte de CIERRE como borrador de Gmail (Sección 7):
   - **Hecho hoy**: `cerrado == hoy` (incluye los capturados con `+hecho`).
   - **Sigue pendiente / se rezaga a mañana**: activos por prioridad y `dias_rezagado` desc;
     ⚠️ los de `dias_rezagado >= 2`.
   - **Posibles pendientes detectados**.
   - **Preguntas de cierre**: "¿Qué sí quedó hecho? ¿Algo se cancela o cambia de prioridad?
     ¿Confirmo los detectados?"

---

## 6. Modo ARRANQUE (automático 9:00 L–V, o interactivo)

1. Carga `estado.json`. **Ingesta de captura por correo** (Sección 3).
2. Detección automática (Sección 4), enfocada en el día que empieza.
3. Fija `ultimo_arranque` y `actualizado`. Guarda (commit + push).
4. Reporte de ARRANQUE como borrador de Gmail:
   - **Rezagado de días anteriores** (primero y más visible): activos con `dias_rezagado >= 1`;
     una línea c/u: "viene arrastrándose desde {creado} ({dias} día(s)). ¿Lo retomamos hoy o
     lo soltamos?". ⚠️ para `>= 2`.
   - **Prioridades sugeridas para hoy**: top 3–5 activos por prioridad y vencimiento.
   - **Vence hoy / esta semana**.
   - **Posibles pendientes detectados**.
   - **Preguntas de arranque**.

---

## 7. Formato del reporte (borrador de Gmail)

> **Entrega:** el conector Gmail de esta cuenta **solo crea borradores**, no envía. El reporte
> se crea con `create_draft` hacia `juridicofiscaleg@gmail.com` y Adrián lo abre en
> **Borradores**. (Si algún día se conecta un Gmail con permiso de envío, cambiar a enviar.)

- `to`: `juridicofiscaleg@gmail.com`
- `subject`:
  - Arranque: `🗂️ Pendientes — Arranque {d/mmm} ({N} activos, {R} rezagados)`
  - Cierre: `🗂️ Pendientes — Cierre {d/mmm} ({H} hecho, {A} siguen)`
  - Semanal: `📊 Reporte semanal de pendientes — {rango}`
- `body`: **HTML** limpio, legible en móvil. Encabezado con fecha larga + línea de resumen,
  luego las secciones del modo. Cada pendiente: **título en negrita** + prioridad
  (🔴 alta / 🟡 media / ⚪ baja) + cliente si aplica + antigüedad si rezagado. Al final,
  bloque tenue con las preguntas y la nota: "Responde en tu sesión de Claude (o dime los
  cambios) y actualizo tu libreta." Estilo sobrio. Sin pendientes ni señales → reporte corto
  y tranquilo.

---

## 8. Modo CAPTURA / CIERRE interactivo (en sesión de Claude)

Cuando Adrián diga "anota…", "recuérdame…", "queda pendiente…": agrega pendiente
(`origen: "sesion"`), prioridad estimada (pregunta si no es clara), cliente si aplica.
Guarda y confirma en una línea. Cuando diga "ya hice X", "ciérralo": marca `hecho`,
`cerrado`=hoy, guarda, confirma. "Sincroniza"/"revisa capturas" → corre la ingesta (Sección 3).

---

## 9. Modo CONSULTA (interactivo)

"¿Qué tengo pendiente?", "¿qué se rezagó?", "lo de {cliente}": responde en texto, ordenado
por prioridad y rezago. No hace falta borrador.

---

## 10. Modo REPORTE SEMANAL (automático lunes 8:00, o a pedido)

Para presentar a su jefe. Cubre la **semana laboral anterior** (lunes 00:00 a domingo 24:00).

1. Carga `estado.json`. **Ingesta de captura por correo** (Sección 3) para no dejar nada fuera.
2. Reúne:
   - **Completados** de la semana: estado `hecho` con `cerrado` dentro del rango (incluye los
     capturados con `+hecho` — las tareas de 1 minuto también cuentan).
   - **En curso / abiertos** al cierre de la semana, con antigüedad.
   - **Rezagados críticos** (`dias_rezagado >= 3`).
3. Fija `ultimo_reporte_semanal` y guarda.
4. Borrador de Gmail presentable para el jefe:
   - **Resumen ejecutivo** arriba: "{X} pendientes cerrados · {Y} en curso · {Z} rezagados"
     y una o dos líneas de lectura de la semana.
   - **Detalle por cliente** (agrupado): bajo cada cliente, lo hecho y lo abierto.
   - **Sin cliente / internos** al final.
   - Tono profesional, listo para reenviar o copiar a una diapositiva. Sin las "preguntas"
     internas de los reportes diarios.
5. Además, guarda una copia del HTML en la rama de datos como `reportes/semanal-{rango}.html`
   (commit + push) como respaldo consultable.

---

## 11. Voz

Observa y entrega. No regañes, no adules, no rellenes. Un día tranquilo es un día tranquilo.
Las preguntas de los reportes diarios son reales (para decidir prioridades), no retóricas.
El reporte semanal es profesional y sobrio (lo ve su jefe).
