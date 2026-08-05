/**********************************************************************
 * SEGUIMIENTO DE PENDIENTES — EG EMPRESARIAL (Adrián Gerardo)
 * Motor en Google Apps Script. Corre solo en tu cuenta de Google.
 *
 * QUÉ HACE:
 *  - Lee correos que mandas a +pend / +urg / +hecho y los guarda en una
 *    Hoja de Google (uno por renglón = un pendiente).
 *  - Envía por correo (de verdad, a tu bandeja) 3 reportes automáticos:
 *      · Arranque  — 9:00 a.m. (L–V)
 *      · Cierre    — 6:00 p.m. (L–V)
 *      · Semanal   — lunes 8:00 a.m. (para tu jefe)
 *
 * INSTALACIÓN (una sola vez):
 *  1. Crea una Hoja de Google nueva (nómbrala "Pendientes EG").
 *  2. Menú: Extensiones → Apps Script.
 *  3. Borra el código que aparece y pega TODO este archivo.
 *  4. Archivo → Configuración del proyecto → Zona horaria: America/Hermosillo.
 *  5. Arriba, elige la función "configurar" y dale ▶ Ejecutar.
 *     Te pedirá autorizar (permitir Gmail + Hojas). Acepta.
 *  6. ¡Listo! Ya corre solo. Manda un correo de prueba a +pend y espera
 *     el reporte, o ejecuta "reporteCierre" a mano para verlo ya.
 **********************************************************************/

const CONFIG = {
  correo: 'juridicofiscaleg@gmail.com',
  alias: {
    pend:  'juridicofiscaleg+pend@gmail.com',
    urg:   'juridicofiscaleg+urg@gmail.com',
    hecho: 'juridicofiscaleg+hecho@gmail.com'
  },
  etiqueta: 'Capturado',
  hoja: 'Pendientes',
  // Clientes/empresas conocidos para autodetectar (agrega los tuyos):
  clientes: ['KAI FERRETERIA','TOLEDO','DEMIZON','DODOURO','MEXOPTIC',
             'VANGUARDIA','COFIDUE','CROSSFIT','MAUKAA'],
  // Líneas de firma/cortesía que se ignoran al parsear:
  firma: [/director jur/i, /lic\.?\s*adri/i, /eg empresarial/i,
          /enviado desde/i, /^saludos/i, /^gracias/i, /^atentamente/i]
};

const COLS = ['ID','Creado','Hora','Cliente','Prioridad','Estado','Origen',
              'Titulo','Vence','Cerrado','DiasRezago','MsgId'];

/* ============================ SETUP ============================ */
function configurar() {
  asegurarHoja_();
  asegurarEtiqueta_();
  // Borra triggers previos de este proyecto y crea los nuevos
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('ingestarCapturas').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('reporteArranque').timeBased().everyDays(1).atHour(9).nearMinute(0).create();
  ScriptApp.newTrigger('reporteCierre').timeBased().everyDays(1).atHour(18).nearMinute(0).create();
  ScriptApp.newTrigger('reporteSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).nearMinute(0).create();
  ingestarCapturas();
  SpreadsheetApp.getActiveSpreadsheet().toast('Configurado. Reportes: 9:00, 18:00 y lunes 8:00.', 'Seguimiento', 8);
}

/* ======================== INGESTA CORREOS ===================== */
function ingestarCapturas() {
  const sh = asegurarHoja_();
  const label = asegurarEtiqueta_();
  const existentes = idsMensajesEnHoja_(sh);
  const tipos = [
    {addr: CONFIG.alias.urg,   prioridad:'alta',  estado:'pendiente'},
    {addr: CONFIG.alias.pend,  prioridad:'media', estado:'pendiente'},
    {addr: CONFIG.alias.hecho, prioridad:'media', estado:'hecho'}
  ];
  let agregados = 0;
  tipos.forEach(t => {
    const hilos = GmailApp.search('to:' + t.addr + ' -label:' + CONFIG.etiqueta, 0, 50);
    hilos.forEach(hilo => {
      hilo.getMessages().forEach(msg => {
        const to = (msg.getTo() + ' ' + msg.getBcc() + ' ' + msg.getCc()).toLowerCase();
        if (to.indexOf(t.addr.toLowerCase()) === -1) return;      // solo el alias correcto
        const id = msg.getId();
        if (existentes[id]) return;                               // dedup
        const items = parsearItems_(msg.getSubject(), msg.getPlainBody());
        const fecha = msg.getDate();
        items.forEach(txt => {
          const cliente = detectarCliente_(txt);
          sh.appendRow([
            siguienteId_(sh), fmtFecha_(fecha), fmtHora_(fecha), cliente,
            t.prioridad, t.estado, 'correo', txt, '',
            t.estado === 'hecho' ? fmtFecha_(fecha) : '', 0, id
          ]);
          existentes[id] = true;
          agregados++;
        });
      });
      hilo.addLabel(label);        // marca procesado (evita re-lectura)
      hilo.markRead();
    });
  });
  return agregados;
}

/* ========================== REPORTES ========================== */
function reporteArranque() {
  ingestarCapturas();
  const sh = asegurarHoja_();
  const rows = leerRows_(sh);
  const activos = rows.filter(r => r.Estado === 'pendiente' || r.Estado === 'en_curso');
  const rezagados = activos.filter(r => Number(r.DiasRezago) >= 1)
                           .sort((a,b) => Number(b.DiasRezago) - Number(a.DiasRezago));
  const prioridad = activos.slice().sort(ordenPrioridad_).slice(0, 5);

  let s = '';
  s += bloque_('🔁 Rezagado de días anteriores',
        rezagados.length ? rezagados.map(r =>
          li_(r, (Number(r.DiasRezago) >= 2 ? '⚠️ ' : '') +
                 'Viene desde ' + r.Creado + ' (' + r.DiasRezago + ' día(s)). ¿Se retoma hoy?')
        ).join('') : vacio_('Nada arrastrándose. Empezamos limpio.'));
  s += bloque_('⭐ Prioridades sugeridas para hoy',
        prioridad.length ? prioridad.map(r => li_(r)).join('')
        : vacio_('Sin pendientes activos. Manda a +pend / +urg para llenar la lista.'));

  const asunto = '🗂️ Pendientes — Arranque ' + hoyCorto_() +
                 ' (' + activos.length + ' activos, ' + rezagados.length + ' rezagados)';
  enviar_(asunto, encabezado_('Arranque del día',
      activos.length + ' activos · ' + rezagados.length + ' rezagados') + s +
      preguntas_('¿Con qué arrancas hoy? ¿Cambias alguna prioridad? ¿Los rezagados siguen vigentes?'));
}

function reporteCierre() {
  ingestarCapturas();
  const sh = asegurarHoja_();
  const rows = leerRows_(sh);
  const hoy = fmtFecha_(new Date());

  // sube rezago a los activos creados antes de hoy
  rows.forEach(r => {
    if ((r.Estado === 'pendiente' || r.Estado === 'en_curso') && r.Creado < hoy) {
      escribirCelda_(sh, r._fila, 'DiasRezago', Number(r.DiasRezago) + 1);
    }
  });

  const hechoHoy = rows.filter(r => r.Estado === 'hecho' && r.Cerrado === hoy);
  const siguen = rows.filter(r => r.Estado === 'pendiente' || r.Estado === 'en_curso')
                     .sort(ordenPrioridad_);

  let s = '';
  s += bloque_('✅ Hecho hoy',
        hechoHoy.length ? hechoHoy.map(r => li_(r)).join('') : vacio_('Nada marcado como hecho hoy.'));
  s += bloque_('⏳ Sigue pendiente / se rezaga a mañana',
        siguen.length ? siguen.map(r =>
          li_(r, Number(r.DiasRezago) >= 2 ? '⚠️ ' + r.DiasRezago + ' días' : '')
        ).join('') : vacio_('Todo cerrado. Buen día.'));

  const asunto = '🗂️ Pendientes — Cierre ' + hoyCorto_() +
                 ' (' + hechoHoy.length + ' hecho, ' + siguen.length + ' siguen)';
  enviar_(asunto, encabezado_('Cierre del día',
      hechoHoy.length + ' completado(s) · ' + siguen.length + ' siguen') + s +
      preguntas_('¿Algo más quedó hecho? ¿Algo se cancela o cambia de prioridad?'));
}

function reporteSemanal() {
  ingestarCapturas();
  const sh = asegurarHoja_();
  const rows = leerRows_(sh);
  const hoy = new Date();
  const finSemana = fmtFecha_(hoy);
  const iniSemana = fmtFecha_(new Date(hoy.getTime() - 7 * 24 * 3600 * 1000));

  const cerrados = rows.filter(r => r.Estado === 'hecho' && r.Cerrado >= iniSemana && r.Cerrado <= finSemana);
  const abiertos = rows.filter(r => r.Estado === 'pendiente' || r.Estado === 'en_curso');
  const criticos = abiertos.filter(r => Number(r.DiasRezago) >= 3);

  // agrupar por cliente
  const porCliente = {};
  cerrados.concat(abiertos).forEach(r => {
    const c = r.Cliente || 'Internos / sin cliente';
    (porCliente[c] = porCliente[c] || {hechos: [], abiertos: []});
    if (r.Estado === 'hecho') porCliente[c].hechos.push(r); else porCliente[c].abiertos.push(r);
  });

  let s = '<div style="background:#eef2f7;border-radius:10px;padding:14px 16px;margin-bottom:22px;font-size:15px">' +
          '<b>' + cerrados.length + '</b> cerrados &nbsp;·&nbsp; <b>' + abiertos.length + '</b> en curso &nbsp;·&nbsp; <b>' +
          criticos.length + '</b> rezagados críticos</div>';
  Object.keys(porCliente).sort().forEach(c => {
    const g = porCliente[c];
    let items = '';
    g.hechos.forEach(r => items += '<div style="font-size:14px;color:#0b804b;padding:3px 0">✅ ' + esc_(r.Titulo) + '</div>');
    g.abiertos.forEach(r => items += '<div style="font-size:14px;color:#374151;padding:3px 0">⏳ ' + esc_(r.Titulo) +
        (Number(r.DiasRezago) >= 3 ? ' <span style="color:#b91c1c">(' + r.DiasRezago + ' días)</span>' : '') + '</div>');
    s += '<div style="margin-bottom:16px"><div style="font-size:15px;font-weight:700;color:#1e3a5f;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px">' +
         esc_(c) + '</div>' + items + '</div>';
  });

  const asunto = '📊 Reporte semanal de pendientes — ' + iniSemana + ' a ' + finSemana;
  enviar_(asunto, encabezado_('Reporte semanal', 'Semana ' + iniSemana + ' a ' + finSemana) + s);
}

/* ======================== PARSEO/HELPERS ====================== */
function parsearItems_(asunto, cuerpo) {
  let lineas = (cuerpo || '').split(/\r?\n/)
    .map(l => l.replace(/^\s*[•\-\*•]\s*/, '').replace(/^\s*\d+[\.\)]\s*/, '').trim())
    .filter(l => l.length > 0)
    .filter(l => l[0] !== '>')                                  // citas
    .filter(l => !CONFIG.firma.some(rx => rx.test(l)));         // firma/cortesías
  // partir por ';' también
  let items = [];
  lineas.forEach(l => l.split(/\s*;\s*/).forEach(p => { if (p.trim()) items.push(p.trim()); }));
  if (items.length === 0 && asunto) items = [asunto.trim()];    // cuerpo vacío → usa asunto
  // si hay varias líneas, el asunto es encabezado y se ignora; si hay una sola, ya está
  return items;
}

function detectarCliente_(txt) {
  const m = txt.match(/@([A-Za-zÁÉÍÓÚÑ0-9\.\s]{2,30})/);
  if (m) return m[1].trim().toUpperCase();
  const up = txt.toUpperCase();
  const hit = CONFIG.clientes.find(c => up.indexOf(c.toUpperCase()) !== -1);
  return hit || '';
}

function ordenPrioridad_(a, b) {
  const p = {alta: 0, media: 1, baja: 2};
  const d = (p[a.Prioridad] ?? 1) - (p[b.Prioridad] ?? 1);
  return d !== 0 ? d : Number(b.DiasRezago) - Number(a.DiasRezago);
}

/* ---- Hoja ---- */
function asegurarHoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.hoja);
  if (!sh) sh = ss.insertSheet(CONFIG.hoja);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLS);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function leerRows_(sh) {
  const data = sh.getDataRange().getValues();
  const head = data.shift();
  return data.map((row, i) => {
    const o = {_fila: i + 2};
    head.forEach((h, j) => o[h] = row[j]);
    o.Creado  = normFecha_(o.Creado);
    o.Cerrado = normFecha_(o.Cerrado);
    return o;
  });
}
function idsMensajesEnHoja_(sh) {
  const map = {};
  leerRows_(sh).forEach(r => { if (r.MsgId) map[r.MsgId] = true; });
  return map;
}
function siguienteId_(sh) {
  const n = Math.max(0, sh.getLastRow() - 1) + 1;
  return 'P-' + ('000' + n).slice(-4);
}
function escribirCelda_(sh, fila, col, val) {
  sh.getRange(fila, COLS.indexOf(col) + 1).setValue(val);
}

/* ---- Gmail ---- */
function asegurarEtiqueta_() {
  return GmailApp.getUserLabelByName(CONFIG.etiqueta) || GmailApp.createLabel(CONFIG.etiqueta);
}

/* ---- Email HTML ---- */
function enviar_(asunto, html) {
  MailApp.sendEmail({ to: CONFIG.correo, subject: asunto, htmlBody: wrap_(html) });
}
function wrap_(inner) {
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;color:#1f2937;line-height:1.5">' + inner + '</div>';
}
function encabezado_(kicker, resumen) {
  return '<div style="border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:20px">' +
    '<div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">' + kicker + '</div>' +
    '<div style="font-size:22px;font-weight:700;color:#111827">' + fechaLarga_() + '</div>' +
    '<div style="font-size:14px;color:#6b7280;margin-top:4px">' + resumen + '</div></div>';
}
function bloque_(titulo, contenido) {
  return '<div style="margin-bottom:22px"><div style="font-size:15px;font-weight:700;color:#1e3a5f;margin-bottom:8px">' +
    titulo + '</div>' + contenido + '</div>';
}
function li_(r, extra) {
  const dot = r.Prioridad === 'alta' ? '🔴' : (r.Prioridad === 'baja' ? '⚪' : '🟡');
  const cli = r.Cliente ? ' <span style="color:#6b7280">· ' + esc_(r.Cliente) + '</span>' : '';
  const ex  = extra ? ' <span style="color:#6b7280">· ' + esc_(extra) + '</span>' : '';
  return '<div style="font-size:14px;color:#374151;background:#f9fafb;border-radius:8px;padding:10px 12px;margin-bottom:6px">' +
    dot + ' <b>' + esc_(r.Titulo) + '</b>' + cli + ex + '</div>';
}
function vacio_(txt) {
  return '<div style="font-size:14px;color:#374151;background:#f9fafb;border-radius:8px;padding:12px">' + esc_(txt) + '</div>';
}
function preguntas_(txt) {
  return '<div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:13px;color:#6b7280">' +
    '<div style="font-weight:600;color:#4b5563;margin-bottom:4px">Preguntas</div>' + esc_(txt) + '</div>';
}

/* ---- Fechas / util ---- */
function tz_() { return Session.getScriptTimeZone() || 'America/Hermosillo'; }
function fmtFecha_(d) { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }
function normFecha_(v) { return (v instanceof Date) ? fmtFecha_(v) : String(v == null ? '' : v).trim(); }
function fmtHora_(d)  { return Utilities.formatDate(d, tz_(), 'HH:mm'); }
function hoyCorto_()  { return Utilities.formatDate(new Date(), tz_(), 'd/MMM'); }
function fechaLarga_() {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mes  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date();
  return dias[Number(Utilities.formatDate(d, tz_(), 'u')) % 7] + ' · ' +
         Utilities.formatDate(d, tz_(), 'd') + ' de ' + mes[Number(Utilities.formatDate(d, tz_(), 'M')) - 1] +
         ' de ' + Utilities.formatDate(d, tz_(), 'yyyy');
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
