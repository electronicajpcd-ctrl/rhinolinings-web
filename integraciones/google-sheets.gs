/**
 * Recibe las citas del sitio rhinolinings.com.mx y las agrega como filas en esta hoja.
 *
 * Instalación (una sola vez):
 * 1. Abre la hoja de Google Sheets donde quieres las citas.
 * 2. Extensiones → Apps Script. Borra lo que haya y pega este archivo completo.
 * 3. Cambia TOKEN por una clave larga inventada (la misma irá en el secreto SHEETS_TOKEN de GitHub).
 * 4. Implementar → Nueva implementación → tipo "Aplicación web".
 *      Ejecutar como: Yo
 *      Quién tiene acceso: Cualquier usuario
 *    Autoriza los permisos que pida Google y copia la URL que termina en /exec.
 * 5. En GitHub (environment staging y produccion) crea los secretos:
 *      SHEETS_URL   = la URL /exec
 *      SHEETS_TOKEN = la misma clave del paso 3
 */

var TOKEN = 'CAMBIA-ESTA-CLAVE';
var HOJA = 'Citas';

var COLUMNAS = [
  ['recibida', 'Recibida'],
  ['nombre', 'Nombre'],
  ['whatsapp', 'WhatsApp'],
  ['vehiculo', 'Vehículo'],
  ['modelo', 'Marca y modelo'],
  ['precio', 'Precio'],
  ['precio_aceptado', 'Aceptó precio'],
  ['fecha', 'Fecha cita'],
  ['fecha_texto', 'Día'],
  ['hora', 'Hora'],
  ['urgencia', 'Urgencia'],
  ['utm_source', 'utm_source'],
  ['utm_medium', 'utm_medium'],
  ['utm_campaign', 'utm_campaign'],
  ['utm_content', 'utm_content'],
  ['utm_term', 'utm_term'],
  ['fbclid', 'fbclid'],
  ['gclid', 'gclid'],
  ['pagina', 'Página'],
  ['correo_enviado', 'Correo enviado'],
  // Cotizador (columnas nuevas al final para no mover las anteriores)
  ['cobertura', 'Servicio'],
  ['material', 'Material'],
  ['extras', 'Extras'],
  ['factura', 'Factura'],
  ['subtotal', 'Subtotal'],
  ['iva', 'IVA'],
  ['total', 'Total']
];

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta({ ok: false, error: 'json' });
  }
  if (!data || data.token !== TOKEN) {
    return respuesta({ ok: false, error: 'token' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    // Encabezados: se escriben si la hoja está vacía o si faltan columnas nuevas.
    if (hoja.getLastRow() === 0 || hoja.getLastColumn() < COLUMNAS.length) {
      hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS.map(function (c) { return c[1]; })]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    }
    hoja.appendRow(COLUMNAS.map(function (c) {
      var v = data[c[0]];
      if (c[0] === 'whatsapp' && v) return "'" + v; // conservar como texto
      return v === undefined || v === null ? '' : v;
    }));
  } finally {
    lock.releaseLock();
  }
  return respuesta({ ok: true });
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
