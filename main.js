// Solartech — menú en celular y año del pie de página
(function () {
  var btn = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  if (btn && menu) {
    btn.addEventListener('click', function () {
      setOpen(!menu.classList.contains('is-open'));
    });
    // Cierra el menú al elegir una sección
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    // Cierra con la tecla Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

// Solartech — pestañas de antes y después
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.casos__tabs [role="tab"]'));
  function activar(t) {
    tabs.forEach(function (b) {
      var on = b === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { activar(b); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      activar(n); n.focus();
    });
  });
})();

// Solartech — enlaces de WhatsApp y garantías desde js/config.js
(function () {
  var config = window.SOLARTECH || {};
  var numero = (config.whatsapp || '').replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    if (!numero) return;
    a.href = 'https://wa.me/' + numero + '?text=' + a.getAttribute('data-wa');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  var g = config.garantias || {};
  document.querySelectorAll('[data-garantia]').forEach(function (el) {
    var v = g[el.getAttribute('data-garantia')];
    if (v != null) el.textContent = v;
  });
})();
