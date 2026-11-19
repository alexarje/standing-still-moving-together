/* The atlas of the year: twelve round images; point at one and the day's sound plays and its numbers
   show. English port of the DNVA deck's lib/atlas.js, 16 November 2026. The data are window.ATLAS from
   images/atlas.js (built by the DNVA deck's tools/make_atlas.py, texts in English by
   tools/make_atlas_en.py); the sound is audio/atlas/NNN.mp3 and loads when the slide is shown. A click
   or a tap does the same as pointing, for touch screens. Everything stops when the slide is left. */
(function () {
  'use strict';
  var grid = document.getElementById('atlas');
  if (!grid || !window.ATLAS) return;
  var facts = document.getElementById('atlas-facts');
  var audios = {}, current = null;

  function fmt(n) { return String(n); }   // English form: decimal point

  function show(d) {
    facts.innerHTML =
      '<b>' + d.room + '</b>' + (d.place ? ', ' + d.place : '') + ' · ' + fmt(d.level).replace('-', '−') + ' dB · ' +
      fmt(d.qom) + ' mm/s²' + (d.hr ? ' · pulse ' + d.hr : '') +
      '<br><i>' + d.note + '</i>';
    facts.classList.add('on');
  }

  function stop() {
    if (current) { current.pause(); current.currentTime = 0; current = null; }
    grid.querySelectorAll('figure.on').forEach(function (f) { f.classList.remove('on'); });
  }

  function start(fig, d) {
    if (current && current.dataset.day === String(d.day)) return;
    stop();
    var a = audios[d.day];
    if (!a) {
      a = new Audio('audio/atlas/' + String(d.day).padStart(3, '0') + '.mp3');
      a.loop = true; a.preload = 'auto'; a.dataset.day = String(d.day);
      audios[d.day] = a;
    }
    current = a;
    a.play().catch(function () {});
    fig.classList.add('on');
    show(d);
  }

  window.ATLAS.forEach(function (d) {
    var fig = document.createElement('figure');
    fig.innerHTML = '<img src="images/atlas/' + String(d.day).padStart(3, '0') + '.png" alt="Day ' + d.day + ', ' + d.room + '">' +
                    '<figcaption>' + d.room + '</figcaption>';
    fig.addEventListener('mouseenter', function () { start(fig, d); });
    fig.addEventListener('click', function (e) { e.preventDefault(); if (current && current.dataset.day === String(d.day)) { stop(); facts.classList.remove('on'); } else start(fig, d); });
    grid.appendChild(fig);
  });
  grid.addEventListener('mouseleave', function () { stop(); });

  if (window.Reveal) {
    Reveal.on('slidechanged', function () { stop(); facts.classList.remove('on'); });
    Reveal.on('slidechanged', function (e) {      // load the sounds when the atlas is shown, so the first point does not wait
      if (e.currentSlide && e.currentSlide.contains(grid)) {
        window.ATLAS.forEach(function (d) {
          if (!audios[d.day]) {
            var a = new Audio('audio/atlas/' + String(d.day).padStart(3, '0') + '.mp3');
            a.loop = true; a.preload = 'auto'; a.dataset.day = String(d.day); audios[d.day] = a;
          }
        });
      }
    });
  }
  window.Atlas = { stop: stop, count: window.ATLAS.length };
})();
