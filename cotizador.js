// ============================================================
// Solartech — cotizador en línea
// Los precios y la configuración están en js/config.js
// ============================================================
(function () {
  var CONFIG = window.SOLARTECH || {};
  var DB_DEFAULT = CONFIG.db;
  var WHATSAPP = (CONFIG.whatsapp || '').replace(/\D/g, '');
  var GARANTIAS = CONFIG.garantias || { mantenimientoAnios: 1, panelesAnios: 20, panelesRendimiento: 90, bateriasAnios: 10, bateriasPerdida: 30 };

  var PRESETS = {
    hogar: { nevera: 1, ventilador: 2, tv: 1, bombillo: 8, lavadora: 1, plancha: 1, licuadora: 1, router: 1, celular: 3 },
    negocio: { nevera: 1, aa12: 1, ventilador: 1, bombillo: 12, pc: 2, portatil: 1, router: 1, celular: 2, camaras: 4 },
    finca: { nevera: 1, congelador: 1, ventilador: 2, tv: 1, bombillo: 6, bomba: 1, router: 1, celular: 3 }
  };
  var INVERSORES = [3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  var HORAS = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24];
  var RESPALDO = { esencial: 0.3, media: 0.5, todo: 1 };
  var NOMBRES = { hogar: 'Hogar', negocio: 'Negocio', finca: 'Finca o zona rural' };
  var CLAVE = 'solartech-db-v1';

  var DB = cargarDB();

  var S = {
    paso: 1, lugar: 'hogar', red: 'si', modo: 'factura', kwh: '', valor: '',
    qty: {}, hrs: {}, tocado: false,
    sistema: 'red', respaldo: 'esencial', cobertura: 100, nombre: ''
  };

  var root = document.getElementById('cotizador');
  if (!root) return;
  var $ = function (sel) { return root.querySelector(sel); };
  var $$ = function (sel) { return root.querySelectorAll(sel); };

  // ---------- Utilidades ----------
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }
  function cargarDB() {
    var db = clonar(DB_DEFAULT);
    try {
      var guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (guardado) {
        Object.assign(db.parametros, guardado.parametros || {});
        Object.assign(db.equipos, guardado.equipos || {});
        if (guardado.electrodomesticos) {
          db.electrodomesticos.forEach(function (a) {
            var g = guardado.electrodomesticos[a.id];
            if (g) { a.w = g.w; a.h = g.h; }
          });
        }
      }
    } catch (e) {}
    return db;
  }
  function num(x, d) { return Number(x).toLocaleString('es-CO', { maximumFractionDigits: d == null ? 0 : d }); }
  function cop(x) { return '$ ' + num(Math.round(x / 1000) * 1000); }
  function copCorto(x) {
    if (x >= 1e6) return '$ ' + num(x / 1e6, 1) + ' millones';
    return cop(x);
  }
  function horasTxt(h) { return h < 1 ? (h * 60) + ' min' : num(h, 1) + ' h'; }

  // ---------- Cálculos ----------
  function consumo() {
    if (S.modo === 'factura') return Math.max(0, parseFloat(S.kwh) || 0);
    var t = 0;
    DB.electrodomesticos.forEach(function (a) {
      t += (S.qty[a.id] || 0) * a.w * (S.hrs[a.id] != null ? S.hrs[a.id] : a.h) * 30 / 1000;
    });
    return t;
  }
  function tarifa() {
    var k = parseFloat(S.kwh), v = parseFloat(S.valor);
    if (S.modo === 'factura' && k > 0 && v > 0) return Math.min(10000, Math.max(100, v / k));
    return DB.parametros.tarifa;
  }
  function facturaHoy() {
    var v = parseFloat(S.valor);
    if (S.modo === 'factura' && v > 0) return v;
    return consumo() * tarifa();
    return DB.parametros.tarifa;
  }
  function calcular(sistema) {
    var c = consumo();
    if (c <= 0) return null;
    var e = DB.equipos, p = DB.parametros, conRed = S.red === 'si';
    var cobertura = 1; // El sistema cubre el 100 % del tope para que la factura llegue en $ 0
    var diario = c / 30;
    var kwpObjetivo = diario * cobertura / (p.hsp * p.pr);
    var paneles = Math.max(2, Math.ceil(kwpObjetivo * 1000 / e.panelW));
    var kwp = paneles * e.panelW / 1000;
    var invKW = INVERSORES.filter(function (s) { return s >= kwp / 1.15; })[0] || Math.ceil(kwp / 1.15);
    var baterias = 0, batKWh = 0;
    if (sistema === 'baterias') {
      var f = conRed ? RESPALDO[S.respaldo] : 1;
      batKWh = diario * f / (e.bateriaDoD / 100);
      baterias = Math.max(1, Math.ceil(batKWh / e.bateriaKWh));
    }
    var precioInv = sistema === 'red' ? e.inversorRedKW : e.inversorHibridoKW;
    var items = [
      { c: 'Paneles solares', d: paneles + ' de ' + e.panelW + ' W', v: paneles * e.panelPrecio },
      { c: sistema === 'red' ? 'Inversor de conexión a red' : 'Inversor híbrido', d: invKW + ' kW', v: invKW * precioInv }
    ];
    if (baterias) items.push({ c: 'Baterías de litio', d: baterias + ' de ' + num(e.bateriaKWh, 2) + ' kWh', v: baterias * e.bateriaPrecio });
    var equipos = items.reduce(function (s, i) { return s + i.v; }, 0);
    items.push({ c: 'Estructura de soporte', d: 'Para ' + paneles + ' paneles', v: paneles * e.estructuraPanel });
    items.push({ c: 'Material eléctrico y protecciones', d: 'Cableado, breakers, DPS y puesta a tierra', v: equipos * e.materialPct / 100 });
    items.push({ c: 'Instalación y puesta en marcha', d: 'Mano de obra especializada', v: kwp * e.manoObraKWp + baterias * e.instalacionBateria });
    items.push({ c: 'Ingeniería y diseño', d: 'Dimensionamiento y diagramas', v: e.ingenieria });
    if (conRed) items.push({ c: 'Legalización ante el operador de red', d: 'Trámite y medidor', v: e.legalizacion });
    var total = items.reduce(function (s, i) { return s + i.v; }, 0);
    var generacion = kwp * p.hsp * p.pr * 30;
    var ahorro = conRed ? facturaHoy() : 0;
    return {
      consumo: c, paneles: paneles, kwp: kwp, invKW: invKW, baterias: baterias,
      batTotal: baterias * e.bateriaKWh, area: paneles * e.panelArea,
      generacion: generacion, ahorro: ahorro, items: items, total: total,
      retorno: ahorro > 0 ? total / (ahorro * 12) : null, conRed: conRed
    };
  }

  // ---------- Lista de electrodomésticos ----------
  function aplicarPreset() {
    S.qty = {};
    var pr = PRESETS[S.lugar] || {};
    Object.keys(pr).forEach(function (k) { S.qty[k] = pr[k]; });
  }
  function pintarEquipos() {
    var cont = document.getElementById('appl-rows');
    cont.innerHTML = DB.electrodomesticos.map(function (a) {
      var h = S.hrs[a.id] != null ? S.hrs[a.id] : a.h;
      var opciones = HORAS.indexOf(h) === -1 ? HORAS.concat([h]).sort(function (x, y) { return x - y; }) : HORAS;
      return '<div class="appl__row" data-id="' + a.id + '">' +
        '<span class="appl__name">' + a.nombre + '<small>' + num(a.w) + ' W</small></span>' +
        '<span class="stepper"><button type="button" data-menos aria-label="Quitar ' + a.nombre + '">−</button>' +
        '<output aria-live="polite">0</output>' +
        '<button type="button" data-mas aria-label="Agregar ' + a.nombre + '">+</button></span>' +
        '<select class="qselect" aria-label="Horas de uso al día de ' + a.nombre + '">' +
        opciones.map(function (o) { return '<option value="' + o + '"' + (o === h ? ' selected' : '') + '>' + horasTxt(o) + ' al día</option>'; }).join('') +
        '</select><span class="appl__kwh">0</span></div>';
    }).join('');
    actualizarFilas();
  }
  function actualizarFilas() {
    $$('.appl__row').forEach(function (row) {
      var a = DB.electrodomesticos.filter(function (x) { return x.id === row.dataset.id; })[0];
      var q = S.qty[a.id] || 0;
      var h = S.hrs[a.id] != null ? S.hrs[a.id] : a.h;
      row.querySelector('output').textContent = q;
      row.querySelector('[data-menos]').disabled = q === 0;
      row.querySelector('.appl__kwh').textContent = num(q * a.w * h * 30 / 1000, 1);
      row.classList.toggle('is-on', q > 0);
    });
  }

  // ---------- Pintar estado ----------
  function salida(clave, texto) { $$('[data-out="' + clave + '"]').forEach(function (el) { el.textContent = texto; }); }

  function pintar() {
    var conRed = S.red === 'si';
    if (!conRed) { S.modo = 'equipos'; S.sistema = 'baterias'; }

    // Pasos
    $$('.qpanel').forEach(function (p) { p.hidden = Number(p.dataset.step) !== S.paso; });
    $$('.qsteps button').forEach(function (b) {
      var n = Number(b.dataset.go);
      if (n === S.paso) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      if (n < S.paso) b.setAttribute('data-done', ''); else b.removeAttribute('data-done');
    });
    $('#atras').style.visibility = S.paso === 1 ? 'hidden' : 'visible';
    var sig = $('#siguiente');
    sig.hidden = S.paso === 5;
    sig.textContent = S.paso === 3 ? 'Ver mi cotización' : S.paso === 4 ? 'Agendar visita' : 'Continuar';
    $('#atras').textContent = S.paso === 4 ? 'Cambiar datos' : S.paso === 5 ? 'Volver a la cotización' : 'Atrás';

    // Paso 2
    root.querySelector('input[name="modo"][value="factura"]').disabled = !conRed;
    root.querySelector('input[name="modo"][value="' + S.modo + '"]').checked = true;
    $('[data-modo="factura"]').hidden = S.modo !== 'factura';
    $('[data-modo="equipos"]').hidden = S.modo !== 'equipos';

    // Paso 3
    var inRed = root.querySelector('input[name="sistema"][value="red"]');
    inRed.disabled = !conRed;
    root.querySelector('input[name="sistema"][value="' + S.sistema + '"]').checked = true;
    $('#nota-sin-red').hidden = conRed;
    $('#grupo-respaldo').hidden = S.sistema !== 'baterias' || !conRed;

    var c = consumo();
    var rRed = calcular('red'), rBat = calcular('baterias');
    salida('precio-red', conRed && rRed ? copCorto(rRed.total) : (conRed ? '—' : 'No aplica'));
    salida('precio-baterias', rBat ? copCorto(rBat.total) : '—');

    var r = S.sistema === 'red' ? rRed : rBat;
    var sisTxt = S.sistema === 'red' ? 'Sin baterías' : 'Con baterías';

    // Resumen
    salida('lugar', NOMBRES[S.lugar]);
    salida('consumo', c > 0 ? num(c) + ' kWh/mes' : '—');
    salida('sistema', sisTxt);
    salida('paneles', r ? r.paneles + ' de ' + DB.equipos.panelW + ' W' : '—');
    salida('valor', r && S.paso >= 2 ? copCorto(r.total) : '—');

    // Paso 4
    if (r) {
      var p = DB.parametros;
      salida('total', cop(r.total));
      salida('sistema-min', sisTxt.toLowerCase());
      salida('lead-resumen', 'Tu cotización: sistema ' + sisTxt.toLowerCase() + ' de ' + num(r.kwp, 2) + ' kWp por ' + cop(r.total) + ', para un tope de ' + num(r.consumo) + ' kWh al mes.');
      var opciones = [['red', 'Sin baterías', rRed], ['baterias', 'Con baterías', rBat]];
      $('#compare').innerHTML = opciones.map(function (o) {
        var activo = S.sistema === o[0];
        var disponible = o[0] === 'baterias' || conRed;
        return '<button type="button" role="radio" class="compare__opt" data-sis="' + o[0] + '" aria-checked="' + activo + '"' + (disponible ? '' : ' disabled') + '>' +
          '<span>' + o[1] + '</span><b>' + (disponible && o[2] ? cop(o[2].total) : 'Requiere red') + '</b>' +
          '<small>' + (o[0] === 'red' ? 'Respaldo de la red en la noche' : 'Energía guardada para la noche y los cortes') + '</small></button>';
      }).join('');
      var tope = r.consumo, limite = tope * (1 - p.margen / 100);
      if (conRed) {
        $('#bill').innerHTML = '<div><span>Tu factura hoy</span><b>' + cop(r.ahorro) + '</b></div>' +
          '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '<div class="bill__after"><span>Con tu sistema solar</span><b>$ 0</b></div>' +
          '<p class="bill__note">Si consumes hasta ' + num(limite) + ' kWh al mes.</p>';
      } else {
        $('#bill').innerHTML = '<div class="bill__after"><span>Energía propia</span><b>' + num(tope) + ' kWh al mes</b></div>';
      }
      $('#tope').innerHTML = '<div class="tope__nums"><div><span>Tope del sistema</span><b>' + num(tope) + ' kWh/mes</b></div>' +
        '<div><span>Consume máximo</span><b>' + num(limite) + ' kWh/mes</b></div>' +
        (conRed && S.sistema === 'red' ? '<div><span>Ahorro</span><b>95 % a 100 %</b></div>'.replace('95', num(p.ahorroSobreLimite)) : '') + '</div>' +
        '<p>' + (conRed
          ? (S.sistema === 'red'
            ? 'Tu sistema queda diseñado con un tope de ' + num(tope) + ' kWh al mes. Si consumes hasta ' + num(limite) + ' kWh, un ' + num(p.margen) + ' % menos que el tope, ahorras el 100 % y tu factura llega en $ 0. Si pasas de ' + num(limite) + ' kWh, el ahorro baja a cerca del ' + num(p.ahorroSobreLimite) + ' % y pagarías alrededor de ' + cop(r.ahorro * (1 - p.ahorroSobreLimite / 100)) + ' al mes.'
            : 'Tu sistema queda diseñado con un tope de ' + num(tope) + ' kWh al mes. Para que tu factura llegue en $ 0, tu consumo no debe pasar de ' + num(limite) + ' kWh al mes, un ' + num(p.margen) + ' % menos que el tope. Ese margen cubre los días nublados y el desgaste normal de los equipos.')
          : 'Tu sistema queda diseñado con un tope de ' + num(tope) + ' kWh al mes. Para no quedarte sin energía, tu consumo no debe pasar de ' + num(limite) + ' kWh al mes, un ' + num(p.margen) + ' % menos que el tope.') + '</p>';
      var gar = [
        ['Mantenimiento gratis', GARANTIAS.mantenimientoAnios + (GARANTIAS.mantenimientoAnios == 1 ? ' año' : ' años') + '; después, como máximo cada año'],
        ['Paneles', GARANTIAS.panelesAnios + ' años, ' + GARANTIAS.panelesRendimiento + ' % de rendimiento']
      ];
      if (r.baterias) gar.push(['Baterías', GARANTIAS.bateriasAnios + ' años, pérdida máxima del ' + GARANTIAS.bateriasPerdida + ' %']);
      $('#garantias-cot').innerHTML = '<h4>Garantías incluidas</h4><ul>' + gar.map(function (g) {
        return '<li><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg><span><b>' + g[0] + '</b>' + g[1] + '</span></li>';
      }).join('') + '</ul>';
      salida('rango', 'Entre ' + cop(r.total * (1 - p.rangoMenos / 100)) + ' y ' + cop(r.total * (1 + p.rangoMas / 100)) + ', según la visita técnica.');
      var resp = { esencial: 'respaldo para lo esencial', media: 'respaldo para la mitad del consumo', todo: 'respaldo para todo el consumo' };
      salida('resumen-sistema', NOMBRES[S.lugar] + ', sistema ' + sisTxt.toLowerCase() +
        (S.sistema === 'baterias' ? (conRed ? ', ' + resp[S.respaldo] : ', aislado de la red') : '') +
        ', para un consumo de ' + num(r.consumo) + ' kWh al mes.');
      var specs = [
        ['Potencia', num(r.kwp, 2) + ' kWp', ''],
        ['Paneles', r.paneles, 'de ' + DB.equipos.panelW + ' W'],
        ['Inversor', r.invKW + ' kW', S.sistema === 'red' ? 'De conexión a red' : 'Híbrido'],
        ['Área en techo', 'Unos ' + num(Math.ceil(r.area)) + ' m²', ''],
        ['Energía solar al mes', num(r.generacion) + ' kWh', 'Producción estimada'],
        r.conRed ? ['Dejas de pagar al mes', copCorto(r.ahorro), 'Tarifa de $\u00a0' + num(Math.round(tarifa())) + '/kWh'] : ['Energía propia', '100 %', 'Sin depender de la red'],
        r.retorno ? ['Recuperas la inversión', 'En ' + num(r.retorno, 1) + ' años', 'Vida útil de más de 25 años'] : ['Vida útil', 'Más de 25 años', 'En paneles solares'],
        r.baterias ? ['Baterías', num(r.batTotal, 1) + ' kWh', r.baterias + ' módulo' + (r.baterias > 1 ? 's' : '') + ' de litio'] : ['Baterías', 'No incluye', 'Puedes agregarlas después']
      ];
      $('#specs').innerHTML = specs.map(function (s) {
        return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + (s[2] ? '<small>' + s[2] + '</small>' : '') + '</dd></div>';
      }).join('');
      $('#desglose').innerHTML = r.items.map(function (i) {
        return '<tr><td>' + i.c + '<br><small>' + i.d + '</small></td><td>' + cop(i.v) + '</td></tr>';
      }).join('');
    }
    actualizarFilas();
    return r;
  }

  // ---------- Navegación ----------
  function irA(n) {
    if (n > 2 && consumo() <= 0) { n = 2; mostrarError(); }
    S.paso = n;
    pintar();
    var panel = root.querySelector('.qpanel[data-step="' + n + '"] h3');
    var card = document.getElementById('qcard');
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (panel) panel.focus({ preventScroll: true });
  }
  function mostrarError() {
    var err = document.getElementById('err2');
    err.textContent = S.modo === 'factura'
      ? 'Escribe tu consumo mensual en kWh para continuar.'
      : 'Agrega al menos un electrodoméstico para continuar.';
    err.hidden = false;
  }

  root.addEventListener('click', function (ev) {
    var t = ev.target.closest('button');
    if (!t) return;
    if (t.id === 'siguiente') { if (S.paso === 2 && consumo() <= 0) { mostrarError(); return; } irA(S.paso + 1); }
    else if (t.id === 'atras') irA(Math.max(1, S.paso - 1));
    else if (t.id === 'ubicar') ubicar();
    else if (t.dataset.go && t.hasAttribute('data-done')) irA(Number(t.dataset.go));
    else if (t.dataset.modoGo) { S.modo = t.dataset.modoGo; pintar(); }
    else if (t.id === 'enviar') enviar();
    else if (t.dataset.sis) { S.sistema = t.dataset.sis; pintar(); }
    else if (t.hasAttribute('data-mas') || t.hasAttribute('data-menos')) {
      var id = t.closest('.appl__row').dataset.id;
      S.qty[id] = Math.max(0, (S.qty[id] || 0) + (t.hasAttribute('data-mas') ? 1 : -1));
      S.tocado = true;
      document.getElementById('err2').hidden = true;
      pintar();
    }
  });

  function alCambiar(ev) {
    var t = ev.target;
    if (t.hasAttribute('data-dato')) { guardarDato(t); return; }
    if (t.classList.contains('qselect')) { S.hrs[t.closest('.appl__row').dataset.id] = parseFloat(t.value); S.tocado = true; }
    else if (t.name === 'lugar') { S.lugar = t.value; if (!S.tocado) aplicarPreset(); }
    else if (t.name === 'red') { S.red = t.value; if (t.value === 'si') { S.modo = 'factura'; S.sistema = 'red'; } }
    else if (t.name === 'modo') S.modo = t.value;
    else if (t.name === 'sistema') S.sistema = t.value;
    else if (t.name === 'respaldo') S.respaldo = t.value;
    else if (t.name === 'kwh') { S.kwh = t.value; document.getElementById('err2').hidden = true; }
    else if (t.name === 'valor') S.valor = t.value;
    else if (t.hasAttribute('data-dato')) { guardarDato(t); return; }
    else return;
    pintar();
  }
  root.addEventListener('input', alCambiar);
  root.addEventListener('change', alCambiar);
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.matches('input[type="number"]')) { ev.preventDefault(); $('#siguiente').click(); }
  });

  // ---------- Datos de contacto y ubicación ----------
  var MUNICIPIOS = {
    'Arauca': ['Arauca', 'Arauquita', 'Cravo Norte', 'Fortul', 'Puerto Rondón', 'Saravena', 'Tame'],
    'Casanare': ['Aguazul', 'Chámeza', 'Hato Corozal', 'La Salina', 'Maní', 'Monterrey', 'Nunchía', 'Orocué', 'Paz de Ariporo', 'Pore', 'Recetor', 'Sabanalarga', 'Sácama', 'San Luis de Palenque', 'Támara', 'Tauramena', 'Trinidad', 'Villanueva', 'Yopal']
  };
  var D = { nombre: '', celular: '', correo: '', horario: 'Cualquier hora', visita: '', departamento: 'Arauca', municipio: '', direccion: '', comentarios: '', autoriza: false, coords: null };

  function pintarMunicipios() {
    var lista = MUNICIPIOS[D.departamento] || [];
    document.getElementById('municipios').innerHTML = lista.map(function (m) { return '<option value="' + m + '">'; }).join('');
  }
  function guardarDato(t) {
    D[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.name === 'departamento') pintarMunicipios();
    var err = document.getElementById('err-' + t.name);
    if (err) err.hidden = true;
    t.removeAttribute('aria-invalid');
  }
  function celularLimpio() { return (D.celular || '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, ''); }
  function validar() {
    var errores = [];
    if (!D.nombre.trim()) errores.push('nombre');
    if (!/^3\d{9}$/.test(celularLimpio())) errores.push('celular');
    if (D.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(D.correo.trim())) errores.push('correo');
    if (!D.municipio.trim()) errores.push('municipio');
    if (!D.autoriza) errores.push('autoriza');
    ['nombre', 'celular', 'correo', 'municipio', 'autoriza'].forEach(function (k) {
      var err = document.getElementById('err-' + k), campo = root.querySelector('[name="' + k + '"]');
      var mal = errores.indexOf(k) !== -1;
      err.hidden = !mal;
      if (mal) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
    });
    if (errores.length) root.querySelector('[name="' + errores[0] + '"]').focus();
    return errores.length === 0;
  }
  function ubicar() {
    var msg = document.getElementById('geo-msg');
    if (!navigator.geolocation) { msg.textContent = 'Tu navegador no permite compartir la ubicación. Escribe la dirección o la vereda.'; return; }
    msg.textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      D.coords = { lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) };
      msg.innerHTML = 'Ubicación agregada. <a href="https://www.google.com/maps?q=' + D.coords.lat + ',' + D.coords.lng + '" target="_blank" rel="noopener">Ver en el mapa</a>';
      document.getElementById('ubicar').lastChild.textContent = ' Actualizar mi ubicación';
    }, function () {
      msg.textContent = 'No pudimos obtener tu ubicación. Revisa el permiso de ubicación del navegador o escribe la dirección o la vereda.';
    }, { enableHighAccuracy: true, timeout: 12000 });
  }

  function fechaMinima() {
    var d = new Date(); d.setDate(d.getDate() + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fechaTxt(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Guarda los datos en Google Sheets si hay una dirección configurada en js/config.js
  function guardar(datos) {
    var url = CONFIG.guardarEn;
    if (!url || !window.fetch) return false;
    try {
      fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) });
      return true;
    } catch (e) { return false; }
  }

  function enviar() {
    var r = S.sistema === 'red' ? calcular('red') : calcular('baterias');
    if (!r || !validar()) return;
    var cel = celularLimpio();
    var trampa = root.querySelector('[name="empresa"]');
    if (trampa && trampa.value) return; // Envío automático (spam)
    var lineas = [
      'Hola, soy ' + D.nombre.trim() + '. Hice mi cotización en la página de Solartech y quiero agendar la visita técnica.',
      '',
      'Mis datos',
      '- Celular: ' + cel.slice(0, 3) + ' ' + cel.slice(3, 6) + ' ' + cel.slice(6),
      D.correo.trim() ? '- Correo: ' + D.correo.trim() : null,
      '- Horario para llamar: ' + D.horario,
      D.visita ? '- Fecha preferida para la visita: ' + fechaTxt(D.visita) : null,
      '',
      'Lugar de la instalación',
      '- ' + D.municipio.trim() + ', ' + D.departamento,
      D.direccion.trim() ? '- Dirección: ' + D.direccion.trim() : null,
      D.coords ? '- Ubicación: https://www.google.com/maps?q=' + D.coords.lat + ',' + D.coords.lng : null,
      '- Tipo de lugar: ' + NOMBRES[S.lugar] + (S.red === 'si' ? ', con red eléctrica' : ', sin red eléctrica'),
      '',
      'Mi cotización',
      '- Consumo: ' + num(r.consumo) + ' kWh/mes' + (S.modo === 'factura' && parseFloat(S.valor) > 0 ? ', factura de ' + cop(parseFloat(S.valor)) : ''),
      '- Sistema: ' + (S.sistema === 'red' ? 'sin baterías' : 'con baterías'),
      '- Potencia: ' + num(r.kwp, 2) + ' kWp (' + r.paneles + ' paneles de ' + DB.equipos.panelW + ' W), inversor de ' + r.invKW + ' kW',
      r.baterias ? '- Baterías: ' + num(r.batTotal, 1) + ' kWh' : null,
      '- Valor estimado: ' + cop(r.total),
      '- Tope: ' + num(r.consumo) + ' kWh/mes, consumo máximo recomendado: ' + num(r.consumo * (1 - DB.parametros.margen / 100)) + ' kWh/mes',
      D.comentarios.trim() ? '' : null,
      D.comentarios.trim() ? 'Comentarios: ' + D.comentarios.trim() : null
    ].filter(function (l) { return l !== null; });
    var url = WHATSAPP ? 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lineas.join('\n')) : '';
    if (url) window.open(url, '_blank', 'noopener');
    var guardado = guardar({
      nombre: D.nombre.trim(), celular: cel, correo: D.correo.trim(), horario: D.horario,
      visita: D.visita, departamento: D.departamento, municipio: D.municipio.trim(), direccion: D.direccion.trim(),
      ubicacion: D.coords ? 'https://www.google.com/maps?q=' + D.coords.lat + ',' + D.coords.lng : '',
      lugar: NOMBRES[S.lugar], red: S.red === 'si' ? 'Sí' : 'No',
      consumo: Math.round(r.consumo), factura: S.modo === 'factura' ? (parseFloat(S.valor) || '') : '',
      sistema: S.sistema === 'red' ? 'Sin baterías' : 'Con baterías', kwp: Number(r.kwp.toFixed(2)), paneles: r.paneles,
      inversor: r.invKW, baterias: r.baterias ? Number(r.batTotal.toFixed(2)) : 0, valor: Math.round(r.total),
      tope: Math.round(r.consumo), consumoMaximo: Math.round(r.consumo * (1 - DB.parametros.margen / 100)),
      comentarios: D.comentarios.trim(), pagina: location.href.split('#')[0]
    });
    var ok = document.getElementById('lead-ok');
    if (url) {
      ok.innerHTML = (guardado ? 'Listo, guardamos tus datos y abrimos WhatsApp con tu cotización.' : 'Listo, abrimos WhatsApp con tus datos y tu cotización.') +
        ' Solo falta que toques enviar en el chat. Si no se abrió, <a href="' + url + '" target="_blank" rel="noopener">ábrelo aquí</a>.';
    } else {
      ok.textContent = guardado
        ? 'Listo, guardamos tus datos. El ingeniero te contactará para agendar la visita técnica.'
        : 'Por ahora no pudimos enviar tus datos. Intenta de nuevo más tarde.';
    }
    ok.hidden = false;
  }
  pintarMunicipios();
  var campoVisita = root.querySelector('[name="visita"]');
  if (campoVisita) campoVisita.min = fechaMinima();

  // ---------- Base de datos (administrador) ----------
  var ETIQUETAS = {
    parametros: {
      tarifa: 'Tarifa del kWh (COP)', hsp: 'Horas solares pico al día', pr: 'Rendimiento del sistema (0 a 1)',
      rangoMenos: 'Rango inferior (%)', rangoMas: 'Rango superior (%)', margen: 'Margen bajo el tope de consumo (%)', ahorroSobreLimite: 'Ahorro si pasa el límite (%)'
    },
    equipos: {
      panelW: 'Potencia del panel (W)', panelPrecio: 'Precio por panel (COP)', panelArea: 'Área por panel (m²)',
      inversorRedKW: 'Inversor de red, precio por kW', inversorHibridoKW: 'Inversor híbrido, precio por kW',
      bateriaKWh: 'Capacidad por batería (kWh)', bateriaPrecio: 'Precio por batería (COP)', bateriaDoD: 'Profundidad de descarga (%)',
      estructuraPanel: 'Estructura por panel (COP)', materialPct: 'Material eléctrico (% de equipos)',
      manoObraKWp: 'Instalación por kWp (COP)', instalacionBateria: 'Instalación por batería (COP)',
      ingenieria: 'Ingeniería y diseño (COP)', legalizacion: 'Legalización con la red (COP)'
    }
  };
  var dlg = document.getElementById('admin');
  function campo(grupo, k, etiqueta, valor) {
    return '<label>' + etiqueta + '<input type="number" step="any" min="0" data-g="' + grupo + '" data-k="' + k + '" value="' + valor + '"></label>';
  }
  function pintarAdmin() {
    var html = '<section><h3>Parámetros de cálculo</h3><div class="admin__grid">' +
      Object.keys(ETIQUETAS.parametros).map(function (k) { return campo('parametros', k, ETIQUETAS.parametros[k], DB.parametros[k]); }).join('') +
      '</div></section><section><h3>Precios de equipos e instalación</h3><div class="admin__grid">' +
      Object.keys(ETIQUETAS.equipos).map(function (k) { return campo('equipos', k, ETIQUETAS.equipos[k], DB.equipos[k]); }).join('') +
      '</div></section><section><h3>Potencia de electrodomésticos (W)</h3><div class="admin__grid">' +
      DB.electrodomesticos.map(function (a) { return campo('electro', a.id, a.nombre, a.w); }).join('') +
      '</div></section>';
    document.getElementById('admin-body').innerHTML = html;
    document.getElementById('admin-msg').textContent = '';
  }
  document.querySelectorAll('[data-admin]').forEach(function (b) {
    b.addEventListener('click', function () { pintarAdmin(); if (dlg.showModal) dlg.showModal(); });
  });
  document.getElementById('admin-cerrar').addEventListener('click', function () { dlg.close(); });
  document.getElementById('admin-guardar').addEventListener('click', function () {
    var electro = {};
    dlg.querySelectorAll('input[data-g]').forEach(function (i) {
      var v = parseFloat(i.value);
      if (isNaN(v) || v < 0) return;
      if (i.dataset.g === 'electro') {
        DB.electrodomesticos.forEach(function (a) { if (a.id === i.dataset.k) a.w = v; });
      } else DB[i.dataset.g][i.dataset.k] = v;
    });
    DB.electrodomesticos.forEach(function (a) { electro[a.id] = { w: a.w, h: a.h }; });
    try { localStorage.setItem(CLAVE, JSON.stringify({ parametros: DB.parametros, equipos: DB.equipos, electrodomesticos: electro })); } catch (e) {}
    pintarEquipos(); pintar();
    document.getElementById('admin-msg').textContent = 'Cambios guardados. El cotizador ya usa los nuevos valores.';
  });
  document.getElementById('admin-reset').addEventListener('click', function () {
    try { localStorage.removeItem(CLAVE); } catch (e) {}
    DB = clonar(DB_DEFAULT);
    pintarAdmin(); pintarEquipos(); pintar();
    document.getElementById('admin-msg').textContent = 'Valores restablecidos.';
  });

  // Oculta el botón flotante de WhatsApp mientras se usa el cotizador
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      document.body.classList.toggle('en-cotizador', en[0].isIntersecting);
    }, { rootMargin: '-20% 0px -20% 0px' }).observe(root);
  }

  // ---------- Inicio ----------
  aplicarPreset();
  pintarEquipos();
  pintar();
})();
