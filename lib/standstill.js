// Animations of real standstill data, ported to English from the DNVA deck of 16 November 2026. The
// data are in images/traces.js, written by tools/make_traces.py from the Still Standing deposit. Each
// <canvas data-anim="..."> is drawn when its slide is shown; data-speed is data seconds per real second.
// With ?fragments=false (the PDF) the final frame is drawn at once. Colours are read from the CSS
// variables, so dark mode follows. Press L on a slide with an animation and the same numbers are
// sonified with Web Audio (see SOUND below).
(function () {
  var T = window.TRACES;
  if (!T) return;
  var STATIC = /[?&]fragments=false\b/.test(location.search);
  var FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';

  function css(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function col() {
    return { ink: css('--r-main-color', '#363644'), accent: css('--accent', '#5a4fcf'),
             muted: css('--muted', '#718096'), purple: css('--mm-purple', '#A7A1F4'), green: css('--good', '#2f855a') };
  }
  function nb(v, dec) { return v.toFixed(dec).replace('-', '−'); }   // English form: decimal point
  function mmss(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  function setup(c) {
    var W = +c.getAttribute('width'), H = +c.getAttribute('height'), dpr = 2;
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { c: c, ctx: ctx, W: W, H: H, t: 0, cur: 0 };
  }
  function clear(s) { s.ctx.clearRect(0, 0, s.W, s.H); s.cur = 0; }

  // Draws the head's path seen from above inside the box (x0, y0, w, h); incrementally from s.cur.
  function pathTo(s, box, X, Y, fs, tEnd, color, scale, lw) {
    var ctx = s.ctx, n = Math.min(X.length, Math.floor(tEnd * fs) + 1);
    if (n <= s.cur) return;
    var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
    var i0 = Math.max(0, s.cur - 1);
    ctx.moveTo(cx + X[i0] * scale, cy - Y[i0] * scale);
    for (var i = i0 + 1; i < n; i++) ctx.lineTo(cx + X[i] * scale, cy - Y[i] * scale);
    ctx.stroke(); ctx.restore();
    s.cur = n;
  }
  function extent(X, Y) {
    var m = 1;
    for (var i = 0; i < X.length; i++) { var a = Math.abs(X[i]), b = Math.abs(Y[i]); if (a > m) m = a; if (b > m) m = b; }
    return m;
  }
  // Scale bar: a line px pixels long from x, with the label below; anchor is 'left', 'center' or 'right'.
  function scaleBar(s, x, y, px, label, anchor) {
    var ctx = s.ctx, k = col(), a = anchor || 'left';
    ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + px, y); ctx.stroke();
    ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = a; ctx.textBaseline = 'top';
    ctx.fillText(label, a === 'left' ? x : a === 'right' ? x + px : x + px / 2, y + 8);
  }

  var ANIMS = {
    // One participant, seen from above, with a clock.
    trace: {
      duration: function () { return T.head.duration; },
      init: function (s) { s.scale = (Math.min(s.W, s.H) * 0.46) / extent(T.head.x, T.head.y); },
      draw: function (s, t) {
        var k = col(), h = T.head;
        if (s.cur === 0) { clear(s); }
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, h.x, h.y, h.fs, t, k.accent, s.scale, 2.5);
        // clock and scale bar on top, in a field that is wiped first
        s.ctx.clearRect(s.W / 2 - 120, s.H - 70, 240, 70); s.ctx.clearRect(s.W - 170, 0, 170, 60);
        scaleBar(s, s.W / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        s.ctx.fillStyle = k.muted; s.ctx.font = '700 40px ' + FONT; s.ctx.textAlign = 'right'; s.ctx.textBaseline = 'top';
        s.ctx.fillText(mmss(t), s.W - 16, 8);
      }
    },
    // The path on the left, the accumulated distance on the right: almost a straight line.
    accum: {
      duration: function () { return T.head.duration; },
      init: function (s) {
        var h = T.head;
        s.cum = h.cum; s.total = h.path_m;      // computed by make_traces.py with the same speed as the reports
        s.left = { x: 0, y: 0, w: s.H, h: s.H };
        s.scale = (s.H * 0.46) / extent(h.x, h.y);
        s.plot = { x: s.H + 120, y: 40, w: s.W - s.H - 160, h: s.H - 120 };
      },
      draw: function (s, t) {
        var k = col(), h = T.head, ctx = s.ctx, p = s.plot;
        if (s.cur === 0) {
          clear(s);
          ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
          ctx.fillStyle = k.muted; ctx.font = '28px ' + FONT; ctx.textBaseline = 'top';
          ctx.textAlign = 'left'; ctx.fillText('0', p.x - 4, p.y + p.h + 10);
          ctx.textAlign = 'right'; ctx.fillText(nb(h.duration / 60, 0) + ' min', p.x + p.w, p.y + p.h + 10);
          ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(nb(s.total, 1) + ' m travelled', p.x + 12, p.y + 4);
          scaleBar(s, s.left.w / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        }
        var from = s.cur;
        pathTo(s, s.left, h.x, h.y, h.fs, t, k.accent, s.scale, 2.5);
        var n = s.cur;
        if (n > from) {
          ctx.strokeStyle = k.accent; ctx.lineWidth = 5; ctx.beginPath();
          var i0 = Math.max(0, from - 1);
          for (var i = i0; i < n; i++) {
            var x = p.x + (i / (h.x.length - 1)) * p.w, y = p.y + p.h - (s.cum[i] / s.total) * p.h;
            if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    },
    // All participants in one championship, in real time; the colour changes when the music starts.
    flock: {
      duration: function () { return 60; },
      init: function (s) {
        var n = T.flock.length, cols = Math.ceil(Math.sqrt(n * s.W / s.H)), rows = Math.ceil(n / cols);
        var cell = Math.min(s.W / cols, s.H / rows);
        s.cols = cols; s.cell = cell; s.ox = (s.W - cols * cell) / 2; s.oy = (s.H - rows * cell) / 2;
        s.scale = (cell * 0.5) / 15;     // 15 mm from the centre to the edge of the cell
        s.curs = T.flock.map(function () { return 0; });
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx;
        if (s.cur === 0) { clear(s); s.curs = T.flock.map(function () { return 0; }); s.cur = 1; }
        T.flock.forEach(function (f, j) {
          var box = { x: s.ox + (j % s.cols) * s.cell, y: s.oy + Math.floor(j / s.cols) * s.cell, w: s.cell, h: s.cell };
          var n = Math.min(f.x.length, Math.floor(t * 10) + 1), c0 = s.curs[j];
          if (n <= c0) return;
          var cx = box.x + box.w / 2, cy = box.y + box.h / 2, on = Math.floor(f.music_on * 10);
          ctx.save(); ctx.beginPath(); ctx.rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4); ctx.clip();
          ctx.lineWidth = 1.6;
          var i0 = Math.max(0, c0 - 1);
          for (var i = i0 + 1; i < n; i++) {
            ctx.strokeStyle = i < on ? k.ink : k.accent; ctx.beginPath();
            ctx.moveTo(cx + f.x[i - 1] * s.scale, cy - f.y[i - 1] * s.scale);
            ctx.lineTo(cx + f.x[i] * s.scale, cy - f.y[i] * s.scale); ctx.stroke();
          }
          ctx.restore(); s.curs[j] = n;
        });
        ctx.clearRect(s.W - 170, 0, 170, 60);
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(mmss(t), s.W - 16, 8);
        scaleBar(s, s.W - 20 - 10 * s.scale, s.H - 44, 10 * s.scale, '1 cm', 'right');
      }
    },
    // Three bands of the chest accelerometer scroll past: breathing, weight shifting, heartbeat.
    clocks: {
      duration: function () { return 60; },
      init: function (s) {
        s.rows = [['resp', 'Breathing'], ['post', 'Sway'], ['card', 'Heartbeat']];
        s.norm = {};
        s.rows.forEach(function (r) { var m = 0; T.clocks[r[0]].forEach(function (v) { if (Math.abs(v) > m) m = Math.abs(v); }); s.norm[r[0]] = m || 1; });
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx, fs = T.clocks.fs, win = 20, rowH = (s.H - 60) / 3, x0 = 340;   // 60 px at the bottom for the beats and the time label
        clear(s);
        s.rows.forEach(function (r, j) {
          var y0 = rowH * j + rowH / 2, amp = rowH * 0.38, v = T.clocks[r[0]], N = v.length;
          ctx.fillStyle = k.ink; ctx.font = '700 36px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(r[1], 0, y0);
          ctx.strokeStyle = j === 2 ? k.accent : k.ink; ctx.lineWidth = 3; ctx.beginPath();
          var tEnd = Math.min(t, 60), iEnd = Math.floor(tEnd * fs), i0 = Math.max(0, iEnd - win * fs);
          for (var i = i0; i <= Math.min(iEnd, N - 1); i++) {
            var x = x0 + ((i / fs - (tEnd - win)) / win) * (s.W - x0), y = y0 - (v[i] / s.norm[r[0]]) * amp;
            if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (j === 2 && T.clocks.beats) {          // a dot under the curve for each beat the sound marks
            ctx.fillStyle = k.accent;
            T.clocks.beats.forEach(function (b) {
              if (b > tEnd || b < tEnd - win) return;
              ctx.beginPath(); ctx.arc(x0 + ((b - (tEnd - win)) / win) * (s.W - x0), y0 + amp + 18, 6, 0, 2 * Math.PI); ctx.fill();
            });
          }
        });
        ctx.fillStyle = k.muted; ctx.font = '28px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(win + ' seconds', s.W, s.H);
      }
    },
    // One dot per day through the year, then the median as a flat line.
    year: {
      duration: function () { return 365 + 30; },
      init: function (s) {
        var q = T.year.qom.slice().sort(function (a, b) { return a - b; });
        s.median = q[Math.floor(q.length / 2)];
        s.max = q[q.length - 1];
        s.plot = { x: 70, y: 30, w: s.W - 90, h: s.H - 110 };
      },
      draw: function (s, t) {
        var k = col(), ctx = s.ctx, p = s.plot, months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        clear(s);
        ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        months.forEach(function (d, i) { ctx.fillText(names[i], p.x + ((d + 15) / 365) * p.w, p.y + p.h + 10); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('mm/s²', p.x + 8, p.y + 2);
        ctx.fillStyle = k.accent;
        var day = Math.min(365, Math.floor(t));
        for (var i = 0; i < T.year.day.length; i++) {
          if (T.year.day[i] > day) continue;
          var x = p.x + (T.year.day[i] / 365) * p.w, y = p.y + p.h - (T.year.qom[i] / s.max) * p.h;
          ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        }
        if (t > 365) {
          var frac = Math.min(1, (t - 365) / 30), y = p.y + p.h - (s.median / s.max) * p.h;
          ctx.strokeStyle = k.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + frac * p.w, y); ctx.stroke();
        }
      }
    },
    // Spatial extent: the unfiltered path about its own centre, with the median dispersion radius (report 04) as a circle.
    range: {
      duration: function () { return T.head.duration; },
      init: function (s) {
        s.R = parseFloat(String((window.NUMBERS || {}).disp || '0').replace(',', '.'));
        s.scale = (Math.min(s.W, s.H) * 0.43) / Math.max(extent(T.head.rx, T.head.ry), s.R * 1.1);
      },
      draw: function (s, t) {
        var k = col(), h = T.head, ctx = s.ctx, cx = s.W / 2, cy = s.H / 2;
        if (s.cur === 0) {
          clear(s);
          ctx.save(); ctx.strokeStyle = k.muted; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
          ctx.beginPath(); ctx.arc(cx, cy, s.R * s.scale, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
        }
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, h.rx, h.ry, h.fs, t, k.accent, s.scale, 2.5);
        ctx.clearRect(s.W / 2 - 120, s.H - 70, 240, 70); ctx.clearRect(s.W - 170, 0, 170, 60);
        scaleBar(s, s.W / 2 - 5 * s.scale, s.H - 50, 10 * s.scale, '1 cm', 'center');
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(mmss(t), s.W - 16, 8);
      }
    },
    // One day's motion through the session (window.WASP from tools/make_wasp.py), drawn progressively, with the year's median dashed.
    wasp: {
      duration: function () { return window.WASP ? window.WASP.t_s[window.WASP.t_s.length - 1] : 1; },
      init: function (s) {
        var W = window.WASP || { y: [1], median: 1 }, top = Math.max.apply(null, W.y.concat([W.median]));
        s.ymax = Math.ceil(top / 10) * 10;
        s.box = { x: 110, y: 30, w: s.W - 360, h: s.H - 120 };   // room on the right for "median of the year"
      },
      draw: function (s, t) {
        var W = window.WASP; if (!W) return;
        var k = col(), ctx = s.ctx, b = s.box, T = W.t_s[W.t_s.length - 1];
        function X(v) { return b.x + b.w * v / T; }
        function Y(v) { return b.y + b.h * (1 - v / s.ymax); }
        ctx.clearRect(0, 0, s.W, s.H);
        ctx.strokeStyle = k.muted; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
        for (var v = 0; v <= s.ymax; v += 10) ctx.fillText(String(v), b.x - 12, Y(v));
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (var m = 0; m * 60 <= T; m++) ctx.fillText(String(m), X(m * 60), b.y + b.h + 10);
        ctx.fillText('minutes', b.x + b.w / 2, b.y + b.h + 46);
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('mm/s²', b.x + 8, b.y - 2);
        ctx.save(); ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(b.x, Y(W.median)); ctx.lineTo(b.x + b.w, Y(W.median)); ctx.stroke(); ctx.restore();
        ctx.textBaseline = 'middle'; ctx.fillText('median of the year', b.x + b.w + 12, Y(W.median));
        ctx.strokeStyle = k.accent; ctx.lineWidth = 5; ctx.beginPath();
        var started = false;
        for (var i = 0; i < W.t_s.length && W.t_s[i] <= t; i++) {
          if (!started) { ctx.moveTo(X(W.t_s[i]), Y(W.y[i])); started = true; } else ctx.lineTo(X(W.t_s[i]), Y(W.y[i]));
        }
        ctx.stroke();
      }
    },
    // Three groups dancing to the mix, side by side, seen from above (window.DANCE_FLOORS from
    // tools/make_dance_floors.py): one dot per head with a short bright trail, and the whole path so
    // far left faintly on the floor (since 18 November 2026; before that only at the end and in the PDF).
    floors: {
      duration: function () { return window.DANCE_FLOORS ? window.DANCE_FLOORS.duration : 1; },
      init: function (s) {
        var gap = 40, top = 56, hx = 300, hy = 200;           // each floor shown as ±3 m by ±2 m, in cm
        s.fw = (s.W - 2 * gap) / 3; s.gap = gap; s.top = top;
        s.scale = Math.min(s.fw / (2 * hx), (s.H - top - 80) / (2 * hy));   // px per cm
        s.fh = 2 * hy * s.scale; s.trail = 3;                 // seconds of trail behind each dot
      },
      draw: function (s, t) {
        var F = window.DANCE_FLOORS; if (!F) return;
        var k = col(), ctx = s.ctx, fs = F.fs, end = t >= F.duration;
        clear(s);
        F.groups.forEach(function (g, j) {
          var bx = j * (s.fw + s.gap), by = s.top, cx = bx + s.fw / 2, cy = by + s.fh / 2;
          function X(v) { return cx + v * s.scale; }
          function Y(v) { return cy - v * s.scale; }
          ctx.fillStyle = k.ink; ctx.font = '700 34px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillText(g.label, bx, by - 10);
          ctx.save();
          ctx.strokeStyle = k.muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, s.fw, s.fh);
          ctx.beginPath(); ctx.rect(bx, by, s.fw, s.fh); ctx.clip();
          ctx.strokeStyle = k.accent;
          g.dancers.forEach(function (d) {
            var N = d.x.length, i = Math.min(N - 1, Math.floor(t * fs)), i0, q;
            {                                                  // the whole path so far stays on the floor, faintly
              ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5; ctx.beginPath(); var pen = false;
              for (q = 0; q <= (end ? N - 1 : i); q++) {
                if (d.x[q] === null) { pen = false; continue; }
                if (pen) ctx.lineTo(X(d.x[q]), Y(d.y[q])); else { ctx.moveTo(X(d.x[q]), Y(d.y[q])); pen = true; }
              }
              ctx.stroke();
            }
            // the trail in short pieces, older pieces fainter; whole pieces rather than single segments, so
            // the overlapping ends of the segments do not show as beads
            i0 = Math.max(0, i - Math.round(s.trail * fs)); ctx.lineWidth = 4;
            for (var p0 = i0; p0 < i; p0 += 5) {
              var p1 = Math.min(i, p0 + 5), on = false;
              ctx.globalAlpha = 0.85 * (p1 - i0) / (i - i0 + 1); ctx.beginPath();
              for (q = p0; q <= p1; q++) {
                if (d.x[q] === null) { on = false; continue; }
                if (on) ctx.lineTo(X(d.x[q]), Y(d.y[q])); else { ctx.moveTo(X(d.x[q]), Y(d.y[q])); on = true; }
              }
              ctx.stroke();
            }
            if (d.x[i] !== null) {
              ctx.globalAlpha = 1; ctx.fillStyle = k.accent;
              ctx.beginPath(); ctx.arc(X(d.x[i]), Y(d.y[i]), 9, 0, 2 * Math.PI); ctx.fill();
            }
          });
          ctx.restore();
        });
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(mmss(t), s.W - 4, s.top - 8);
        scaleBar(s, s.W - 100 * s.scale, s.top + s.fh + 18, 100 * s.scale, '1 m', 'right');
      }
    },
    // One departure at Deichman (window.LEADER from tools/make_leader.py, report 19): one row of chest
    // motion per performer, ordered by onset, each trace turning purple at that performer's motion onset,
    // with the designated leader marked. Time is in seconds from the leader's onset. One departure plays, the
    // one with the median leader gap, once, and stops on its last frame (since 18 November 2026; before
    // that three departures played in turn).
    leader: {
      duration: function () {
        var L = window.LEADER; if (!L) return 1;
        return L.transitions[0].duration;              // one departure, the one with the median gap, played once
      },
      init: function (s) { s.plot = { x: 190, y: 70, w: s.W - 210, h: s.H - 160 }; },
      draw: function (s, t) {
        var L = window.LEADER; if (!L) return;
        var k = col(), ctx = s.ctx, p = s.plot, tr = L.transitions, j = 0, tt = t;
        if (t >= s.anim.duration()) { tt = tr[0].duration; }
        var d = tr[j], now = d.t0 + tt, n = d.rows.length, rowH = p.h / n, amp = rowH * 0.9, moving = 0;
        s.lj = j; s.lnow = now;                         // for the sound
        function X(v) { return p.x + ((v - d.t0) / d.duration) * p.w; }
        clear(s);
        // the time axis, with a tick every 10 s and the leader's onset as a dashed line
        ctx.strokeStyle = k.muted; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(p.x, p.y + p.h + 8); ctx.lineTo(p.x + p.w, p.y + p.h + 8); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (var v = Math.ceil(d.t0 / 10) * 10; v <= d.t0 + d.duration; v += 10) {
          ctx.beginPath(); ctx.moveTo(X(v), p.y + p.h + 8); ctx.lineTo(X(v), p.y + p.h + 18); ctx.stroke();
          ctx.fillText(v > 0 ? '+' + nb(v, 0) : nb(v, 0), X(v), p.y + p.h + 24);
        }
        ctx.fillText('seconds from the leader’s onset', p.x + p.w / 2, p.y + p.h + 58);
        ctx.save(); ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(X(0), p.y - 6); ctx.lineTo(X(0), p.y + p.h + 8); ctx.stroke(); ctx.restore();
        d.rows.forEach(function (r, i) {
          var base = p.y + (i + 1) * rowH - rowH * 0.12, on = r.onset, q;
          function Y(v) { return base - Math.max(-0.1, Math.min(1.05, v)) * amp; }
          ctx.fillStyle = r.leader ? k.accent : k.muted; ctx.font = (r.leader ? '700 ' : '') + '24px ' + FONT;
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          ctx.fillText(r.leader ? 'leader' : r.pid, p.x - 16, base - rowH * 0.2);
          // before the onset (or for a person with no onset) in grey, after it in purple
          [[false, 2], [true, 3.5]].forEach(function (pass) {
            ctx.strokeStyle = pass[0] ? k.accent : k.muted; ctx.lineWidth = pass[1]; ctx.beginPath();
            var pen = false;
            for (q = 0; q < r.y.length; q++) {
              var tq = d.t0 + q / L.fs;
              if (tq > now) break;
              var mine = pass[0] ? on !== null && tq >= on - 1e-6 : on === null || tq <= on + 1e-6;   // both passes share the onset sample
              if (r.y[q] === null || !mine) { pen = false; continue; }
              if (pen) ctx.lineTo(X(tq), Y(r.y[q])); else { ctx.moveTo(X(tq), Y(r.y[q])); pen = true; }
            }
            ctx.stroke();
          });
          // the performer who leaves long after the others: say so on the row, so that the flat line reads as a finding
          if (i === n - 1 && on !== null && L.last_count && L.last_count[r.pid] > 1 && on - d.rows[n - 2].onset > 20) {
            ctx.fillStyle = k.muted; ctx.font = '24px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
            ctx.fillText('last to leave in ' + L.last_count[r.pid] + ' of ' + L.n_transitions + ' departures', X(on) - 24, base - 6);
          }
          if (on !== null && on <= now) {
            moving++;
            ctx.fillStyle = k.accent; ctx.beginPath(); ctx.arc(X(on), base, r.leader ? 10 : 7, 0, 2 * Math.PI); ctx.fill();
          }
        });
        if (tt < d.duration) {                           // the playhead
          ctx.strokeStyle = k.ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(X(now), p.y - 6); ctx.lineTo(X(now), p.y + p.h + 8); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = k.ink; ctx.font = '700 32px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('Departure to station ' + d.station, p.x, p.y - 20);
        ctx.fillStyle = k.muted; ctx.font = '700 32px ' + FONT; ctx.textAlign = 'right';
        ctx.fillText(moving + ' of ' + n + ' moving', p.x + p.w, p.y - 20);
      }
    },
    // The three Sverm performers' heads seen from above, one session each with the performer's median
    // quantity of motion (window.SIGNATURE from tools/make_signature.py, report 01), drawn at the same time
    // and at the same scale, so the difference in amount and direction shows.
    signature: {
      duration: function () { return window.SIGNATURE ? window.SIGNATURE.duration : 1; },
      init: function (s) {
        var G = window.SIGNATURE || { people: [] }, m = 1, gap = 60;
        G.people.forEach(function (q) { m = Math.max(m, extent(q.x, q.y)); });
        s.top = 60; s.gap = gap; s.fw = (s.W - 2 * gap) / 3;
        s.box = Math.min(s.fw, s.H - s.top - 80);
        s.scale = (s.box * 0.48) / m;
        s.curs = [0, 0, 0];
      },
      draw: function (s, t) {
        var G = window.SIGNATURE; if (!G) return;
        var k = col(), ctx = s.ctx;
        if (s.cur === 0) {
          clear(s); s.cur = 1; s.curs = G.people.map(function () { return 0; });
          G.people.forEach(function (q, j) {
            var bx = j * (s.fw + s.gap);
            ctx.fillStyle = k.ink; ctx.font = '700 30px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            ctx.fillText(q.label, bx, s.top - 8);
          });
          scaleBar(s, s.W - 10 * s.scale, s.top + s.box + 18, 10 * s.scale, '1 cm', 'right');
        }
        G.people.forEach(function (q, j) {
          var bx = j * (s.fw + s.gap), cx = bx + s.fw / 2, cy = s.top + s.box / 2;
          var n = Math.min(q.x.length, Math.floor(t * G.fs) + 1), c0 = s.curs[j];
          if (n <= c0) return;
          ctx.save(); ctx.beginPath(); ctx.rect(bx, s.top, s.fw, s.box); ctx.clip();
          ctx.strokeStyle = k.accent; ctx.lineWidth = 1.6; ctx.beginPath();
          var i0 = Math.max(0, c0 - 1);
          ctx.moveTo(cx + q.x[i0] * s.scale, cy - q.y[i0] * s.scale);
          for (var i = i0 + 1; i < n; i++) ctx.lineTo(cx + q.x[i] * s.scale, cy - q.y[i] * s.scale);
          ctx.stroke(); ctx.restore(); s.curs[j] = n;
        });
        var cy0 = s.top + s.box + 4;                      // the clock bottom left, clear of the labels and the scale bar
        ctx.clearRect(0, cy0, 200, s.H - cy0);
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(mmss(t), 4, cy0 + 10);
      }
    },
    // fig-dance-timeline.png redrawn (window.DANCECURVE from tools/make_dancecurve.py): the median head
    // speed of the two groups that heard mix 1, with the music level below and the breaks shaded; the
    // curves draw themselves behind a playhead. The music level and the shading are there from the start.
    dancecurve: {
      duration: function () { return window.DANCECURVE ? window.DANCECURVE.duration : 1; },
      init: function (s) {
        var D = window.DANCECURVE || { groups: [], level: [1] }, m = 1;
        D.groups.forEach(function (g) { g.y.forEach(function (v) { if (v > m) m = v; }); });
        s.step = 200; s.ymax = Math.ceil(m / s.step) * s.step;
        s.lmax = Math.max.apply(null, D.level);
        s.top = { x: 130, y: 60, w: s.W - 150, h: (s.H - 140) * 0.72 };
        s.bot = { x: 130, y: s.top.y + s.top.h + 24, w: s.W - 150, h: (s.H - 140) * 0.28 - 24 };
      },
      draw: function (s, t) {
        var D = window.DANCECURVE; if (!D) return;
        var k = col(), ctx = s.ctx, a = s.top, b = s.bot, dark = document.documentElement.classList.contains('dark');
        var green = dark ? '#2f6b3a' : css('--mm-green', '#C1F7AE');
        function X(v) { return a.x + (v / D.duration) * a.w; }
        function Y(v) { return a.y + a.h * (1 - v / s.ymax); }
        function YL(v) { return b.y + b.h * (1 - v / s.lmax); }
        clear(s);
        D.breaks.forEach(function (br) {             // breakdown to build-up strong, build-up to drop light
          ctx.fillStyle = green;
          [[br.breakdown, br.buildup, 0.6], [br.buildup, br.drop, 0.25]].forEach(function (z) {
            ctx.globalAlpha = dark ? z[2] + 0.2 : z[2];
            ctx.fillRect(X(z[0]), a.y, X(z[1]) - X(z[0]), a.h); ctx.fillRect(X(z[0]), b.y, X(z[1]) - X(z[0]), b.h);
          });
          ctx.globalAlpha = 1; ctx.fillStyle = k.ink; ctx.font = '26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('break', X((br.breakdown + br.drop) / 2), a.y - 4);
        });
        // axes: speed on the left, time below the music level
        ctx.strokeStyle = k.muted; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y + a.h); ctx.lineTo(a.x + a.w, a.y + a.h);
        ctx.moveTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
        ctx.fillStyle = k.muted; ctx.font = '26px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (var v = 0; v <= s.ymax; v += s.step) ctx.fillText(nb(v, 0), a.x - 12, Y(v));
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (var u = 0; u <= D.duration; u += 100) {
          ctx.beginPath(); ctx.moveTo(X(u), b.y + b.h); ctx.lineTo(X(u), b.y + b.h + 8); ctx.stroke();
          ctx.fillText(nb(u, 0), X(u), b.y + b.h + 12);
        }
        ctx.fillText('time in the mix (s)', a.x + a.w / 2, b.y + b.h + 46);
        ctx.save(); ctx.translate(a.x - 90, a.y + a.h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
        ctx.fillText('median head speed (mm/s)', 0, 0); ctx.restore();
        ctx.save(); ctx.translate(b.x - 30, b.y + b.h / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
        ctx.fillText('music level', 0, 0); ctx.restore();
        // the music level, all of it, and the track titles
        ctx.strokeStyle = k.ink; ctx.lineWidth = 1.5; ctx.beginPath();
        D.level.forEach(function (v, i) { if (i) ctx.lineTo(X(i), YL(v)); else ctx.moveTo(X(i), YL(v)); });
        ctx.stroke();
        ctx.fillStyle = k.ink; ctx.font = '24px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        D.tracks.forEach(function (tr) { ctx.fillText(tr.title, X(tr.start) + 6, b.y + b.h - 4); });
        // the two curves up to the playhead, and the legend
        var n = Math.min(D.duration, Math.floor(t) + 1);
        D.groups.forEach(function (g, j) {
          ctx.strokeStyle = j === 0 ? k.accent : k.ink; ctx.lineWidth = 3.5; ctx.beginPath();
          for (var i = 0; i < n; i++) { if (i) ctx.lineTo(X(i), Y(g.y[i])); else ctx.moveTo(X(i), Y(g.y[i])); }
          if (t < D.duration && n < g.y.length) ctx.lineTo(X(t), Y(g.y[n - 1] + (g.y[n] - g.y[n - 1]) * (t - n + 1)));
          ctx.stroke();
          var lx = a.x + 30 + j * 260, ly = a.y + 26;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 60, ly); ctx.stroke();
          ctx.fillStyle = k.ink; ctx.font = '28px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(g.label, lx + 74, ly);
        });
        if (t < D.duration) {
          ctx.strokeStyle = k.ink; ctx.globalAlpha = 0.4; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(X(t), a.y); ctx.lineTo(X(t), b.y + b.h); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = k.muted; ctx.font = '700 40px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(mmss(t), s.W - 4, a.y - 8);
      }
    },
    // The small path in the corner, in real time throughout the talk.
    ambient: {
      duration: function () { return T.head.duration; },
      loop: true,
      init: function (s) { s.scale = (Math.min(s.W, s.H) * 0.46) / extent(T.head.x, T.head.y); },
      draw: function (s, t) {
        if (s.cur === 0) clear(s);
        pathTo(s, { x: 0, y: 0, w: s.W, h: s.H }, T.head.x, T.head.y, T.head.fs, t, col().muted, s.scale, 1.2);
      }
    }
  };


  // ---- Sonification: press L on a slide with an animation and the data are heard while drawn. ----
  // The sound is made with Web Audio from the same numbers as the drawing; nothing is recorded.
  var AC = null, master = null, soundOn = false;
  function audio() {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.6;
      var lim = AC.createDynamicsCompressor();      // a soft limiter at the end, so the sum of the voices never clips
      lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      master.connect(lim); lim.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(type, freq) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = 0; o.connect(g); o.start();
    return { o: o, g: g };
  }
  function blip(freq, dur, vol, type) {
    var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + dur);   // short attack, otherwise a deep beat clicks
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise() {            // looped brown noise, for the crowd
    var buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0), b = 0;
    for (var i = 0; i < d.length; i++) { b = 0.98 * b + 0.02 * (Math.random() * 2 - 1); d[i] = b * 8; }
    var src = AC.createBufferSource(), g = AC.createGain();
    src.buffer = buf; src.loop = true; g.gain.value = 0; src.connect(g); src.start();
    return { o: src, g: g };
  }
  function breathVoice() {       // white noise through a band-pass filter: the sound of air, for the breath
    var buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 0.9; g.gain.value = 0;
    src.connect(f); f.connect(g); src.start();
    return { o: src, f: f, g: g };
  }
  function fadeStop(voices) {   // fade over 60 ms before stopping, so it does not click when the sound is switched off
    voices.forEach(function (v) {
      try { v.g.gain.cancelScheduledValues(AC.currentTime); v.g.gain.setTargetAtTime(0, AC.currentTime, 0.02); v.o.stop(AC.currentTime + 0.12); } catch (e) {}
    });
  }
  function set(param, v, tc) { param.setTargetAtTime(v, AC.currentTime, tc || 0.03); }

  // One path: pitch from the head's position front to back, panning from side to side, loudness from the speed.
  var traceSound = {
    start: function (s) {
      var v = tone('sine', 220), p = AC.createStereoPanner ? AC.createStereoPanner() : null;
      if (p) { v.g.connect(p); p.connect(master); } else { v.g.connect(master); }
      s.snd = { v: v, p: p };
    },
    frame: function (s, t) {
      var h = T.head, i = Math.min(h.x.length - 1, Math.floor(t * h.fs));
      if (i < 1) return;
      // the speed as a mean over the last half second of data, not from two neighbouring samples: at 20 times
      // real time each frame skips several samples, and a speed from two samples gives a loudness jump per frame (a click)
      var n = Math.max(1, Math.min(i, Math.round(0.5 * h.fs))), path = 0;
      for (var q = i - n + 1; q <= i; q++) { var dx = h.x[q] - h.x[q - 1], dy = h.y[q] - h.y[q - 1]; path += Math.sqrt(dx * dx + dy * dy); }
      var sp = path / (n / h.fs);                                       // mm/s in data time
      set(s.snd.v.g.gain, Math.min(0.3, sp / 50), 0.12);
      set(s.snd.v.o.frequency, 220 * Math.pow(2, h.y[i] / 20), 0.08);
      if (s.snd.p) set(s.snd.p.pan, Math.max(-1, Math.min(1, h.x[i] / 15)), 0.1);
    },
    stop: function (s) { fadeStop([s.snd.v]); s.snd = null; }
  };
  var SOUND = {
    trace: traceSound, accum: traceSound,
    // A departure: one short tone at each performer's onset as the playhead passes it, the leader's an octave higher.
    leader: {
      start: function (s) { s.snd = { last: s.lnow === undefined ? -Infinity : s.lnow, j: s.lj }; },
      frame: function (s) {
        var L = window.LEADER; if (!L || s.lj === undefined) return;
        if (s.snd.j !== s.lj) { s.snd.j = s.lj; s.snd.last = -Infinity; }
        L.transitions[s.lj].rows.forEach(function (r) {
          if (r.onset !== null && r.onset > s.snd.last && r.onset <= s.lnow && s.lnow - r.onset < 0.5) blip(r.leader ? 880 : 440, 0.25, 0.3, 'triangle');
        });
        s.snd.last = s.lnow;
      },
      stop: function (s) { s.snd = null; }
    },
    // Three clocks: the breath as a slow swell, weight shifting as a rocking tone, the heart as one thud per beat.
    clocks: {
      start: function (s) {
        var r = breathVoice(), w = tone('triangle', 220);
        r.g.connect(master); w.g.connect(master);
        s.snd = { r: r, w: w, next: 0 };
      },
      frame: function (s, t) {
        var c = T.clocks, i = Math.min(c.resp.length - 1, Math.floor(t * c.fs));
        if (i < 1) return;
        // the breath: the air flows when the curve is moving, not when it turns, so the loudness follows the
        // curve's slope (two rushes per breath, in and out); inhalation slightly brighter than exhalation
        if (!s.dnorm) { var m = 0; for (var q = 1; q < c.resp.length; q++) m = Math.max(m, Math.abs(c.resp[q] - c.resp[q - 1])); s.dnorm = m || 1; }
        var dv = (c.resp[i] - c.resp[i - 1]) / s.dnorm, lvl = Math.min(1, Math.abs(dv));
        set(s.snd.r.g.gain, 0.5 * Math.pow(lvl, 1.5), 0.08);
        set(s.snd.r.f.frequency, (dv > 0 ? 900 : 550) + 700 * lvl, 0.1);
        set(s.snd.w.g.gain, 0.10 * Math.abs(c.post[i] / s.norm.post), 0.05);
        set(s.snd.w.o.frequency, 220 * Math.pow(2, 0.5 * c.post[i] / s.norm.post), 0.05);
        // one thud per heartbeat, at the times make_traces.py found (c.beats, seconds into the minute)
        while (c.beats && s.snd.next < c.beats.length && c.beats[s.snd.next] <= t) {
          if (t - c.beats[s.snd.next] < 0.2) blip(70, 0.14, 0.45);
          s.snd.next++;
        }
      },
      stop: function (s) { fadeStop([s.snd.r, s.snd.w]); s.snd = null; }
    },
    // The year: one tone per day, higher when I moved more than the median, lower when less.
    year: {
      start: function (s) { s.snd = { last: 0 }; },
      frame: function (s, t) {
        var day = Math.min(365, Math.floor(t));
        for (var d = s.snd.last + 1; d <= day; d++) {
          var k = T.year.day.indexOf(d);
          if (k >= 0) blip(440 * Math.pow(2, (T.year.qom[k] - s.median) / s.median), 0.09, 0.25, 'triangle');
        }
        s.snd.last = day;
      },
      stop: function (s) { s.snd = null; }
    },
    // All participants: a rush whose loudness is the total speed in the room, in real time. Listen for a change when the music starts.
    flock: {
      start: function (s) { var n = noise(); n.g.connect(master); s.snd = { n: n }; },
      frame: function (s, t) {
        var i = Math.floor(t * 10), sum = 0, n = 0;
        T.flock.forEach(function (f) {
          if (i < 1 || i >= f.x.length) return;
          var dx = f.x[i] - f.x[i - 1], dy = f.y[i] - f.y[i - 1];
          sum += Math.sqrt(dx * dx + dy * dy) * 10; n++;
        });
        if (n) set(s.snd.n.g.gain, Math.min(0.6, (sum / n) / 12), 0.1);
      },
      stop: function (s) { fadeStop([s.snd.n]); s.snd = null; }
    }
  };
  function soundStart(s) { var k = s.c.getAttribute('data-anim'); if (SOUND[k] && !s.snd) { audio(); SOUND[k].start(s); } }
  function soundStop(s) { var k = s.c.getAttribute('data-anim'); if (SOUND[k] && s.snd) SOUND[k].stop(s); }
  function soundFrame(s) { var k = s.c.getAttribute('data-anim'); if (soundOn && s.snd && SOUND[k]) SOUND[k].frame(s, s.t); }
  function setSound(on, Reveal) {
    soundOn = on;
    var cur = Reveal.getCurrentSlide(), el = document.getElementById('sound');
    states.forEach(function (s) { if (on && cur && cur.contains(s.c) && s.raf) soundStart(s); else soundStop(s); });
    if (el) el.textContent = on ? '♪ sound' : '';
  }

  var states = [];
  function state(c) {
    for (var i = 0; i < states.length; i++) if (states[i].c === c) return states[i];
    var s = setup(c), a = ANIMS[c.getAttribute('data-anim')];
    s.anim = a; s.speed = +(c.getAttribute('data-speed') || 1); a.init(s); states.push(s);
    return s;
  }
  function redraw(s) { clear(s); s.anim.draw(s, s.t); }
  function stop(s) { if (s.raf) cancelAnimationFrame(s.raf); s.raf = null; if (s.snd) soundStop(s); }
  function start(s) {
    stop(s); s.t = 0; clear(s);
    var dur = s.anim.duration(), t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = ((now - t0) / 1000) * s.speed;
      if (s.anim.loop && t > dur) { t0 = now; t = 0; clear(s); }
      s.t = Math.min(t, dur); s.anim.draw(s, s.t); soundFrame(s);
      if (t < dur || s.anim.loop) s.raf = requestAnimationFrame(frame);
    }
    s.raf = requestAnimationFrame(frame);
  }
  function finish(s) { stop(s); s.t = s.anim.duration(); redraw(s); }

  var revealRef = null;
  window.Standstill = {
    sound: function (on) { if (revealRef) setSound(on, revealRef); return soundOn; },   // also for a button or a test
    init: function (Reveal) {
      revealRef = Reveal;
      var all = Array.prototype.slice.call(document.querySelectorAll('canvas[data-anim]'));
      if (STATIC) {   // the PDF: the final frame of each slide, without the path in the corner
        all.forEach(function (c) { if (c.id === 'ambient') c.style.display = 'none'; else finish(state(c)); });
        return;
      }
      all.forEach(function (c) { if (c.getAttribute('data-anim') === 'ambient') start(state(c)); });
      function onSlide() {
        var cur = Reveal.getCurrentSlide();
        all.forEach(function (c) {
          if (c.getAttribute('data-anim') === 'ambient') return;
          var s = state(c);
          var waits = c.classList.contains('fragment') && !c.classList.contains('visible');   // a canvas that is a fragment starts on the click
          if (cur && cur.contains(c) && !waits) { if (!s.raf) start(s); } else { stop(s); if (waits) clear(s); }
        });
      }
      Reveal.on('ready', onSlide);
      Reveal.on('fragmentshown', function (e) { if (e.fragment && e.fragment.matches && e.fragment.matches('canvas[data-anim]')) start(state(e.fragment)); });
      Reveal.on('fragmenthidden', function (e) { if (e.fragment && e.fragment.matches && e.fragment.matches('canvas[data-anim]')) { var s = state(e.fragment); stop(s); clear(s); } });
      Reveal.on('slidechanged', function () { setSound(false, Reveal); onSlide(); });   // every slide starts silent
      Reveal.addKeyBinding({ keyCode: 76, key: 'L', description: 'Sound on/off for the animation' }, function () { setSound(!soundOn, Reveal); });
      document.addEventListener('themechange', function () { states.forEach(redraw); });
    }
  };
})();
