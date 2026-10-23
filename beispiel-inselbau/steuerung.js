/* Inselbau · steuerung.js · SPIEL.steuerung
   Tastatur, Maus, Gamepad, Touch. Klassisches Skript, keine Module. */
(function () {
  "use strict";
  window.SPIEL = window.SPIEL || {};

  var canvas = null;
  var bereit = false;
  var touchGeraet = false;

  // Gehaltene Zustände
  var tasten = {};            // key (klein) -> true
  var mausLinks = false;
  var mausPos = null;         // {x, y} in Canvas-Pixeln
  var mausAktiv = false;      // Maus über dem Canvas
  var touchKnopf = { links: false, rechts: false, springen: false };
  var touchModusSetzen = false;
  var weltTouchId = null;     // Identifier des Fingers auf der Welt
  var weltTouchPos = null;    // {x, y}
  var weltTouchHalten = false;

  // Flanken (bis zum nächsten zustand()-Aufruf)
  var fSetzen = false, fSpeichern = false, fPause = false;
  var fWechsel = 0, fDirekt = null;

  // Gamepad (Vorzustand für Flanken)
  var padVorher = [];

  function istEingabeFeld(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName.toUpperCase();
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
  }

  // ---------- Tastatur ----------
  var SPIEL_TASTEN = {
    "a": 1, "d": 1, "w": 1, " ": 1, "arrowleft": 1, "arrowright": 1, "arrowup": 1,
    "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "k": 1, "p": 1, "escape": 1
  };

  function beiTasteUnten(e) {
    if (istEingabeFeld(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = (e.key || "").toLowerCase();
    if (k === "spacebar") k = " ";
    if (!SPIEL_TASTEN[k]) return;
    e.preventDefault();
    tasten[k] = true;
    if (e.repeat) return;
    if (k >= "1" && k <= "6") fDirekt = parseInt(k, 10) - 1;
    else if (k === "k") fSpeichern = true;
    else if (k === "p" || k === "escape") fPause = true;
  }

  function beiTasteOben(e) {
    var k = (e.key || "").toLowerCase();
    if (k === "spacebar") k = " ";
    delete tasten[k];
  }

  function allesLoslassen() {
    tasten = {};
    mausLinks = false;
    touchKnopf.links = touchKnopf.rechts = touchKnopf.springen = false;
    weltTouchId = null;
    weltTouchPos = null;
    weltTouchHalten = false;
    markiereKnoepfe();
  }

  // ---------- Maus ----------
  function canvasPos(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var sx = r.width ? canvas.width / r.width : 1;
    var sy = r.height ? canvas.height / r.height : 1;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  function beiMausUnten(e) {
    if (touchGeraet && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    e.preventDefault();
    mausPos = canvasPos(e.clientX, e.clientY);
    mausAktiv = true;
    if (e.button === 0) mausLinks = true;
    else if (e.button === 2) fSetzen = true;
  }

  function beiMausBewegt(e) {
    if (touchGeraet && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    mausPos = canvasPos(e.clientX, e.clientY);
    mausAktiv = true;
  }

  function beiMausOben(e) {
    if (e.button === 0) mausLinks = false;
  }

  function beiMausRaus() {
    mausAktiv = false;
  }

  function beiRad(e) {
    e.preventDefault();
    if (e.deltaY > 0) fWechsel += 1;
    else if (e.deltaY < 0) fWechsel -= 1;
  }

  // ---------- Touch: Welt ----------
  function beiWeltTouchStart(e) {
    touchGeraet = true;
    e.preventDefault();
    if (weltTouchId !== null) return;
    var t = e.changedTouches[0];
    weltTouchId = t.identifier;
    weltTouchPos = canvasPos(t.clientX, t.clientY);
    if (touchModusSetzen) {
      fSetzen = true;
      weltTouchHalten = false;
    } else {
      weltTouchHalten = true;
    }
  }

  function finde(liste, id) {
    for (var i = 0; i < liste.length; i++) if (liste[i].identifier === id) return liste[i];
    return null;
  }

  function beiWeltTouchMove(e) {
    e.preventDefault();
    if (weltTouchId === null) return;
    var t = finde(e.changedTouches, weltTouchId);
    if (t) weltTouchPos = canvasPos(t.clientX, t.clientY);
  }

  function beiWeltTouchEnde(e) {
    e.preventDefault();
    if (weltTouchId === null) return;
    if (finde(e.changedTouches, weltTouchId)) {
      weltTouchId = null;
      weltTouchHalten = false;
      weltTouchPos = null;
    }
  }

  // ---------- Touch: Knöpfe ----------
  function markiereKnoepfe() {
    var map = {
      "touch-links": touchKnopf.links,
      "touch-rechts": touchKnopf.rechts,
      "touch-springen": touchKnopf.springen
    };
    for (var id in map) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("aktiv", !!map[id]);
    }
    var m = document.getElementById("touch-modus");
    if (m) {
      m.classList.toggle("setzen", touchModusSetzen);
      m.textContent = touchModusSetzen ? "\u{1F9F1}" : "⛏";
      m.setAttribute("aria-label", touchModusSetzen ? "Modus: Setzen" : "Modus: Abbauen");
    }
  }

  function halteKnopf(id, name) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.touchAction = "none";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.webkitTouchCallout = "none";
    var aktiveZeiger = {};
    function an(e) {
      if (e.cancelable) e.preventDefault();
      touchGeraet = touchGeraet || e.pointerType === "touch";
      aktiveZeiger[e.pointerId] = true;
      touchKnopf[name] = true;
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      markiereKnoepfe();
    }
    function aus(e) {
      if (e.cancelable) e.preventDefault();
      delete aktiveZeiger[e.pointerId];
      if (Object.keys(aktiveZeiger).length === 0) touchKnopf[name] = false;
      markiereKnoepfe();
    }
    el.addEventListener("pointerdown", an);
    el.addEventListener("pointerup", aus);
    el.addEventListener("pointercancel", aus);
    el.addEventListener("lostpointercapture", aus);
    blockiereGesten(el);
  }

  function blockiereGesten(el) {
    var stopp = function (e) { if (e.cancelable) e.preventDefault(); };
    el.addEventListener("touchstart", function (e) { touchGeraet = true; stopp(e); }, { passive: false });
    el.addEventListener("touchmove", stopp, { passive: false });
    el.addEventListener("touchend", stopp, { passive: false });
    el.addEventListener("touchcancel", stopp, { passive: false });
    el.addEventListener("contextmenu", stopp);
    el.addEventListener("dblclick", stopp);
    el.addEventListener("gesturestart", stopp);
  }

  function haltModusKnopf() {
    var el = document.getElementById("touch-modus");
    if (!el) return;
    el.style.touchAction = "none";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.addEventListener("pointerdown", function (e) {
      if (e.cancelable) e.preventDefault();
      touchModusSetzen = !touchModusSetzen;
      markiereKnoepfe();
    });
    blockiereGesten(el);
    markiereKnoepfe();
  }

  // ---------- Gamepad ----------
  var STICK_TOT = 0.3;
  var STICK_ZIEL_TOT = 0.25;

  function holePad() {
    if (!navigator.getGamepads) return null;
    var liste = navigator.getGamepads();
    for (var i = 0; i < liste.length; i++) {
      if (liste[i] && liste[i].connected) return liste[i];
    }
    return null;
  }

  function knopf(pad, i) {
    var b = pad.buttons[i];
    return !!(b && (b.pressed || b.value > 0.5));
  }

  function liesPad() {
    var r = { links: false, rechts: false, springen: false, abbauen: false,
              setzenFlanke: false, wechsel: 0, pause: false, rel: null };
    var pad = holePad();
    if (!pad) { padVorher = []; return r; }

    var ax = pad.axes[0] || 0;
    r.links = ax < -STICK_TOT || knopf(pad, 14);
    r.rechts = ax > STICK_TOT || knopf(pad, 15);
    r.springen = knopf(pad, 0) || knopf(pad, 12);
    r.abbauen = knopf(pad, 7);

    var jetzt = [];
    for (var i = 0; i < pad.buttons.length; i++) jetzt[i] = knopf(pad, i);
    function flanke(i) { return !!jetzt[i] && !padVorher[i]; }
    if (flanke(6)) r.setzenFlanke = true;
    if (flanke(4)) r.wechsel -= 1;
    if (flanke(5)) r.wechsel += 1;
    if (flanke(9)) r.pause = true;
    padVorher = jetzt;

    var rx = pad.axes[2] || 0, ry = pad.axes[3] || 0;
    var len = Math.sqrt(rx * rx + ry * ry);
    if (len > STICK_ZIEL_TOT) {
      var reichweite = (SPIEL.konfig && SPIEL.konfig.REICHWEITE) || 5;
      var f = Math.min(1, len);
      r.rel = { dx: (rx / len) * f * reichweite, dy: (ry / len) * f * reichweite };
    }
    return r;
  }

  // ---------- Öffentliche Schnittstelle ----------
  function init(c) {
    if (bereit) return;
    canvas = c;
    bereit = true;
    touchGeraet = touchGeraet || ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

    window.addEventListener("keydown", beiTasteUnten);
    window.addEventListener("keyup", beiTasteOben);
    window.addEventListener("blur", allesLoslassen);
    document.addEventListener("visibilitychange", function () { if (document.hidden) allesLoslassen(); });

    canvas.addEventListener("mousedown", beiMausUnten);
    canvas.addEventListener("mousemove", beiMausBewegt);
    canvas.addEventListener("mouseleave", beiMausRaus);
    window.addEventListener("mouseup", beiMausOben);
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    canvas.addEventListener("wheel", beiRad, { passive: false });

    canvas.style.touchAction = "none";
    canvas.addEventListener("touchstart", beiWeltTouchStart, { passive: false });
    canvas.addEventListener("touchmove", beiWeltTouchMove, { passive: false });
    canvas.addEventListener("touchend", beiWeltTouchEnde, { passive: false });
    canvas.addEventListener("touchcancel", beiWeltTouchEnde, { passive: false });

    halteKnopf("touch-links", "links");
    halteKnopf("touch-rechts", "rechts");
    halteKnopf("touch-springen", "springen");
    haltModusKnopf();
  }

  function zustand() {
    var pad = liesPad();

    var wechsel = fWechsel + pad.wechsel;
    wechsel = wechsel > 0 ? 1 : (wechsel < 0 ? -1 : 0);

    var zeiger = null;
    if (weltTouchPos) {
      zeiger = { x: weltTouchPos.x, y: weltTouchPos.y, aktiv: true };
    } else if (mausPos && !pad.rel) {
      zeiger = { x: mausPos.x, y: mausPos.y, aktiv: mausAktiv };
    }

    var z = {
      links: !!(tasten["a"] || tasten["arrowleft"] || touchKnopf.links || pad.links),
      rechts: !!(tasten["d"] || tasten["arrowright"] || touchKnopf.rechts || pad.rechts),
      springen: !!(tasten["w"] || tasten[" "] || tasten["arrowup"] || touchKnopf.springen || pad.springen),
      abbauenGehalten: !!(mausLinks || weltTouchHalten || pad.abbauen),
      setzenGedrueckt: !!(fSetzen || pad.setzenFlanke),
      zeiger: zeiger,
      zeigerRelativ: pad.rel,
      auswahlWechsel: wechsel,
      auswahlDirekt: fDirekt,
      speichern: fSpeichern,
      pause: !!(fPause || pad.pause)
    };

    // Flanken verbrauchen
    fSetzen = false; fSpeichern = false; fPause = false;
    fWechsel = 0; fDirekt = null;
    return z;
  }

  function istTouch() {
    return !!touchGeraet;
  }

  SPIEL.steuerung = { init: init, zustand: zustand, istTouch: istTouch };
})();
