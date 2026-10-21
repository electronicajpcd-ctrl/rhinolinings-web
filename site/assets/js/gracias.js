(function () {
  'use strict';
  var ADDRESS = 'Anillo Periférico Norte Manuel Gómez Morín 2507, Interior Bodega 11, Parque Industrial Sinergía, San Juan de Ocotán, 45019 Zapopan, Jal.';

  var raw = null;
  try { raw = window.sessionStorage.getItem('rl-cita'); } catch (e) {}
  if (!raw) { try { raw = window.localStorage.getItem('rl-cita'); } catch (e) {} }
  var d = {};
  try { d = JSON.parse(raw || '{}') || {}; } catch (e) {}

  var has = !!(d.day && d.time);
  var name = String(d.name || '').trim().split(/\s+/)[0] || '';
  var $ = function (id) { return document.getElementById(id); };

  $('rl-headline').textContent = name ? '¡Gracias, ' + name + '! Tu cita está agendada' : '¡Gracias! Tu cita está agendada';
  $('rl-has-data').hidden = !has;
  $('rl-no-data').hidden = has;
  if (!has) return;

  $('rl-vehicle').textContent = d.vehicle || '';
  $('rl-coverage').textContent = d.coverage || '';
  $('rl-coverage').previousElementSibling.hidden = !d.coverage;
  $('rl-coverage').hidden = !d.coverage;
  $('rl-price').textContent = d.price || '';
  $('rl-day').textContent = d.day || '';
  $('rl-time').textContent = (d.time || '') + ' h';
  var notes = Array.isArray(d.notes) ? d.notes.slice() : [];
  if (d.fleet) notes.unshift('Te enviamos la cotización por volumen antes de tu cita.');
  $('rl-price-note').textContent = notes.length ? notes.join(' ') : 'Es el precio que pagarás en el taller.';

  if (d.date && /^\d{8}$/.test(d.date)) {
    var hm = String(d.time).split(':');
    var h = parseInt(hm[0], 10), m = parseInt(hm[1] || '0', 10);
    var pad = function (n) { return ('0' + n).slice(-2); };
    var start = d.date + 'T' + pad(h) + pad(m) + '00';
    var end = d.date + 'T' + pad(h + 1) + pad(m) + '00';
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('Cita Rhino Linings GDL · ' + d.vehicle + (d.coverage ? ' · ' + d.coverage : ''))
      + '&dates=' + start + '/' + end
      + '&ctz=America/Mexico_City'
      + '&details=' + encodeURIComponent('Aplicación de recubrimiento Rhino Linings. Precio aceptado: ' + d.price + '. Tel. 33 1314 2064.')
      + '&location=' + encodeURIComponent(ADDRESS);
    var cal = $('rl-cal');
    cal.href = url;
    cal.hidden = false;
  }
})();
