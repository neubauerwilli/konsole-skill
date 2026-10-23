/* ton.js - SPIEL.ton: synthetische Klaenge und ruhige Musikschleife (Web Audio API) */
(function () {
  'use strict';
  var SPIEL = window.SPIEL = window.SPIEL || {};

  var ctx = null;
  var master = null;      // Gesamtlautstaerke
  var sfxBus = null;
  var musikBus = null;
  var rauschen = null;    // vorberechneter Rauschpuffer
  var lautstaerkeWert = 0.8;
  var musikAn = false;
  var musikTimer = null;
  var naechsteZeit = 0;
  var schrittNr = 0;
  var letzterSchritt = 0;
  var schrittWechsel = 0;

  function bereit() { return !!ctx; }

  function init() {
    if (ctx) {
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = lautstaerkeWert;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      musikBus = ctx.createGain();
      musikBus.gain.value = 0;
      musikBus.connect(master);
      // Rauschpuffer, eine Sekunde
      var len = ctx.sampleRate;
      rauschen = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = rauschen.getChannelData(0);
      var s = 12345;
      for (var i = 0; i < len; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        d[i] = (s / 4294967296) * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      if (musikAn) starteMusik();
    } catch (e) {
      ctx = null;
    }
  }

  // ---------- Bausteine ----------
  function ton(bus, typ, f0, f1, t0, dauer, spitze, attack) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dauer);
    attack = attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(spitze, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    o.connect(g); g.connect(bus);
    o.start(t0);
    o.stop(t0 + dauer + 0.02);
  }

  function rausch(bus, t0, dauer, spitze, filtTyp, f0, f1, q) {
    var src = ctx.createBufferSource();
    src.buffer = rauschen;
    src.loop = true;
    var fl = ctx.createBiquadFilter();
    fl.type = filtTyp;
    fl.Q.value = q || 1;
    fl.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dauer);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(spitze, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
    src.connect(fl); fl.connect(g); g.connect(bus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dauer + 0.02);
  }

  // ---------- Effekte ----------
  var effekte = {
    schritt: function (t) {
      // leichte Variation, damit es nicht maschinell klingt
      var v = 0.85 + Math.random() * 0.3;
      rausch(sfxBus, t, 0.07, 0.16, 'bandpass', 700 * v, 300 * v, 1.2);
      ton(sfxBus, 'sine', 110 * v, 70 * v, t, 0.06, 0.12);
    },
    sprung: function (t) {
      ton(sfxBus, 'triangle', 260, 620, t, 0.16, 0.2);
      rausch(sfxBus, t, 0.08, 0.05, 'highpass', 2000, 2000, 0.7);
    },
    abbauen: function (t) {
      var v = 0.9 + Math.random() * 0.2;
      rausch(sfxBus, t, 0.14, 0.3, 'lowpass', 1800 * v, 300, 0.9);
      ton(sfxBus, 'square', 150 * v, 70, t, 0.1, 0.12);
      ton(sfxBus, 'sine', 90, 45, t, 0.12, 0.25);
    },
    setzen: function (t) {
      ton(sfxBus, 'sine', 180, 80, t, 0.12, 0.35);
      ton(sfxBus, 'triangle', 520, 380, t, 0.06, 0.12);
      rausch(sfxBus, t, 0.05, 0.1, 'bandpass', 1200, 800, 1.5);
    },
    speichern: function (t) {
      ton(sfxBus, 'sine', 659.25, 659.25, t, 0.28, 0.2, 0.01);
      ton(sfxBus, 'sine', 987.77, 987.77, t + 0.11, 0.4, 0.2, 0.01);
      ton(sfxBus, 'sine', 1318.5, 1318.5, t + 0.11, 0.4, 0.05, 0.01);
    },
    klick: function (t) {
      ton(sfxBus, 'square', 900, 500, t, 0.04, 0.1);
      rausch(sfxBus, t, 0.02, 0.06, 'highpass', 3000, 3000, 0.7);
    }
  };

  function spiele(name) {
    if (!bereit()) return;
    try {
      var f = effekte[name];
      if (!f) return;
      if (ctx.state === 'suspended') ctx.resume();
      f(ctx.currentTime + 0.005);
    } catch (e) {}
  }

  // ---------- Musik ----------
  // C-Dur-Pentatonik, ruhig, 72 BPM. Vier Takte Akkordfolge: C, Am, F, G
  var BPM = 72;
  var ACHTEL = 60 / BPM / 2;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var AKKORDE = [
    { bass: 48, pad: [60, 64, 67] },   // C
    { bass: 45, pad: [57, 60, 64] },   // Am
    { bass: 41, pad: [57, 60, 65] },   // F
    { bass: 43, pad: [55, 59, 62] }    // G
  ];
  // Melodie: 32 Achtel (4 Takte), 0 = Pause, sonst MIDI-Note
  var MELODIE = [
    76, 0, 0, 72, 0, 74, 0, 0,
    72, 0, 0, 69, 0, 0, 72, 0,
    69, 0, 72, 0, 0, 74, 0, 72,
    71, 0, 0, 74, 0, 0, 0, 0
  ];

  function planeSchritt(nr, t) {
    var takt = Math.floor(nr / 8) % 4;
    var pos = nr % 8;
    var ak = AKKORDE[takt];
    if (pos === 0) {
      // Pad: weiche Sinus-Toene, ueber den Takt
      var dauer = ACHTEL * 8;
      for (var i = 0; i < ak.pad.length; i++) {
        ton(musikBus, 'sine', hz(ak.pad[i]), hz(ak.pad[i]), t, dauer, 0.05, dauer * 0.35);
      }
      ton(musikBus, 'triangle', hz(ak.bass), hz(ak.bass), t, ACHTEL * 4, 0.12, 0.05);
    }
    if (pos === 4) {
      ton(musikBus, 'triangle', hz(ak.bass + 7), hz(ak.bass + 7), t, ACHTEL * 3, 0.07, 0.05);
    }
    var n = MELODIE[nr % 32];
    if (n) {
      ton(musikBus, 'triangle', hz(n), hz(n), t, ACHTEL * 3.5, 0.09, 0.02);
      ton(musikBus, 'sine', hz(n + 12), hz(n + 12), t, ACHTEL * 2, 0.025, 0.02);
    }
  }

  function takt() {
    if (!bereit() || !musikAn) return;
    try {
      // Falls der Tab lange schlief, nicht aufholen
      if (naechsteZeit < ctx.currentTime - 0.5) naechsteZeit = ctx.currentTime + 0.05;
      while (naechsteZeit < ctx.currentTime + 0.4) {
        planeSchritt(schrittNr, naechsteZeit);
        naechsteZeit += ACHTEL;
        schrittNr = (schrittNr + 1) % 32;
      }
    } catch (e) {}
  }

  function starteMusik() {
    if (!bereit()) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      musikBus.gain.cancelScheduledValues(t);
      musikBus.gain.setValueAtTime(musikBus.gain.value, t);
      musikBus.gain.linearRampToValueAtTime(0.55, t + 2.0);
      if (!musikTimer) {
        naechsteZeit = t + 0.1;
        schrittNr = 0;
        musikTimer = setInterval(takt, 100);
      }
      takt();
    } catch (e) {}
  }

  function stoppeMusik() {
    if (!bereit()) return;
    try {
      var t = ctx.currentTime;
      musikBus.gain.cancelScheduledValues(t);
      musikBus.gain.setValueAtTime(musikBus.gain.value, t);
      musikBus.gain.linearRampToValueAtTime(0, t + 0.8);
    } catch (e) {}
    if (musikTimer) { clearInterval(musikTimer); musikTimer = null; }
  }

  function musik(an) {
    musikAn = !!an;
    if (!bereit()) return;   // wird bei init() nachgeholt
    if (musikAn) starteMusik(); else stoppeMusik();
  }

  function lautstaerke(wert) {
    var w = Number(wert);
    if (isNaN(w)) return;
    lautstaerkeWert = Math.max(0, Math.min(1, w));
    if (!bereit()) return;
    try { master.gain.setTargetAtTime(lautstaerkeWert, ctx.currentTime, 0.02); } catch (e) {}
  }

  SPIEL.ton = {
    init: init,
    spiele: spiele,
    musik: musik,
    lautstaerke: lautstaerke
  };
})();
