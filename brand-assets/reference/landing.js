/* ============================================================
   GameKit UI — landing interactions 👾
   ============================================================ */
(function () {
  'use strict';

  /* ---------- pixel invader bitmaps (11x8 classic crab) ---------- */
  var INV_A = [
    "00100000100",
    "00010001000",
    "00111111100",
    "01101110110",
    "11111111111",
    "10111111101",
    "10100000101",
    "00011011000"
  ];
  var INV_B = [
    "00100000100",
    "10010001001",
    "10111111101",
    "11101110111",
    "11111111111",
    "01111111110",
    "00100000100",
    "01000000010"
  ];

  function buildInvader(el, frame) {
    var rows = frame === 'b' ? INV_B : INV_A;
    el.innerHTML = '';
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        var cell = document.createElement('i');
        if (rows[r][c] === '1') cell.className = 'on';
        el.appendChild(cell);
      }
    }
  }

  // animated two-frame invader: stacks two grids, alternates opacity
  function mountInvader(el) {
    el.classList.add('invader-anim');
    var a = el.querySelector('[data-f="a"]');
    var b = el.querySelector('[data-f="b"]');
    if (!a || !b) return;
    buildInvader(a, 'a');
    buildInvader(b, 'b');
  }

  document.querySelectorAll('.invader-anim').forEach(mountInvader);
  document.querySelectorAll('[data-invader]').forEach(function (el) {
    buildInvader(el, el.getAttribute('data-invader') || 'a');
  });

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      navigator.clipboard && navigator.clipboard.writeText(text);
      btn.classList.add('ok');
      var prev = btn.innerHTML;
      btn.innerHTML = okIcon();
      setTimeout(function () { btn.classList.remove('ok'); btn.innerHTML = prev; }, 1300);
    });
  });
  function okIcon() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }

  /* ---------- accent theming (swatches) ---------- */
  var ACCENTS = {
    green:   { a: 'oklch(0.872 0.205 148)', d: 'oklch(0.640 0.165 150)', ink: 'oklch(0.180 0.060 150)' },
    magenta: { a: 'oklch(0.720 0.250 350)', d: 'oklch(0.560 0.190 352)', ink: 'oklch(0.150 0.040 350)' },
    cyan:    { a: 'oklch(0.840 0.135 205)', d: 'oklch(0.620 0.110 210)', ink: 'oklch(0.150 0.040 220)' },
    amber:   { a: 'oklch(0.840 0.155 78)',  d: 'oklch(0.640 0.130 70)',  ink: 'oklch(0.170 0.050 70)' }
  };
  function setAccent(name) {
    var c = ACCENTS[name]; if (!c) return;
    var root = document.documentElement.style;
    root.setProperty('--accent', c.a);
    root.setProperty('--accent-d', c.d);
    root.setProperty('--accent-ink', c.ink);
    document.querySelectorAll('[data-accent-swatch]').forEach(function (s) {
      s.setAttribute('aria-pressed', String(s.getAttribute('data-accent-swatch') === name));
    });
  }
  document.querySelectorAll('[data-accent-swatch]').forEach(function (s) {
    s.style.background = ACCENTS[s.getAttribute('data-accent-swatch')].a;
    s.style.color = ACCENTS[s.getAttribute('data-accent-swatch')].a;
    s.addEventListener('click', function () { setAccent(s.getAttribute('data-accent-swatch')); });
  });

  /* ============================================================
     SNAKE — self-contained, themeable, playable
     ============================================================ */
  function Snake(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var GRID = opts.grid || 17;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size, cell;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      size = Math.min(rect.width, rect.height);
      cell = size / GRID;
      canvas.width = size * dpr; canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    var snake, dir, nextDir, food, score, best = 0, alive = false, started = false, raf, last = 0, speed = 118;

    function reset() {
      snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
      dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
      score = 0; alive = true; placeFood();
      updateHud();
    }
    function placeFood() {
      do {
        food = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
      } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

    function step() {
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID ||
          snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        alive = false; started = false;
        best = Math.max(best, score); updateHud();
        if (opts.onEnd) opts.onEnd(score);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; updateHud(); placeFood(); }
      else snake.pop();
    }

    function draw() {
      if (!ctx) return;
      var accent = css('--accent') || '#6ee7a8';
      ctx.clearRect(0, 0, size, size);
      // subtle grid
      ctx.strokeStyle = 'oklch(0.24 0.016 262)';
      ctx.lineWidth = 1;
      for (var i = 1; i < GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(size, i * cell); ctx.stroke();
      }
      if (!snake) return;
      // food
      var fp = cell * 0.26;
      ctx.fillStyle = css('--magenta') || '#ff5dba';
      roundRect(food.x * cell + fp, food.y * cell + fp, cell - fp * 2, cell - fp * 2, 3);
      ctx.fill();
      // snake
      for (var s = snake.length - 1; s >= 0; s--) {
        var seg = snake[s];
        var t = 1 - s / snake.length;
        ctx.globalAlpha = 0.45 + t * 0.55;
        ctx.fillStyle = accent;
        var pad = cell * 0.12;
        roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!started || !alive) return;
      if (ts - last < speed) return;
      last = ts; step(); draw();
    }

    function updateHud() {
      if (opts.scoreEl) opts.scoreEl.textContent = String(score).padStart(3, '0');
      if (opts.bestEl) opts.bestEl.textContent = String(best).padStart(3, '0');
    }

    function turn(x, y) {
      if (dir.x + x === 0 && dir.y + y === 0) return; // no reverse
      nextDir = { x: x, y: y };
    }

    function start() {
      if (!alive || !snake) reset();
      started = true;
      if (opts.onStart) opts.onStart();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    }

    // controls
    window.addEventListener('keydown', function (e) {
      var map = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
      };
      if (map[e.key] && opts.focusEl && isVisible(opts.focusEl)) {
        e.preventDefault(); turn(map[e.key][0], map[e.key][1]);
        if (!started) start();
      }
    });
    // touch swipe
    var tx = 0, ty = 0;
    canvas.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
      if (!started) start();
    }, { passive: true });

    function isVisible(el) {
      var r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || 0);
    }

    window.addEventListener('resize', resize);
    resize();
    return { start: start, reset: function () { reset(); draw(); }, isAlive: function () { return alive; }, isStarted: function () { return started; } };
  }

  /* ---------- mount hero snake ---------- */
  var heroCanvas = document.getElementById('snake');
  if (heroCanvas) {
    var panel = document.getElementById('snake-panel');
    var overlay = document.getElementById('snake-overlay');
    var startBtn = document.getElementById('snake-start');
    var game = Snake(heroCanvas, {
      grid: 17,
      focusEl: panel,
      scoreEl: document.getElementById('snake-score'),
      bestEl: document.getElementById('snake-best'),
      onStart: function () { if (overlay) overlay.dataset.state = 'playing'; },
      onEnd: function () { if (overlay) { overlay.dataset.state = 'over'; } }
    });
    if (startBtn) startBtn.addEventListener('click', function () { game.start(); });
    if (overlay) overlay.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      game.start();
    });
  }

  /* ---------- attract-mode marquee: duplicate track for seamless loop ---------- */
  document.querySelectorAll('[data-marquee]').forEach(function (m) {
    var track = m.querySelector('.marquee-track');
    if (track) track.innerHTML += track.innerHTML;
  });

  /* ---------- lineup cards: reveal install on focus/hover already CSS; nothing needed ---------- */

  /* ============================================================
     TWEAKS PANEL (vanilla host protocol)
     ============================================================ */
  (function tweaks() {
    var KEY = 'gamekit-tweaks';
    var state = { accent: 'green', scanlines: true, crt: true };
    try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

    function apply() {
      setAccent(state.accent);
      document.body.setAttribute('data-scanlines', state.scanlines ? 'on' : 'off');
      document.documentElement.style.setProperty('--crt', state.crt ? '1' : '0');
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }
    apply();

    // build panel
    var panel = document.createElement('div');
    panel.className = 'tweaks';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="tweaks-h"><span class="t">▸ Tweaks</span><button class="x" aria-label="Close">×</button></div>' +
      '<div class="tw-body">' +
        '<div class="tw-sec">Accent</div>' +
        '<div class="tw-swatches">' +
          ['green', 'magenta', 'cyan', 'amber'].map(function (n) {
            return '<button class="swatch" data-tw-accent="' + n + '" aria-label="' + n + '"></button>';
          }).join('') +
        '</div>' +
        '<div class="tw-sec">CRT chrome</div>' +
        '<div class="tw-row"><span class="lab">Scanlines</span><button class="tw-switch" data-tw="scanlines" role="switch"></button></div>' +
        '<div class="tw-row"><span class="lab">Screen glow</span><button class="tw-switch" data-tw="crt" role="switch"></button></div>' +
      '</div>';
    document.body.appendChild(panel);

    var ACOL = { green: 'oklch(0.872 0.205 148)', magenta: 'oklch(0.720 0.250 350)', cyan: 'oklch(0.840 0.135 205)', amber: 'oklch(0.840 0.155 78)' };
    function sync() {
      panel.querySelectorAll('[data-tw-accent]').forEach(function (b) {
        var n = b.getAttribute('data-tw-accent');
        b.style.background = ACOL[n]; b.style.color = ACOL[n];
        b.setAttribute('aria-pressed', String(n === state.accent));
      });
      panel.querySelectorAll('[data-tw]').forEach(function (sw) {
        sw.setAttribute('aria-checked', String(!!state[sw.getAttribute('data-tw')]));
      });
    }
    sync();

    panel.querySelectorAll('[data-tw-accent]').forEach(function (b) {
      b.addEventListener('click', function () { state.accent = b.getAttribute('data-tw-accent'); apply(); sync(); });
    });
    panel.querySelectorAll('[data-tw]').forEach(function (sw) {
      sw.addEventListener('click', function () { var k = sw.getAttribute('data-tw'); state[k] = !state[k]; apply(); sync(); });
    });

    function close() { panel.hidden = true; post('__edit_mode_dismissed'); }
    panel.querySelector('.x').addEventListener('click', close);

    function post(type) { try { parent.postMessage({ type: type }, '*'); } catch (e) {} }
    window.addEventListener('message', function (e) {
      var t = e.data && e.data.type;
      if (t === '__activate_edit_mode') { panel.hidden = false; sync(); }
      else if (t === '__deactivate_edit_mode') { panel.hidden = true; }
    });
    post('__edit_mode_available');
    post('__edit_mode_set_keys');
  })();

  /* ---------- expose for tweaks ---------- */
  window.GameKit = { setAccent: setAccent };
})();
