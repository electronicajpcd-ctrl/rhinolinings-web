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

  /* ---------- Cotizador + agendador ---------- */
  var form = document.getElementById('rl-form');
  if (!form) return;

  var Q = CFG.quote || {};
  var VEH = Q.vehicles || [];
  var IVA = typeof Q.ivaRate === 'number' ? Q.ivaRate : 0.16;
  var PLASTIC = Q.plasticFee || 0;
  var BORDES = Q.bordesOnlyPrice || 0;
  var dows = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var dowsLong = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var mons = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  var st = {
    vehicle: null, option: null, material: null, extras: [], factura: null,
    units: null, accepted: false, day: null, time: null,
    name: '', phone: '', model: '', step: 'vehicle', history: []
  };

  var elStep = document.getElementById('rl-step');
  var elBack = document.getElementById('rl-back');
  var elCount = document.getElementById('rl-step-count');
  var elBar = document.getElementById('rl-progress');
  var elError = document.getElementById('rl-error');
  var loadedAt = Date.now();

  function money(n) { return '$' + Math.round(n).toLocaleString('es-MX'); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return ('0' + n).slice(-2); }
  function vehicle() { return VEH.filter(function (v) { return v.id === st.vehicle; })[0] || null; }
  function isFleet() { var v = vehicle(); return !!(v && v.fleet); }
  function optionsFor(v) {
    if (!v || !v.options) return [];
    var o = v.options.slice();
    if (v.group === 'pickup' && BORDES) {
      o.push({ id: 'solo-bordes', name: 'Solo bordes', detail: 'Mi caja ya trae recubrimiento de agencia', price: BORDES });
    }
    return o;
  }
  function option() { return optionsFor(vehicle()).filter(function (o) { return o.id === st.option; })[0] || null; }

  function quote() {
    var o = option();
    if (!o) return null;
    var base = o.price;
    var plastic = st.material === 'plastico' ? PLASTIC : 0;
    var subtotal = base + plastic;
    var iva = st.factura === 'si' ? Math.round(subtotal * IVA) : 0;
    return { base: base, plastic: plastic, subtotal: subtotal, iva: iva, total: subtotal + iva };
  }

  function flow() {
    if (isFleet()) return ['vehicle', 'units', 'schedule'];
    return ['vehicle', 'coverage', 'material', 'extras', 'factura', 'summary', 'schedule'];
  }

  function go(step) {
    if (step !== st.step) st.history.push(st.step);
    st.step = step;
    render(true);
  }
  function back() {
    var prev = st.history.pop();
    if (prev) { st.step = prev; render(true, true); }
  }
  elBack.addEventListener('click', back);

  function header(title, sub) {
    return '<h3 class="rl-q-title">' + title + '</h3>' + (sub ? '<p class="rl-q-sub">' + sub + '</p>' : '');
  }
  function card(opts) {
    // opts: {key, value, title, detail, price, pressed, multi}
    return '<button type="button" class="rl-opt' + (opts.multi ? ' rl-opt-multi' : '') + '" data-key="' + opts.key + '" data-value="' + esc(opts.value) + '" aria-pressed="' + (opts.pressed ? 'true' : 'false') + '">' +
      (opts.multi ? '<span class="rl-opt-check" aria-hidden="true"></span>' : '') +
      '<span class="rl-opt-text"><span class="rl-opt-title">' + esc(opts.title) + '</span>' +
      (opts.detail ? '<span class="rl-opt-detail">' + esc(opts.detail) + '</span>' : '') + '</span>' +
      (opts.price ? '<span class="rl-opt-price">' + opts.price + '</span>' : '') +
      (!opts.multi ? '<svg class="rl-opt-arrow" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>' : '') +
      '</button>';
  }
  function primary(label, id) {
    return '<button type="button" id="' + (id || 'rl-next') + '" class="rl-btn rl-q-primary">' + label + '</button>';
  }

  /* ----- pasos ----- */
  var views = {
    vehicle: function () {
      var h = header('¿Qué vehículo quieres proteger?', '¿No sabes cuál es? Elige el más parecido; lo confirmamos en el taller.');
      h += '<div class="rl-opts">';
      VEH.forEach(function (v) {
        var min = (v.options || []).reduce(function (m, o) { return Math.min(m, o.price); }, Infinity);
        h += card({ key: 'vehicle', value: v.id, title: v.name, price: v.fleet ? 'Precio especial' : 'desde ' + money(min), pressed: st.vehicle === v.id });
      });
      return h + '</div>';
    },
    coverage: function () {
      var v = vehicle();
      var h = header(v.group === 'van' ? '¿Qué parte de la caja quieres recubrir?' : '¿Qué quieres recubrir?', esc(v.name));
      h += '<div class="rl-opts">';
      optionsFor(v).forEach(function (o) {
        h += card({ key: 'option', value: o.id, title: o.name, detail: o.detail || (o.id === 'con-bordes' ? 'Caja completa + los bordes superiores' : o.id === 'sin-bordes' ? 'Caja completa, bordes sin recubrir' : ''), price: money(o.price), pressed: st.option === o.id });
      });
      return h + '</div>';
    },
    material: function () {
      var h = header('¿La caja o las piezas son de plástico?', 'Al plástico se le aplica un tratamiento de adherencia antes del recubrimiento.');
      h += '<div class="rl-opts">';
      h += card({ key: 'material', value: 'metal', title: 'No, son de metal', price: '+ $0', pressed: st.material === 'metal' });
      h += card({ key: 'material', value: 'plastico', title: 'Sí, son de plástico', detail: 'Tratamiento de adherencia', price: '+ ' + money(PLASTIC), pressed: st.material === 'plastico' });
      h += card({ key: 'material', value: 'no-se', title: 'No estoy seguro', detail: 'Lo revisamos en el taller; solo se cobra si aplica', pressed: st.material === 'no-se' });
      return h + '</div>';
    },
    extras: function () {
      var h = header('¿Te interesa algo más?', 'Opcional. Estos se cotizan en el taller al ver tu camioneta.');
      h += '<div class="rl-opts">';
      (Q.extras || []).forEach(function (x) {
        h += card({ key: 'extra', value: x, title: x, detail: 'Se cotiza en el taller', pressed: st.extras.indexOf(x) >= 0, multi: true });
      });
      h += '</div>' + primary(st.extras.length ? 'Continuar' : 'No, continuar');
      return h;
    },
    factura: function () {
      var h = header('¿Necesitas factura?', 'Si la necesitas se agrega el 16% de IVA.');
      h += '<div class="rl-opts">';
      h += card({ key: 'factura', value: 'no', title: 'No necesito factura', pressed: st.factura === 'no' });
      h += card({ key: 'factura', value: 'si', title: 'Sí, necesito factura', price: '+ IVA 16%', pressed: st.factura === 'si' });
      return h + '</div>';
    },
    summary: function () {
      var v = vehicle(), o = option(), q = quote();
      var rows = '<div class="rl-sum-row"><span>' + esc(o.name) + '<small>' + esc(v.name) + '</small></span><span>' + money(q.base) + '</span></div>';
      if (q.plastic) rows += '<div class="rl-sum-row"><span>Tratamiento de adherencia (plástico)</span><span>' + money(q.plastic) + '</span></div>';
      if (st.factura === 'si') rows += '<div class="rl-sum-row rl-sum-muted"><span>Subtotal</span><span>' + money(q.subtotal) + '</span></div><div class="rl-sum-row rl-sum-muted"><span>IVA 16%</span><span>' + money(q.iva) + '</span></div>';
      var notes = [];
      if (st.material === 'no-se') notes.push('Si la caja o las piezas resultan ser de plástico, se agregan ' + money(PLASTIC) + (st.factura === 'si' ? ' + IVA' : '') + ' por el tratamiento de adherencia.');
      if (st.extras.length) notes.push(esc(st.extras.join(' y ')) + ': se cotizan en el taller.');
      var h = header('Tu cotización', '');
      h += '<div class="rl-sum">' + rows +
        '<div class="rl-sum-total"><span>Total' + (st.factura === 'si' ? ' con IVA' : '') + '</span><span>' + money(q.total) + ' <small>MXN</small></span></div></div>';
      if (notes.length) h += '<ul class="rl-sum-notes">' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';
      h += '<label class="rl-accept' + (st.accepted ? ' is-ok' : '') + '"><input type="checkbox" id="rl-accept"' + (st.accepted ? ' checked' : '') + '><span><strong>Acepto este precio</strong> de ' + money(q.total) + ' MXN para mi ' + esc(v.name.toLowerCase()) + '.</span></label>';
      h += primary('Elegir día y hora');
      return h;
    },
    units: function () {
      var h = header('¿Cuántas unidades son?', 'Flotillas desde 3 unidades tienen precio especial. Te enviamos la cotización antes de tu cita.');
      h += '<div class="rl-opts">';
      ['3 a 5 unidades', '6 a 10 unidades', 'Más de 10 unidades'].forEach(function (u) {
        h += card({ key: 'units', value: u, title: u, pressed: st.units === u });
      });
      return h + '</div>';
    },
    schedule: function () {
      var h = header('Elige día y hora', '');
      h += '<div class="rl-sched"><div class="rl-sched-label">Día</div><div class="rl-days">';
      nextDays().forEach(function (d) {
        h += '<button type="button" class="rl-pill" data-key="day" data-value="' + d.iso + '" aria-pressed="' + (st.day && st.day.iso === d.iso ? 'true' : 'false') + '" aria-label="' + d.label + '"><span class="rl-dow">' + d.dow + '</span><span class="rl-num">' + d.num + '</span><span class="rl-mon">' + d.mon + '</span></button>';
      });
      h += '</div><div class="rl-sched-label">Hora</div><div class="rl-times">';
      if (!st.day) h += '<p class="rl-q-sub" style="margin:0">Primero elige un día.</p>';
      else slotsFor(st.day).forEach(function (t) {
        h += '<button type="button" class="rl-pill" data-key="time" data-value="' + t + '" aria-pressed="' + (st.time === t ? 'true' : 'false') + '">' + t + '</button>';
      });
      h += '</div></div>';
      h += '<div class="rl-fields">' +
        '<label>Nombre<input id="rl-name" type="text" autocomplete="name" class="rl-input" placeholder="Tu nombre" value="' + esc(st.name) + '"></label>' +
        '<label>WhatsApp<input id="rl-phone" type="tel" inputmode="tel" autocomplete="tel" class="rl-input" placeholder="33 0000 0000" value="' + esc(st.phone) + '"></label>' +
        '<label class="rl-field-wide">Marca, modelo y año <span class="rl-opt-detail">(opcional)</span><input id="rl-model" type="text" class="rl-input" placeholder="Ej. Toyota Tacoma 2023" value="' + esc(st.model) + '"></label>' +
        '</div>';
      var q = quote();
      h += '<div class="rl-sched-total"><span>' + esc(isFleet() ? vehicle().name + ' · ' + (st.units || '') : vehicle().name + ' · ' + option().name) + '</span><strong>' + (isFleet() ? 'Precio especial' : money(q.total) + ' MXN') + '</strong></div>';
      h += '<button type="submit" id="rl-submit" class="rl-btn rl-q-primary">Confirmar mi cita</button>';
      return h;
    }
  };

  function nextDays() {
    var out = [];
    var d = new Date();
    while (out.length < (CFG.daysAhead || 6)) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      if (d.getDay() === 0) continue;
      out.push({
        iso: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
        label: dows[d.getDay()] + ' ' + d.getDate() + ' ' + mons[d.getMonth()],
        long: dowsLong[d.getDay()] + ' ' + d.getDate() + ' de ' + mons[d.getMonth()],
        dow: dows[d.getDay()], num: d.getDate(), mon: mons[d.getMonth()], sat: d.getDay() === 6
      });
    }
    return out;
  }
  function slotsFor(day) {
    var s = CFG.slots || {};
    return day && day.sat ? (s.saturday || []) : (s.weekday || []);
  }

  function render(animate, backwards) {
    var steps = flow();
    var idx = steps.indexOf(st.step);
    elCount.textContent = 'Paso ' + (idx + 1) + ' de ' + steps.length;
    elBar.style.transform = 'scaleX(' + ((idx + 1) / steps.length) + ')';
    elBack.hidden = idx <= 0;
    clearError();
    elStep.innerHTML = views[st.step]();
    if (animate && !reduceMotion) {
      elStep.classList.remove('rl-in-fwd', 'rl-in-back');
      void elStep.offsetWidth;
      elStep.classList.add(backwards ? 'rl-in-back' : 'rl-in-fwd');
    }
    bind();
  }

  function keepFields() {
    var n = document.getElementById('rl-name'), p = document.getElementById('rl-phone'), m = document.getElementById('rl-model');
    if (n) st.name = n.value; if (p) st.phone = p.value; if (m) st.model = m.value;
  }

  function bind() {
    Array.prototype.forEach.call(elStep.querySelectorAll('[data-key]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-key'), v = b.getAttribute('data-value');
        if (k === 'vehicle') {
          if (st.vehicle !== v) { st.option = null; st.accepted = false; st.units = null; }
          st.vehicle = v; go(isFleet() ? 'units' : 'coverage');
        } else if (k === 'option') {
          if (st.option !== v) st.accepted = false;
          st.option = v; go('material');
        } else if (k === 'material') {
          if (st.material !== v) st.accepted = false;
          st.material = v; go('extras');
        } else if (k === 'extra') {
          var i = st.extras.indexOf(v);
          if (i >= 0) st.extras.splice(i, 1); else st.extras.push(v);
          b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
          var nx = document.getElementById('rl-next'); if (nx) nx.textContent = st.extras.length ? 'Continuar' : 'No, continuar';
        } else if (k === 'factura') {
          if (st.factura !== v) st.accepted = false;
          st.factura = v; go('summary');
        } else if (k === 'units') {
          st.units = v; go('schedule');
        } else if (k === 'day') {
          keepFields();
          st.day = nextDays().filter(function (d) { return d.iso === v; })[0];
          if (st.time && slotsFor(st.day).indexOf(st.time) < 0) st.time = null;
          render(false);
        } else if (k === 'time') {
          keepFields();
          st.time = v; render(false);
        }
      });
    });
    var next = document.getElementById('rl-next');
    if (next) next.addEventListener('click', function () {
      if (st.step === 'extras') return go('factura');
      if (st.step === 'summary') {
        if (!st.accepted) { var l = elStep.querySelector('.rl-accept'); if (l) l.classList.add('is-error'); return showError('Marca la casilla para aceptar el precio y continuar.'); }
        return go('schedule');
      }
    });
    var acc = document.getElementById('rl-accept');
    if (acc) acc.addEventListener('change', function () {
      st.accepted = acc.checked;
      var l = acc.closest('.rl-accept'); l.classList.toggle('is-ok', acc.checked); l.classList.remove('is-error'); clearError();
    });
    ['rl-name', 'rl-phone'].forEach(function (id) {
      var f = document.getElementById(id);
      if (f) f.addEventListener('input', function () { f.removeAttribute('aria-invalid'); });
    });
  }

  function showError(msg, field) {
    elError.textContent = msg; elError.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function clearError() { elError.hidden = true; }

  function send(payload) {
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function (k) { if (payload[k] !== null && payload[k] !== undefined) body.append(k, String(payload[k])); });
    var trap = form.querySelector('[name="empresa_web"]');
    body.append('empresa_web', trap ? trap.value : '');
    body.append('t', String(loadedAt));
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return fetch(CFG.endpoint || 'api/cita.php', { method: 'POST', body: body, headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) { clearTimeout(timer); return !!(j && j.ok); })
      .catch(function () { clearTimeout(timer); return false; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (st.step !== 'schedule') return;
    keepFields();
    clearError();
    if (!st.day || !st.time) return showError('Elige un día y una hora.');
    if (st.name.trim().length < 2) return showError('Escribe tu nombre.', document.getElementById('rl-name'));
    if (st.phone.replace(/\D/g, '').length < 10) return showError('Escribe tu WhatsApp a 10 dígitos.', document.getElementById('rl-phone'));

    var v = vehicle(), o = option(), q = quote(), fleet = isFleet();
    var materialTxt = { metal: 'Metal', plastico: 'Plástico (+ tratamiento de adherencia)', 'no-se': 'No sabe (revisar en taller)' }[st.material] || '';
    var precioTxt = fleet ? 'Precio especial por volumen' : money(q.total) + ' MXN' + (st.factura === 'si' ? ' con IVA' : ' sin IVA');
    var origen = {};
    try { origen = JSON.parse(read('rl-origen') || '{}') || {}; } catch (err) {}
    var payload = {
      nombre: st.name.trim(),
      whatsapp: st.phone.replace(/\D/g, ''),
      modelo: st.model.trim(),
      urgencia: '',
      vehiculo: v.name,
      cobertura: fleet ? st.units : o.name,
      material: fleet ? '' : materialTxt,
      extras: st.extras.join(', '),
      factura: fleet ? '' : (st.factura === 'si' ? 'Sí' : 'No'),
      subtotal: fleet ? '' : q.subtotal,
      iva: fleet ? '' : q.iva,
      total: fleet ? '' : q.total,
      precio: precioTxt,
      precio_monto: fleet ? '' : q.total,
      precio_aceptado: 'si',
      fecha: st.day.iso,
      fecha_texto: st.day.label,
      hora: st.time,
      zona_horaria: CFG.timezone || 'America/Mexico_City',
      pagina: window.location.href,
      utm_source: origen.utm_source, utm_medium: origen.utm_medium, utm_campaign: origen.utm_campaign,
      utm_content: origen.utm_content, utm_term: origen.utm_term, fbclid: origen.fbclid, gclid: origen.gclid,
      enviado: new Date().toISOString()
    };
    var notes = [];
    if (st.material === 'no-se') notes.push('Si la caja resulta ser de plástico se agregan ' + money(PLASTIC) + ' por tratamiento de adherencia.');
    if (st.extras.length) notes.push(st.extras.join(' y ') + ': se cotizan en el taller.');
    store('rl-cita', JSON.stringify({
      vehicle: v.name, coverage: payload.cobertura, price: precioTxt, fleet: fleet, priceAccepted: true,
      notes: notes, day: st.day.label, date: st.day.iso.replace(/-/g, ''), time: st.time, name: payload.nombre, phone: payload.whatsapp
    }));
    var btn = document.getElementById('rl-submit');
    btn.disabled = true; btn.textContent = 'Agendando…';
    send(payload).then(function (ok) {
      if (ok) { window.location.href = CFG.thanksUrl || 'gracias/'; return; }
      btn.disabled = false; btn.textContent = 'Confirmar mi cita';
      showError('No pudimos registrar tu cita. Intenta de nuevo en un momento o escríbenos por WhatsApp al 33 1314 2064.');
    });
  });

  // Enlaces "Cotizar mi flotilla": entran directo con flotilla preseleccionada.
  Array.prototype.forEach.call(document.querySelectorAll('[data-quote-vehicle]'), function (a) {
    a.addEventListener('click', function () {
      var id = a.getAttribute('data-quote-vehicle');
      if (VEH.some(function (v) { return v.id === id; })) {
        st.history = []; st.vehicle = id; st.step = 'vehicle';
        go(isFleet() ? 'units' : 'coverage');
      }
    });
  });

  render(false);
})();
