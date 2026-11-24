/* Learnify Digital: line and glass effects, policy tabs, menu and old links. */
(function () {
  'use strict';
  class Effects {
  rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  // Topographic contour lines: warped rings that drift, lean toward the pointer,
  // and bulge away from the cursor while it is over the section.
  topo(canvas, seed, ox, oy) {
    var ctx = canvas.getContext('2d');
    var rand = this.rng(seed);
    var waves = [];
    for (var i = 0; i < 5; i++) {
      waves.push({ amp: 0.03 + rand() * 0.07, freq: 2 + Math.floor(rand() * 5), phase: rand() * Math.PI * 2, drift: (rand() - 0.5) * 0.9 });
    }
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var px = 0.5, py = 0.5, tx = 0.5, ty = 0.5, raf = 0, visible = true;
    var mx = -9999, my = -9999, hover = 0, hoverT = 0, clock = 0, last = 0;
    var reduced = this.reduced();
    function size() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = getComputedStyle(canvas).color;
      var cx = W * ox, cy = H * oy;
      var maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.15;
      var gap = 34, rings = Math.ceil(maxR / gap), steps = 180;
      var shiftX = (px - 0.5) * W * 0.12, shiftY = (py - 0.5) * H * 0.12;
      var R = 170, push = 52 * hover, inv = 1 / (2 * R * R);
      for (var k = 1; k <= rings; k++) {
        var depth = 1 - k / rings, rcx = cx + shiftX * depth, rcy = cy + shiftY * depth, rad = gap * k;
        ctx.beginPath();
        for (var j = 0; j <= steps; j++) {
          var a = j / steps * Math.PI * 2, m = 1;
          for (var w = 0; w < waves.length; w++) { var wv = waves[w]; m += wv.amp * Math.sin(wv.freq * a + wv.phase + t * wv.drift); }
          var x = rcx + Math.cos(a) * rad * m * 1.12, y = rcy + Math.sin(a) * rad * m * 0.9;
          if (push > 0.5) {
            var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
            if (d2 < 9 * R * R) {
              var d = Math.sqrt(d2) || 1, f = push * Math.exp(-d2 * inv);
              x += dx / d * f; y += dy / d * f;
            }
          }
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
    function loop(ms) {
      var dt = last ? Math.min(0.05, (ms - last) / 1000) : 0; last = ms;
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      hover += (hoverT - hover) * 0.08;
      clock += dt * (0.12 + hover * 0.35);
      draw(clock);
      raf = visible ? requestAnimationFrame(loop) : 0;
    }
    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      var lx = e.clientX - r.left, ly = e.clientY - r.top;
      var inside = lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height;
      hoverT = inside ? 1 : 0;
      if (inside) { mx = lx; my = ly; }
      tx = Math.min(1, Math.max(0, lx / Math.max(1, r.width)));
      ty = Math.min(1, Math.max(0, ly / Math.max(1, r.height)));
    }
    function onLeave() { hoverT = 0; }
    size();
    var ro = new ResizeObserver(function () { size(); if (reduced) draw(0); });
    ro.observe(canvas);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf && !reduced) { last = 0; raf = requestAnimationFrame(loop); } });
    io.observe(canvas);
    if (reduced) { draw(0); } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(loop);
    }
    return function () { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }
  // Fluted glass over a photo: vertical flutes that magnify and slide with the pointer.
  // mode: 'ramp' (stronger to the right), 'edge' (left edge only, keeps faces clean), 'even'.
  glass(canvas, src, mode, fx, fy) {
    var ctx = canvas.getContext('2d');
    var buf = document.createElement('canvas'), bctx = buf.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var img = null, raf = 0, visible = true, mxp = 0.5, tmx = 0.5, hov = 0, hovT = 0;
    var reduced = this.reduced();
    function paint() {
      buf.width = Math.round(W); buf.height = Math.round(H);
      bctx.fillStyle = '#0F2547'; bctx.fillRect(0, 0, W, H);
      if (!img) return;
      var s = Math.max(W / img.width, H / img.height), dw = img.width * s, dh = img.height * s;
      bctx.drawImage(img, (W - dw) * fx, (H - dh) * fy, dw, dh);
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }
    function strengthAt(x) {
      if (mode === 'edge') return Math.max(0, 0.75 - (x / W) * 2.2);
      if (mode === 'even') return 0.55;
      return Math.min(0.85, 0.2 + x / W);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var flute = 26, col = 2;
      var shift = (mxp - 0.5) * (40 + 30 * hov) + Math.sin(t * 0.6) * 4;
      for (var x0 = 0; x0 < W; x0 += flute) {
        var st = strengthAt(x0);
        for (var c = 0; c < flute; c += col) {
          var u = c / flute - 0.5;
          var sx = x0 + flute / 2 + u * flute * (1 - 0.9 * st) + shift * st * (0.4 + u);
          sx = Math.min(Math.max(sx, 0), W - col);
          ctx.drawImage(buf, sx, 0, col, H, x0 + c, 0, col, H);
        }
        if (st > 0.01) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.10 * st).toFixed(3) + ')'; ctx.fillRect(x0, 0, 2, H);
          ctx.fillStyle = 'rgba(10,26,51,' + (0.22 * st).toFixed(3) + ')'; ctx.fillRect(x0 + flute - 3, 0, 3, H);
        }
      }
    }
    function loop(ms) { mxp += (tmx - mxp) * 0.06; hov += (hovT - hov) * 0.08; draw(ms / 1000); raf = visible ? requestAnimationFrame(loop) : 0; }
    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      var lx = e.clientX - r.left, ly = e.clientY - r.top;
      hovT = (lx >= 0 && ly >= 0 && lx <= r.width && ly <= r.height) ? 1 : 0;
      tmx = Math.min(1, Math.max(0, lx / Math.max(1, r.width)));
    }
    size();
    var im = new Image();
    im.onload = function () { img = im; paint(); if (reduced) draw(0); };
    im.src = src;
    var ro = new ResizeObserver(function () { size(); if (reduced) draw(0); });
    ro.observe(canvas);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !raf && !reduced) raf = requestAnimationFrame(loop); });
    io.observe(canvas);
    if (reduced) { draw(0); } else { window.addEventListener('pointermove', onMove, { passive: true }); raf = requestAnimationFrame(loop); }
    return function () { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); };
  }
  }
  var fx = new Effects();

  function initEffects() {
    document.querySelectorAll('canvas[data-topo]').forEach(function (c) {
      var a = c.getAttribute('data-topo').split(',');
      fx.topo(c, +a[0], +a[1], +a[2]);
    });
    document.querySelectorAll('canvas[data-glass]').forEach(function (c) {
      var a = c.getAttribute('data-glass').split('|');
      fx.glass(c, a[0], a[1], +a[2], +a[3]);
    });
  }

  var TAB_ON = 'min-height: 44px; padding: 0 20px; border: 0; border-radius: 999px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; background: #0A1A33; color: #FFFFFF';
  var TAB_OFF = 'min-height: 44px; padding: 0 20px; border: 0; border-radius: 999px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; background: transparent; color: #2E4566';
  var HASH_TAB = { '#privacidad': 'priv', '#terminos': 'term', '#reembolsos': 'reem', '#resultados': 'resu' };
  function initTabs() {
    var tabs = document.querySelectorAll('[data-tab]');
    if (!tabs.length) return;
    function show(k) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tab') === k;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('style', on ? TAB_ON : TAB_OFF);
        var p = document.getElementById('panel-' + t.getAttribute('data-tab'));
        if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-tab')); }); });
    var q = new URLSearchParams(location.search).get('tab') || HASH_TAB[location.hash];
    if (q && document.getElementById('panel-' + q)) show(q);
  }

  function initMenu() {
    var menus = document.querySelectorAll('details.menu');
    document.addEventListener('click', function (e) {
      menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') menus.forEach(function (m) { m.open = false; });
    });
  }

  // Links from the previous version of the site
  var LEGACY = { '#privacy': '/politicas.html?tab=priv', '#terminos': '/politicas.html?tab=term', '#reembolso': '/politicas.html?tab=reem',
                 '#about': '/nosotros.html', '#work': '#servicios', '#contact': '#contacto' };
  function goLegacy() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    var dest = LEGACY[location.hash];
    if (!dest) return;
    if (dest.charAt(0) === '/') location.replace(dest); else location.hash = dest;
  }

  goLegacy();
  window.addEventListener('hashchange', goLegacy);
  function start() { initEffects(); initTabs(); initMenu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
