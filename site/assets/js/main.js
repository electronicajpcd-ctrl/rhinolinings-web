(function () {
  'use strict';
  var CFG = window.RL_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) {}
    try { window.localStorage.setItem(key, value); } catch (e) {}
  }
  function read(key) {
    var v = null;
    try { v = window.sessionStorage.getItem(key); } catch (e) {}
    if (!v) { try { v = window.localStorage.getItem(key); } catch (e) {} }
    return v;
  }

  /* ---------- Origen de campaña (UTM, fbclid, gclid) ---------- */
  (function captureSource() {
    var params = new URLSearchParams(window.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
    var found = {};
    var any = false;
    keys.forEach(function (k) { var v = params.get(k); if (v) { found[k] = v; any = true; } });
    if (any) { found.landing = window.location.href; store('rl-origen', JSON.stringify(found)); }
  })();

  /* ---------- Menú móvil ---------- */
  var burger = document.getElementById('rl-burger');
  var panel = document.getElementById('rl-mobile-menu');
  function setMenu(open) {
    if (!burger || !panel) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    panel.hidden = !open;
  }
  if (burger && panel) {
    burger.addEventListener('click', function () { setMenu(panel.hidden); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) setMenu(false); });
  }

  /* ---------- Barra de avance del scroll ---------- */
  var bar = document.querySelector('.rl-bar');
  if (bar) {
    var ticking = false;
    var paint = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(paint); } }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------- Animaciones al hacer scroll ---------- */
  var root = document.getElementById('rl-root');
  if (root && 'IntersectionObserver' in window && !reduceMotion) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        if (en.isIntersecting) el.setAttribute('data-rv', 'in');
        else el.setAttribute('data-rv', en.boundingClientRect.top < 0 ? 'above' : 'below');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(root.querySelectorAll('.reveal'), function (el) {
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.transitionDelay = ((i % 4) * 90) + 'ms';
      obs.observe(el);
    });
    root.setAttribute('data-rl-js', '1');

    var hero = document.getElementById('inicio');
    if (hero) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.setAttribute('data-hero', en.isIntersecting ? 'in' : 'out'); });
      }, { threshold: 0 }).observe(hero);
    }
  }

  /* ---------- Agendador ---------- */
  var form = document.getElementById('rl-form');
  if (!form) return;

  var prices = CFG.prices || {};
  var vehicleNames = Object.keys(prices);
  var dows = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var mons = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var state = { vehicle: vehicleNames[0], day: null, time: null };

  var elVehicles = document.getElementById('rl-vehicles');
  var elDays = document.getElementById('rl-days');
  var elTimes = document.getElementById('rl-times');
  var elPriceBox = document.getElementById('rl-pricebox');
  var elPrice = document.getElementById('rl-price');
  var elVehicleLabel = document.getElementById('rl-vehicle-label');
  var elAck = document.getElementById('rl-price-ack');
  var elOk = document.getElementById('rl-priceok');
  var elError = document.getElementById('rl-error');
  var elSubmit = document.getElementById('rl-submit');
  var elName = document.getElementById('rl-name');
  var elPhone = document.getElementById('rl-phone');
  var elModel = document.getElementById('rl-model');
  var elWhen = document.getElementById('rl-when');

  function pad(n) { return ('0' + n).slice(-2); }
  function pill(html, pressed, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rl-pill';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.innerHTML = html;
    b.addEventListener('click', onClick);
    return b;
  }

  function nextDays() {
    var out = [];
    var d = new Date();
    while (out.length < (CFG.daysAhead || 6)) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      if (d.getDay() === 0) continue;
      out.push({
        iso: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
        label: dows[d.getDay()] + ' ' + d.getDate() + ' ' + mons[d.getMonth()],
        dow: dows[d.getDay()], num: d.getDate(), mon: mons[d.getMonth()],
        sat: d.getDay() === 6
      });
    }
    return out;
  }
  var days = nextDays();

  function slotsFor(day) {
    var s = CFG.slots || {};
    return day && day.sat ? (s.saturday || []) : (s.weekday || []);
  }

  function renderVehicles() {
    elVehicles.innerHTML = '';
    vehicleNames.forEach(function (v) {
      elVehicles.appendChild(pill(v, state.vehicle === v, function () {
        if (state.vehicle !== v) { state.vehicle = v; elOk.checked = false; }
        renderVehicles(); renderPrice(); clearError();
      }));
    });
  }
  function renderDays() {
    elDays.innerHTML = '';
    days.forEach(function (d) {
      var html = '<span class="rl-dow">' + d.dow + '</span><span class="rl-num">' + d.num + '</span><span class="rl-mon">' + d.mon + '</span>';
      var b = pill(html, state.day && state.day.iso === d.iso, function () {
        state.day = d;
        if (state.time && slotsFor(d).indexOf(state.time) < 0) state.time = null;
        renderDays(); renderTimes(); clearError();
      });
      b.setAttribute('aria-label', d.label);
      elDays.appendChild(b);
    });
  }
  function renderTimes() {
    elTimes.innerHTML = '';
    slotsFor(state.day).forEach(function (t) {
      elTimes.appendChild(pill(t, state.time === t, function () { state.time = t; renderTimes(); clearError(); }));
    });
  }
  function renderPrice() {
    var p = prices[state.vehicle] || {};
    elVehicleLabel.textContent = state.vehicle.toLowerCase();
    elPrice.textContent = p.label || '';
    elAck.textContent = p.fleet
      ? 'por volumen desde 3 unidades. Te enviamos la cotización antes de tu cita.'
      : 'de mi ' + state.vehicle.toLowerCase() + ': ' + p.label + '. El precio final se confirma al revisar el vehículo en el taller.';
    elPriceBox.classList.toggle('is-ok', elOk.checked);
  }
  elOk.addEventListener('change', function () { elPriceBox.classList.remove('is-error'); renderPrice(); clearError(); });

  function showError(msg, field) {
    elError.textContent = msg;
    elError.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function clearError() {
    elError.hidden = true;
    [elName, elPhone].forEach(function (f) { f.removeAttribute('aria-invalid'); });
  }
  [elName, elPhone].forEach(function (f) { f.addEventListener('input', function () { f.removeAttribute('aria-invalid'); }); });

  function validate() {
    if (!state.day || !state.time) { showError('Elige un día y una hora para continuar.'); elDays.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); return false; }
    if (elName.value.trim().length < 2) { showError('Escribe tu nombre.', elName); return false; }
    var digits = elPhone.value.replace(/\D/g, '');
    if (digits.length < 10) { showError('Escribe tu WhatsApp a 10 dígitos.', elPhone); return false; }
    if (!elOk.checked) { elPriceBox.classList.add('is-error'); showError('Marca la casilla para confirmar que conoces el precio.'); elOk.focus(); return false; }
    return true;
  }

  var loadedAt = Date.now();
  function send(payload) {
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function (k) { if (payload[k] !== null && payload[k] !== undefined) body.append(k, String(payload[k])); });
    var trap = form.querySelector('[name="empresa_web"]');
    body.append('empresa_web', trap ? trap.value : '');
    body.append('t', String(loadedAt));
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(CFG.endpoint || 'api/cita.php', {
      method: 'POST', body: body, headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) { clearTimeout(timer); return !!(j && j.ok); })
      .catch(function () { clearTimeout(timer); return false; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    var p = prices[state.vehicle] || {};
    var origen = {};
    try { origen = JSON.parse(read('rl-origen') || '{}') || {}; } catch (err) {}
    var payload = {
      nombre: elName.value.trim(),
      whatsapp: elPhone.value.replace(/\D/g, ''),
      modelo: elModel.value.trim(),
      urgencia: elWhen.value,
      vehiculo: state.vehicle,
      precio: p.label || '',
      precio_monto: p.amount,
      precio_aceptado: 'si',
      fecha: state.day.iso,
      fecha_texto: state.day.label,
      hora: state.time,
      zona_horaria: CFG.timezone || 'America/Mexico_City',
      pagina: window.location.href,
      utm_source: origen.utm_source, utm_medium: origen.utm_medium, utm_campaign: origen.utm_campaign,
      utm_content: origen.utm_content, utm_term: origen.utm_term, fbclid: origen.fbclid, gclid: origen.gclid,
      enviado: new Date().toISOString()
    };
    store('rl-cita', JSON.stringify({
      vehicle: state.vehicle, price: p.label || '', fleet: !!p.fleet, priceAccepted: true,
      day: state.day.label, date: state.day.iso.replace(/-/g, ''), time: state.time,
      name: payload.nombre, phone: payload.whatsapp
    }));
    elSubmit.disabled = true;
    elSubmit.textContent = 'Agendando…';
    send(payload).then(function (ok) {
      if (ok) { window.location.href = CFG.thanksUrl || 'gracias/'; return; }
      elSubmit.disabled = false;
      elSubmit.textContent = 'Confirmar mi cita';
      showError('No pudimos registrar tu cita. Intenta de nuevo en un momento o escríbenos por WhatsApp al 33 1314 2064.');
    });
  });

  renderVehicles(); renderDays(); renderTimes(); renderPrice();
})();
