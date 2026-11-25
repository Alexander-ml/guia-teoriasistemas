/* Guía de estudio · Dinámica de Sistemas (Semanas 13–16) */
(function () {
  'use strict';
  var P = 'guia-dinamica-sistemas:';
  function get(k, d) { try { var v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var root = document.documentElement;
  var BAR = 58;

  /* ---------- Datos de unidades y temas ---------- */
  var weeks = $$('.week').map(function (w, i) {
    var num = w.dataset.unit || '';
    var topics = $$('.topic', w).map(function (t, j) {
      var h = $('h3', t);
      var title = h ? h.textContent.replace(/^\s*\d+\s*/, '').trim() : t.id;
      return { el: t, id: t.id, title: title, idx: j + 1 };
    });
    return { el: w, id: w.id, num: num, cls: (w.className.match(/wk-[\w]+/) || ['wk-rep'])[0], label: w.dataset.label || w.id, topics: topics };
  });
  var allTopics = [];
  weeks.forEach(function (w) { w.topics.forEach(function (t) { t.week = w; allTopics.push(t); }); });

  /* ---------- Preferencias: tema y tamaño ---------- */
  var themeBtn = $('#btn-theme');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      var use = $('use', themeBtn); if (use) use.setAttribute('href', t === 'dark' ? '#i-sun' : '#i-moon');
    }
  }
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); set('theme', t);
  });

  var SCALES = [90, 100, 112, 125];
  var typeBtn = $('#btn-type'), typePop = $('#type-pop'), typeOut = $('#type-out');
  function applyScale(s) {
    root.style.setProperty('--scale', s / 100);
    if (typeOut) typeOut.textContent = s + '%';
    set('scale', s);
  }
  var curScale = get('scale', 100); if (SCALES.indexOf(curScale) < 0) curScale = 100;
  applyScale(curScale);
  if (typeBtn) typeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = typePop.hidden; typePop.hidden = !open; typeBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    if (typePop && !typePop.hidden && !typePop.contains(e.target) && e.target !== typeBtn) { typePop.hidden = true; typeBtn.setAttribute('aria-expanded', 'false'); }
  });
  $$('[data-scale-step]').forEach(function (b) {
    b.addEventListener('click', function () {
      var step = b.getAttribute('data-scale-step');
      var i = SCALES.indexOf(curScale);
      if (step === 'reset') i = 1; else i = Math.max(0, Math.min(SCALES.length - 1, i + (step === 'up' ? 1 : -1)));
      curScale = SCALES[i]; applyScale(curScale);
    });
  });

  /* ---------- Vista: todo / una unidad ---------- */
  function currentView() { var r = $('.view-radio:checked'); return r ? r.value : 'all'; }
  function viewOfWeek(wid) { return wid === 'repaso' ? 'rep' : wid; }
  function setView(v, keepScroll) {
    var r = $('#view-' + v); if (r) r.checked = true;
    set('view', v);
    $$('.focus-btn').forEach(function (b) {
      var mine = b.getAttribute('data-view');
      var on = v === mine;
      b.textContent = on ? 'Ver todas las unidades' : 'Estudiar solo esta unidad';
      b.setAttribute('aria-pressed', String(on));
    });
    if (!keepScroll) window.scrollTo(0, 0);
    requestAnimationFrame(spy);
  }
  $$('.view-radio').forEach(function (r) {
    r.addEventListener('change', function () {
      var prevAnchor = (currentTopic && currentTopic.el) || (currentWeek && currentWeek.el);
      if (r.value === 'all' && prevAnchor) {
        setView('all', true);
        requestAnimationFrame(function () { scrollToEl(prevAnchor, false); });
      } else {
        setView(r.value);
      }
      closeToc();
    });
  });
  $$('.focus-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      if (currentView() === v) { var wid = b.closest('.week').id; setView('all', true); requestAnimationFrame(function () { jumpTo($('#' + wid), false); }); }
      else { setView(v, true); requestAnimationFrame(function () { jumpTo(b.closest('.week'), false); }); }
    });
  });
  // Arrancar siempre mostrando "La ruta de estudio" (la barra "Retomar" restaura el modo previo si el lector lo elige)
  setView('all', true);

  /* ---------- Saltos exactos + pila de regreso ---------- */
  var stack = [];
  var pill = $('#back-pill');
  var pillGo = $('#back-pill-go');
  var pillX = $('#back-pill-x');
  function weekOf(el) { return el ? el.closest('.week') : null; }
  function isHidden(el) { return !el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed'; }
  function scrollToEl(el, smooth) {
    var y = el.getBoundingClientRect().top + window.pageYOffset - BAR - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }
  function pulse(el) { el.classList.remove('is-jump-target'); void el.offsetWidth; el.classList.add('is-jump-target'); setTimeout(function () { el.classList.remove('is-jump-target'); }, 1500); }
  function jumpTo(el, doPulse) {
    if (!el) return;
    var w = weekOf(el);
    var v = currentView();
    if (w && v !== 'all' && viewOfWeek(w.id) !== v) { setView(viewOfWeek(w.id), true); }
    if (!w && v !== 'all' && el.id !== 'inicio') setView('all', true);
    if (el.id === 'inicio' && v !== 'all') setView('all', true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        scrollToEl(el, true);
        if (doPulse) pulse(el);
      });
    });
  }
  function originInfo() {
    var t = currentTopic || null;
    if (t) return { label: t.week.label + ' · ' + t.idx + '. ' + t.title, cls: t.week.cls, id: t.id };
    var w = currentWeek;
    if (w) return { label: w.label, cls: w.cls, id: w.id };
    return { label: 'Inicio', cls: 'wk-rep', id: 'inicio' };
  }
  function showPill() {
    if (!pill || !pillGo) return;
    if (!stack.length) { pill.hidden = true; return; }
    var top = stack[stack.length - 1];
    pill.className = 'back-pill ' + top.wkClass;
    pillGo.textContent = '↩ Volver a ' + top.label;
    pill.hidden = false;
  }
  if (pillGo) pillGo.addEventListener('click', function () {
    var s = stack.pop(); if (!s) return;
    setView(s.viewId, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.scrollTo({ top: s.scrollY, behavior: !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
        if (s.originId) { var oe = document.getElementById(s.originId); if (oe) pulse(oe); }
      });
    });
    showPill();
  });
  if (pillX) pillX.addEventListener('click', function () {
    stack = [];
    showPill();
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var isXref = a.classList.contains('xref');
    var canPush = a.matches('.xref, .toc a, .week-map a, .route a, .loc-link') && window.pageYOffset > 150;
    if (canPush) {
      var minDelta = isXref ? 140 : 260;
      var sameView = currentView() === 'all' || (weekOf(target) && viewOfWeek(weekOf(target).id) === currentView());
      var dist = isHidden(target) ? Infinity : Math.abs((target.getBoundingClientRect().top + window.pageYOffset - BAR - 12) - window.pageYOffset);
      if (!sameView || dist >= minDelta) {
        var o = originInfo();
        stack.push({ scrollY: window.pageYOffset, viewId: currentView(), label: o.label, wkClass: o.cls, originId: o.id });
        if (stack.length > 20) stack.shift();
      }
    }
    closeToc();
    var nextAuto = a.classList.contains('next');
    if (nextAuto && currentView() !== 'all') {
      var w = weekOf(target) || target;
      setView(viewOfWeek(w.id), true);
    }
    jumpTo(target, !a.matches('.route a, .tile'));
    showPill();
  });

  /* ---------- Índice móvil (cajón) ---------- */
  var tocEl = $('#toc');
  function openToc() { document.body.classList.add('toc-open'); var c = $('.toc a.is-current'); if (c) c.scrollIntoView({ block: 'center' }); var x = $('#toc-close'); if (x) x.focus(); }
  function closeToc() { document.body.classList.remove('toc-open'); }
  $$('.toc-btn, .loc-chip').forEach(function (b) { b.addEventListener('click', openToc); });
  var bd = $('.toc-backdrop'); if (bd) bd.addEventListener('click', closeToc);
  var tc = $('#toc-close'); if (tc) tc.addEventListener('click', closeToc);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeToc(); if (typePop) typePop.hidden = true; } });

  /* ---------- Temas leídos ---------- */
  var read = get('read', {});
  allTopics.forEach(function (t) {
    var foot = document.createElement('div'); foot.className = 'topic-foot';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost mark';
    var up = document.createElement('a'); up.href = '#' + t.week.id + '-map'; up.textContent = '↑ Mapa de la unidad'; up.className = 'loc-link';
    foot.appendChild(b); foot.appendChild(up); t.el.appendChild(foot);
    t.btn = b;
    b.addEventListener('click', function () { read[t.id] = !read[t.id]; if (!read[t.id]) delete read[t.id]; set('read', read); renderRead(); });
  });
  function renderRead() {
    var total = 0, done = 0;
    weeks.forEach(function (w) {
      if (!w.topics.length) return;
      var d = 0;
      w.topics.forEach(function (t) {
        var r = !!read[t.id]; if (r) d++;
        t.btn.setAttribute('aria-pressed', String(r));
        t.btn.textContent = r ? '✓ Tema leído' : 'Marcar tema leído';
        $$('a[href="#' + t.id + '"]').forEach(function (a) { if (a.closest('.toc, .week-map')) a.classList.toggle('is-read', r); });
      });
      total += w.topics.length; done += d;
      var pct = Math.round(d / w.topics.length * 100);
      var tile = $('.tile[href="#' + w.id + '"]');
      if (tile) { $('.tp span', tile).style.width = pct + '%'; $('.tpl', tile).textContent = d + ' de ' + w.topics.length + ' temas leídos'; }
      var st = $('#' + w.id + ' .week-steps .bar span'); if (st) st.style.width = pct + '%';
      var sl = $('#' + w.id + ' .week-steps .rd'); if (sl) sl.textContent = d + '/' + w.topics.length + ' temas leídos';
    });
    var cs = $('#cover-sum'); if (cs) cs.innerHTML = '<b>' + done + ' de ' + total + '</b> temas leídos · tu avance se guarda en este navegador.';
  }
  renderRead();

  /* ---------- Checklists ---------- */
  var checks = get('checks', {});
  $$('.checklist input[type=checkbox]').forEach(function (c) {
    var k = c.getAttribute('data-key'); c.checked = !!checks[k];
    c.addEventListener('change', function () { if (c.checked) checks[k] = 1; else delete checks[k]; set('checks', checks); });
  });

  /* ---------- Repaso ---------- */
  var seen = get('seen', {});
  var cards = $$('.card-q');
  var repBar = $('#rep-bar');
  function renderSeen() {
    var n = 0; cards.forEach(function (c) { var s = !!seen[c.id]; c.classList.toggle('seen', s); if (s) n++; });
    var cnt = $('.count', repBar); if (cnt) cnt.textContent = n + ' de ' + cards.length + ' preguntas revisadas';
  }
  if (repBar) {
    repBar.innerHTML = '<span class="count"></span><button type="button" class="btn" id="rep-toggle">Abrir todas</button><button type="button" class="btn ghost" id="rep-reset">Reiniciar</button>';
    var tg = $('#rep-toggle');
    tg.addEventListener('click', function () {
      var anyClosed = cards.some(function (c) { return !c.open; });
      cards.forEach(function (c) { c.open = anyClosed; });
      tg.textContent = anyClosed ? 'Ocultar todas' : 'Abrir todas';
    });
    $('#rep-reset').addEventListener('click', function () { seen = {}; set('seen', seen); renderSeen(); });
  }
  cards.forEach(function (c) { c.addEventListener('toggle', function () { if (c.open) { seen[c.id] = 1; set('seen', seen); renderSeen(); } }); });
  renderSeen();
  var printOpen = [];
  window.addEventListener('beforeprint', function () { printOpen = cards.map(function (c) { return c.open; }); cards.forEach(function (c) { c.open = true; }); });
  window.addEventListener('afterprint', function () { cards.forEach(function (c, i) { c.open = printOpen[i]; }); });

  /* ---------- SVG: scroll horizontal + Ampliar ---------- */
  var modal = $('#svg-modal');
  $$('figure.fig').forEach(function (f) {
    var svg = $('svg[role="img"]', f);
    if (!svg) return;
    var vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (vb[2] >= 500 && !svg.parentElement.classList.contains('svg-scroll')) {
      var wrap = document.createElement('div'); wrap.className = 'svg-scroll';
      if (vb[2] >= 680) wrap.setAttribute('data-wide', '1');
      svg.parentNode.insertBefore(wrap, svg); wrap.appendChild(svg);
    }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'zoom-btn';
    b.innerHTML = '<svg class="ico" aria-hidden="true" style="width:15px;height:15px"><use href="#i-expand"></use></svg>Ampliar';
    var caption = $('figcaption', f);
    if (caption) {
      var how = $('.how', caption);
      if (how) caption.insertBefore(b, how);
      else caption.appendChild(b);
    } else {
      f.appendChild(b);
    }
    b.addEventListener('click', function () {
      if (!modal || typeof modal.showModal !== 'function') return;
      var w = weekOf(f); modal.className = 'svg-modal ' + (w ? (w.className.match(/wk-[\w]+/) || [''])[0] : '');
      var cap = $('figcaption .fnum', f), tit = $('figcaption .ftitle', f);
      $('#svg-modal-title').textContent = (cap ? cap.textContent + ' ' : '') + (tit ? tit.textContent : '');
      var body = $('#svg-modal-body'); body.innerHTML = '';
      var clone = svg.cloneNode(true);
      if (vb[2] >= 640) clone.classList.add('is-wide');
      body.appendChild(clone);
      modal.showModal();
    });
  });
  if (modal) {
    $('#svg-modal-close').addEventListener('click', function () { modal.close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
  }

  /* ---------- Scroll-spy, progreso y memoria ---------- */
  var bar = $('.read-progress span');
  var chip = $('.loc-chip');
  var topbar = $('.topbar');
  var currentTopic = null, currentWeek = null;
  var ticking = false;
  function spy() {
    ticking = false;
    var y = BAR + 90;
    var cw = null;
    weeks.forEach(function (w) { if (!isHidden(w.el) && w.el.getBoundingClientRect().top <= y) cw = w; });
    var ct = null;
    if (cw) cw.topics.forEach(function (t) { if (t.el.getBoundingClientRect().top <= y) ct = t; });
    currentWeek = cw; currentTopic = ct;
    var cls = cw ? cw.cls : 'wk-rep';
    topbar.className = 'topbar ' + cls;
    // progreso: dentro de la unidad visible o de toda la página
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.min(100, Math.max(0, window.pageYOffset / h * 100)) : 0;
    if (bar) bar.style.width = pct + '%';
    $$('.route a').forEach(function (a) { a.classList.toggle('is-active', !!cw && a.getAttribute('href') === '#' + cw.id); });
    $$('.toc a.is-current').forEach(function (a) { a.classList.remove('is-current'); });
    if (ct) { var ta = $('.toc a[href="#' + ct.id + '"]'); if (ta) ta.classList.add('is-current'); }
    else if (cw) { var tw = $('.toc a[href="#' + cw.id + '"]'); if (tw) tw.classList.add('is-current'); }
    if (chip) {
      chip.className = 'loc-chip ' + cls;
      if (ct) chip.innerHTML = '<span><b>[' + cw.num + ']</b> ' + ct.idx + '/' + cw.topics.length + ' · ' + escapeHtml(ct.title) + '</span>';
      else if (cw) chip.innerHTML = '<span><b>[' + cw.num + ']</b> ' + escapeHtml(cw.label) + '</span>';
      else chip.innerHTML = '<span>La ruta de estudio</span>';
    }
    if (ct || cw) set('last', { id: (ct || cw).id, label: ct ? (cw.label + ' · ' + ct.idx + '. ' + ct.title) : cw.label, view: currentView() });
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(spy); });

  /* ---------- Retomar lectura ---------- */
  var last = get('last', null);
  var rb = $('#resume-bar');
  if (rb && last && last.id && document.getElementById(last.id) && !location.hash) {
    $('#resume-label').textContent = last.label;
    rb.hidden = false;
    $('#resume-go').addEventListener('click', function () {
      rb.hidden = true;
      if (last.view) setView(last.view, true);
      jumpTo(document.getElementById(last.id), true);
    });
    $('#resume-x').addEventListener('click', function () { rb.hidden = true; });
  }
  if (location.hash) { var h0 = document.getElementById(location.hash.slice(1)); if (h0) setTimeout(function () { jumpTo(h0, false); }, 60); }
  spy();
})();
