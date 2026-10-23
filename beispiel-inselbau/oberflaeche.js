(function () {
  'use strict';
  window.SPIEL = window.SPIEL || {};

  var canvas, startMenue, pausenMenue, meldungEl, touchEl, modusKnopf;
  var meldungTimer = 0, pausenWaechter = 0;
  var gestartet = false, initEinmal = false;
  var lautstaerke = 0.6;

  function el(id) { return document.getElementById(id); }
  function sicher(fn) { try { return fn(); } catch (e) { return undefined; } }
  function hat(pfad) {
    var o = window.SPIEL;
    for (var i = 0; i < pfad.length; i++) {
      if (!o || typeof o[pfad[i]] === 'undefined') return false;
      o = o[pfad[i]];
    }
    return true;
  }
  function rufe(pfad, args) {
    if (!hat(pfad)) return undefined;
    var o = window.SPIEL, ctx = null;
    for (var i = 0; i < pfad.length; i++) { ctx = o; o = o[pfad[i]]; }
    if (typeof o !== 'function') return undefined;
    return sicher(function () { return o.apply(ctx, args || []); });
  }
  function verstecke(e) { if (e) e.hidden = true; }
  function zeige(e) { if (e) e.hidden = false; }
  function klick() { rufe(['ton', 'spiele'], ['klick']); }
  function entfokussiere(b) { if (b && b.blur) b.blur(); }

  function anpassen() {
    if (!canvas) return;
    var b = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    if (canvas.width !== b) canvas.width = b;
    if (canvas.height !== h) canvas.height = h;
    canvas.style.width = b + 'px';
    canvas.style.height = h + 'px';
    var c = canvas.getContext('2d');
    if (c) c.imageSmoothingEnabled = false;
  }

  function startmenueAktualisieren() {
    var weiter = el('knopf-weiter');
    if (weiter) weiter.hidden = !rufe(['speichern', 'vorhanden']);
  }

  function zeigeStartmenue() {
    verstecke(pausenMenue);
    stoppeWaechter();
    verstecke(touchEl);
    startmenueAktualisieren();
    zeige(startMenue);
  }

  function istTouch() { return !!rufe(['steuerung', 'istTouch']); }

  function touchAktualisieren() {
    if (!touchEl) return;
    touchEl.hidden = !(gestartet && istTouch());
  }

  function starte(laden) {
    rufe(['ton', 'init']);
    rufe(['ton', 'lautstaerke'], [lautstaerke]);
    rufe(['ton', 'musik'], [true]);
    if (!initEinmal) {
      rufe(['steuerung', 'init'], [canvas]);
      rufe(['grafik', 'init']);
      initEinmal = true;
    }
    // Falls ein Pausenstand aus einer früheren Runde hängt
    if (rufe(['spiel', 'istPausiert'])) rufe(['spiel', 'pause'], [false]);
    rufe(['spiel', 'start'], [{ laden: !!laden }]);
    gestartet = true;
    verstecke(startMenue);
    verstecke(pausenMenue);
    touchAktualisieren();
  }

  function stoppeWaechter() {
    if (pausenWaechter) { clearInterval(pausenWaechter); pausenWaechter = 0; }
  }

  // Schließt das Pausenmenü auch dann, wenn per Esc/Start fortgesetzt wird.
  function starteWaechter() {
    stoppeWaechter();
    pausenWaechter = setInterval(function () {
      if (pausenMenue.hidden) { stoppeWaechter(); return; }
      var p = rufe(['spiel', 'istPausiert']);
      if (p === false) { verstecke(pausenMenue); stoppeWaechter(); }
    }, 150);
  }

  function speichern() {
    var ok;
    if (hat(['spiel', 'speichere'])) ok = rufe(['spiel', 'speichere']);
    else if (hat(['spiel', 'speichern'])) ok = rufe(['spiel', 'speichern']);
    else {
      // Ersatz: Taste K an die Steuerung schicken
      sicher(function () {
        ['keydown', 'keyup'].forEach(function (t) {
          var ev = new KeyboardEvent(t, { key: 'k', code: 'KeyK', keyCode: 75, which: 75, bubbles: true });
          window.dispatchEvent(ev);
        });
      });
      ok = undefined;
    }
    if (ok === false) zeigeMeldung('Speichern ging nicht');
    else rufe(['ton', 'spiele'], ['speichern']);
  }

  function vollbildAktiv() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function vollbildUmschalten() {
    var de = document.documentElement;
    try {
      if (vollbildAktiv()) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) ex.call(document);
        return;
      }
      var rq = de.requestFullscreen || de.webkitRequestFullscreen || de.msRequestFullscreen;
      if (rq) {
        var p = rq.call(de);
        if (p && p.catch) p.catch(function () { zeigeMeldung('Vollbild nicht möglich'); });
      } else {
        // Fallback (z. B. iPhone): Hinweis, Leisten per Scroll ausblenden
        zeigeMeldung('Vollbild: Seite zum Home-Bildschirm hinzufügen');
        sicher(function () { window.scrollTo(0, 1); });
      }
    } catch (e) {
      zeigeMeldung('Vollbild nicht möglich');
    }
  }
  function vollbildText() {
    var k = el('knopf-vollbild');
    if (k) k.textContent = vollbildAktiv() ? 'Vollbild beenden' : 'Vollbild';
    setTimeout(anpassen, 50);
  }

  function zeigePause() {
    zeige(pausenMenue);
    var r = el('regler-lautstaerke');
    if (r) r.value = String(lautstaerke);
    vollbildText();
    starteWaechter();
    var f = el('knopf-fortsetzen');
    if (f && f.focus) sicher(function () { f.focus({ preventScroll: true }); });
  }

  function zeigeMeldung(text) {
    if (!meldungEl) return;
    meldungEl.textContent = String(text == null ? '' : text);
    meldungEl.hidden = false;
    // Neustart der Animation
    meldungEl.classList.remove('sichtbar');
    void meldungEl.offsetWidth;
    meldungEl.classList.add('sichtbar');
    clearTimeout(meldungTimer);
    meldungTimer = setTimeout(function () {
      meldungEl.hidden = true;
      meldungEl.classList.remove('sichtbar');
    }, 2000);
  }

  function bindeKnopf(id, fn) {
    var b = el(id);
    if (!b) return;
    b.addEventListener('click', function (e) {
      e.preventDefault();
      klick();
      fn();
      entfokussiere(b); // damit Leertaste im Spiel nicht den Knopf drückt
    });
  }

  function touchSchutz() {
    if (!touchEl) return;
    var stop = function (e) { if (e.cancelable) e.preventDefault(); };
    touchEl.addEventListener('contextmenu', stop);
    touchEl.addEventListener('touchstart', stop, { passive: false });
    touchEl.addEventListener('touchmove', stop, { passive: false });
    modusKnopf = el('touch-modus');
    /* Symbol und Klasse des Modus-Knopfs setzt steuerung.js (Zusammenbau 23.10.) */
  }

  function init() {
    canvas = el('spielfeld');
    startMenue = el('startmenue');
    pausenMenue = el('pausenmenue');
    meldungEl = el('meldung');
    touchEl = el('touch-steuerung');

    anpassen();
    window.addEventListener('resize', anpassen);
    window.addEventListener('orientationchange', function () { setTimeout(anpassen, 100); });
    document.addEventListener('fullscreenchange', vollbildText);
    document.addEventListener('webkitfullscreenchange', vollbildText);
    if (canvas) canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    bindeKnopf('knopf-neu', function () { starte(false); });
    bindeKnopf('knopf-weiter', function () { starte(true); });
    bindeKnopf('knopf-fortsetzen', function () {
      verstecke(pausenMenue);
      stoppeWaechter();
      rufe(['spiel', 'pause'], [false]);
    });
    bindeKnopf('knopf-speichern', speichern);
    bindeKnopf('knopf-vollbild', vollbildUmschalten);
    bindeKnopf('knopf-startmenue', function () {
      speichern();
      rufe(['ton', 'musik'], [false]);
      if (hat(['spiel', 'stop'])) rufe(['spiel', 'stop']);
      zeigeStartmenue();
    });

    var regler = el('regler-lautstaerke');
    if (regler) {
      lautstaerke = parseFloat(regler.value) || lautstaerke;
      regler.addEventListener('input', function () {
        lautstaerke = Math.max(0, Math.min(1, parseFloat(regler.value) || 0));
        rufe(['ton', 'lautstaerke'], [lautstaerke]);
      });
      regler.addEventListener('change', function () { entfokussiere(regler); });
    }

    touchSchutz();
    zeigeStartmenue();
  }

  SPIEL.oberflaeche = {
    zeigePause: zeigePause,
    zeigeMeldung: zeigeMeldung,
    zeigeStartmenue: zeigeStartmenue,
    anpassen: anpassen
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
