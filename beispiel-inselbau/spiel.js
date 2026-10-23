/* Inselbau · spiel.js · SPIEL.spiel
   Spiel-Logik: Schleife (fester Zeitschritt), Kamera, Ziel, Abbauen, Setzen, HUD. */
(function () {
  'use strict';
  window.SPIEL = window.SPIEL || {};
  var S = window.SPIEL;

  var DT = 1 / 60;
  var TAGDAUER = 300; // Sekunden von 0 bis 1
  var ZIEL_HOLZ = 10, ZIEL_STEIN = 5;

  var canvas = null, ctx = null;
  var welt = null, koerper = null;
  var kam = { x: 0, y: 0 };
  var bestand = {};
  var gesammelt = { holz: 0, stein: 0 };
  var auswahl = 0;
  var laeuft = false, pausiert = false;
  var rafId = 0, letzteZeit = 0, akku = 0;
  var spielzeit = 60; // Sekunden, Start am frühen Vormittag
  var laufPhase = 0, letzteSchrittHaelfte = 0;
  var abbau = { x: -1, y: -1, fortschritt: 0 };
  var ziel = null; // { x, y, erreichbar }
  var letzterZeiger = null;
  var autoRest = 0;
  var zielMeldet = false;

  function K() { return (S.konfig && S.konfig.KACHEL) || 32; }
  function B() { return S.konfig.BLOCK; }

  function aufruf(bereich, name) {
    var b = S[bereich];
    if (b && typeof b[name] === 'function') {
      try { return b[name].apply(b, Array.prototype.slice.call(arguments, 2)); } catch (e) { return undefined; }
    }
    return undefined;
  }
  function ton(name) { aufruf('ton', 'spiele', name); }
  function meldung(text) { aufruf('oberflaeche', 'zeigeMeldung', text); }

  /* ---------- Welt-Zugriff mit Ersatz ---------- */
  function hole(x, y) {
    if (S.welt && typeof S.welt.hole === 'function') return S.welt.hole(welt, x, y);
    if (x < 0 || y < 0 || x >= welt.breite || y >= welt.hoehe) return 0;
    return welt.bloecke[y * welt.breite + x];
  }
  function setze(x, y, id) {
    if (S.welt && typeof S.welt.setze === 'function') return S.welt.setze(welt, x, y, id);
    if (x < 0 || y < 0 || x >= welt.breite || y >= welt.hoehe) return false;
    welt.bloecke[y * welt.breite + x] = id; return true;
  }
  function istFest(id) {
    if (S.welt && typeof S.welt.istFest === 'function') return S.welt.istFest(id);
    return id !== 0 && id !== 7;
  }
  function imWelt(x, y) { return x >= 0 && y >= 0 && x < welt.breite && y < welt.hoehe; }

  /* ---------- Start / Neuaufbau ---------- */
  function neueWelt() {
    var w = null;
    if (S.welt && typeof S.welt.erzeuge === 'function') {
      try { w = S.welt.erzeuge(S.konfig.SEED); } catch (e) { w = null; }
    }
    if (!w) {
      // Notfall: flache Platte, damit nichts abstürzt
      var bw = S.konfig.BREITE, bh = S.konfig.HOEHE;
      w = { breite: bw, hoehe: bh, bloecke: new Uint8Array(bw * bh), spawn: { x: bw >> 1, y: 30 } };
      for (var x = 0; x < bw; x++) for (var y = 30; y < bh; y++) w.bloecke[y * bw + x] = y === 30 ? 1 : (y < 34 ? 2 : 3);
    }
    return w;
  }

  function startBestand() {
    var b = {}, l = S.konfig.LEISTE || [];
    for (var i = 0; i < l.length; i++) b[l[i]] = 10;
    return b;
  }

  function setzeSpieler(x, y) {
    if (S.physik && typeof S.physik.neuerKoerper === 'function') koerper = S.physik.neuerKoerper(x, y);
    else koerper = { x: x, y: y, vx: 0, vy: 0, breite: 0.75, hoehe: 1.75, amBoden: false, blickRechts: true };
  }

  function spawnSpieler() {
    var sp = welt.spawn || { x: welt.breite >> 1, y: 20 };
    // zwei Kacheln über dem Spawn starten, die Figur fällt sanft auf den Boden
    setzeSpieler(sp.x + 0.125, sp.y - 2.75);
  }

  function snapKamera() {
    var vw = canvas.width, vh = canvas.height;
    var z = kameraZiel(vw, vh);
    kam.x = z.x; kam.y = z.y;
  }

  function start(optionen) {
    optionen = optionen || {};
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    canvas = document.getElementById('spielfeld');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    var z = null;
    if (optionen.laden) z = aufruf('speichern', 'lade');
    if (z && z.welt && z.welt.bloecke) {
      welt = z.welt;
      bestand = z.bestand || startBestand();
      auswahl = typeof z.auswahl === 'number' ? z.auswahl : 0;
      gesammelt = z.gesammelt || { holz: 0, stein: 0 };
      if (z.spieler && typeof z.spieler.x === 'number') setzeSpieler(z.spieler.x, z.spieler.y);
      else spawnSpieler();
    } else {
      welt = neueWelt();
      bestand = startBestand();
      auswahl = 0;
      gesammelt = { holz: 0, stein: 0 };
      spawnSpieler();
    }
    pausiert = false; zielMeldet = false;
    abbau.fortschritt = 0; ziel = null; letzterZeiger = null;
    akku = 0; autoRest = S.konfig.AUTOSPEICHERN_MS || 30000;
    laufPhase = 0; letzteSchrittHaelfte = 0;
    snapKamera();
    laeuft = true;
    letzteZeit = 0;
    rafId = requestAnimationFrame(schleife);
  }

  /* ---------- Pause ---------- */
  function pause(an) {
    an = !!an;
    if (an === pausiert) return;
    pausiert = an;
    if (an) { aufruf('oberflaeche', 'zeigePause'); }
    else { letzteZeit = 0; akku = 0; }
  }
  function istPausiert() { return pausiert; }

  /* ---------- Speichern ---------- */
  function speichern(mitMeldung) {
    if (!welt || !koerper) return false;
    var ok = aufruf('speichern', 'speichere', {
      welt: welt,
      spieler: { x: koerper.x, y: koerper.y },
      auswahl: auswahl,
      bestand: bestand,
      gesammelt: gesammelt
    });
    if (mitMeldung) {
      if (ok) { ton('speichern'); meldung('Gespeichert'); }
      else meldung('Speichern nicht möglich');
    }
    return !!ok;
  }

  /* ---------- Kamera ---------- */
  function kameraZiel(vw, vh) {
    var k = K();
    var cx = (koerper.x + koerper.breite / 2) * k - vw / 2;
    var cy = (koerper.y + koerper.hoehe / 2) * k - vh / 2;
    var wb = welt.breite * k, wh = welt.hoehe * k;
    cx = wb <= vw ? (wb - vw) / 2 : Math.max(0, Math.min(wb - vw, cx));
    cy = wh <= vh ? (wh - vh) / 2 : Math.max(0, Math.min(wh - vh, cy));
    return { x: cx, y: cy };
  }
  function kameraSchritt(dt) {
    var z = kameraZiel(canvas.width, canvas.height);
    var f = 1 - Math.exp(-6 * dt);
    kam.x += (z.x - kam.x) * f;
    kam.y += (z.y - kam.y) * f;
  }

  /* ---------- Simulation ---------- */
  function simSchritt(eing) {
    var res = null;
    if (S.physik && typeof S.physik.schritt === 'function') {
      try { res = S.physik.schritt(koerper, welt, DT, eing); } catch (e) { res = null; }
    } else {
      var v = (eing.rechts ? 1 : 0) - (eing.links ? 1 : 0);
      koerper.x += v * 5 * DT;
      if (v) koerper.blickRechts = v > 0;
      res = { gelaufen: !!v, gelandet: false, gesprungen: false };
    }
    res = res || {};
    // Weltgrenzen
    var maxX = welt.breite - koerper.breite;
    if (koerper.x < 0) { koerper.x = 0; koerper.vx = 0; }
    if (koerper.x > maxX) { koerper.x = maxX; koerper.vx = 0; }
    if (koerper.y > welt.hoehe + 8) { spawnSpieler(); koerper.vy = 0; }

    // Laufanimation und Schritte
    if (koerper.amBoden && res.gelaufen) {
      laufPhase = (laufPhase + DT * 1.8) % 1;
      var h = laufPhase < 0.5 ? 0 : 1;
      if (h !== letzteSchrittHaelfte) { letzteSchrittHaelfte = h; ton('schritt'); }
    } else if (!res.gelaufen) {
      laufPhase = 0;
    }
    if (res.gesprungen) ton('sprung');
    kameraSchritt(DT);
  }

  /* ---------- Ziel ---------- */
  function berechneZiel(zust) {
    var k = K();
    var tx, ty, hat = false;
    var zg = zust && zust.zeiger;
    if (zg && zg.aktiv !== false) {
      tx = Math.floor((zg.x + kam.x) / k);
      ty = Math.floor((zg.y + kam.y) / k);
      letzterZeiger = { x: zg.x, y: zg.y };
      hat = true;
    } else if (zust && zust.zeigerRelativ) {
      tx = Math.floor(koerper.x + koerper.breite / 2 + zust.zeigerRelativ.dx);
      ty = Math.floor(koerper.y + koerper.hoehe / 2 + zust.zeigerRelativ.dy);
      hat = true;
    } else if (zust && zust.setzenGedrueckt && letzterZeiger) {
      tx = Math.floor((letzterZeiger.x + kam.x) / k);
      ty = Math.floor((letzterZeiger.y + kam.y) / k);
      hat = true;
    }
    if (!hat || !imWelt(tx, ty)) return null;
    var dx = tx + 0.5 - (koerper.x + koerper.breite / 2);
    var dy = ty + 0.5 - (koerper.y + koerper.hoehe / 2);
    var erreichbar = Math.sqrt(dx * dx + dy * dy) <= (S.konfig.REICHWEITE || 5);
    return { x: tx, y: ty, erreichbar: erreichbar };
  }

  function ueberlappt(bx, by) {
    if (S.physik && typeof S.physik.ueberlappt === 'function') {
      try { return !!S.physik.ueberlappt(koerper, bx, by); } catch (e) { /* weiter */ }
    }
    return koerper.x < bx + 1 && koerper.x + koerper.breite > bx &&
           koerper.y < by + 1 && koerper.y + koerper.hoehe > by;
  }

  function abbauZeit(id) {
    var b = B();
    return (id === b.STEIN || id === b.ERZ) ? 0.8 : 0.4;
  }

  function verarbeiteAbbau(zust, dt) {
    var b = B();
    var gehalten = zust && zust.abbauenGehalten;
    if (!gehalten || !ziel || !ziel.erreichbar) { abbau.fortschritt = 0; return; }
    var id = hole(ziel.x, ziel.y);
    if (id === b.LUFT || id === b.WASSER || !istFest(id)) { abbau.fortschritt = 0; return; }
    if (abbau.x !== ziel.x || abbau.y !== ziel.y) { abbau.x = ziel.x; abbau.y = ziel.y; abbau.fortschritt = 0; }
    abbau.fortschritt += dt;
    if (abbau.fortschritt >= abbauZeit(id)) {
      if (setze(ziel.x, ziel.y, b.LUFT)) {
        bestand[id] = (bestand[id] || 0) + 1;
        if (id === b.HOLZ) gesammelt.holz++;
        if (id === b.STEIN) gesammelt.stein++;
        ton('abbauen');
        pruefeZiel();
      }
      abbau.fortschritt = 0;
    }
  }

  function verarbeiteSetzen(zust) {
    if (!zust || !zust.setzenGedrueckt || !ziel || !ziel.erreichbar) return;
    var b = B();
    var l = S.konfig.LEISTE || [];
    var id = l[auswahl];
    if (id == null || !(bestand[id] > 0)) { ton('klick'); return; }
    var cur = hole(ziel.x, ziel.y);
    if (cur !== b.LUFT && cur !== b.WASSER) return;
    if (ueberlappt(ziel.x, ziel.y)) return;
    var nachbar = istFest(hole(ziel.x - 1, ziel.y)) || istFest(hole(ziel.x + 1, ziel.y)) ||
                  istFest(hole(ziel.x, ziel.y - 1)) || istFest(hole(ziel.x, ziel.y + 1));
    if (!nachbar) { ton('klick'); return; }
    if (setze(ziel.x, ziel.y, id)) {
      bestand[id] -= 1;
      ton('setzen');
    }
  }

  function pruefeZiel() {
    if (zielMeldet) return;
    if (gesammelt.holz >= ZIEL_HOLZ && gesammelt.stein >= ZIEL_STEIN) {
      zielMeldet = true;
      meldung('Genug Material gesammelt: Zeit für dein Haus!');
    }
  }

  /* ---------- Frame ---------- */
  function schleife(t) {
    rafId = requestAnimationFrame(schleife);
    if (!laeuft) return;
    var rahmen = letzteZeit ? Math.min(0.25, (t - letzteZeit) / 1000) : 0;
    letzteZeit = t;

    var zust = aufruf('steuerung', 'zustand') || {};

    if (zust.pause) pause(!pausiert);
    if (zust.speichern) speichern(true);

    if (!pausiert) {
      if (zust.auswahlDirekt != null) {
        var n = (S.konfig.LEISTE || []).length;
        if (zust.auswahlDirekt >= 0 && zust.auswahlDirekt < n) auswahl = zust.auswahlDirekt;
      } else if (zust.auswahlWechsel) {
        var m = (S.konfig.LEISTE || [1]).length;
        auswahl = (auswahl + zust.auswahlWechsel + m * 4) % m;
      }

      akku += rahmen;
      var eing = { links: !!zust.links, rechts: !!zust.rechts, springen: !!zust.springen };
      var schritte = 0;
      while (akku >= DT && schritte < 5) {
        simSchritt(eing);
        akku -= DT;
        schritte++;
      }
      if (schritte === 5) akku = 0;
      var verbraucht = schritte * DT;
      spielzeit += verbraucht;

      ziel = berechneZiel(zust);
      verarbeiteAbbau(zust, verbraucht);
      verarbeiteSetzen(zust);

      autoRest -= verbraucht * 1000;
      if (autoRest <= 0) { autoRest = S.konfig.AUTOSPEICHERN_MS || 30000; speichern(false); }
    }

    zeichne();
  }

  /* ---------- Zeichnen ---------- */
  var ERSATZ = { 1: '#5fae3e', 2: '#8a5a36', 3: '#7d7f86', 4: '#e2cf8f', 5: '#6b4a2b', 6: '#3f8f3a', 7: '#3d7fd0', 8: '#c9a24a' };

  function tageszeit() {
    var p = (spielzeit / TAGDAUER) % 2;
    return p < 1 ? p : 2 - p;
  }

  function blockZeichnen(id, px, py, g) {
    if (id === 0) return;
    if (S.grafik && typeof S.grafik.zeichneBlock === 'function') {
      try { S.grafik.zeichneBlock(ctx, id, px, py, g); return; } catch (e) { /* Ersatz */ }
    }
    ctx.fillStyle = ERSATZ[id] || '#f0f';
    ctx.fillRect(px, py, g, g);
  }

  function zeichne() {
    var vw = canvas.width, vh = canvas.height, k = K();
    ctx.imageSmoothingEnabled = false;
    var tz = tageszeit();

    if (S.grafik && typeof S.grafik.zeichneHimmel === 'function') {
      try { S.grafik.zeichneHimmel(ctx, vw, vh, tz); } catch (e) { ctx.fillStyle = '#8ec9ff'; ctx.fillRect(0, 0, vw, vh); }
    } else { ctx.fillStyle = '#8ec9ff'; ctx.fillRect(0, 0, vw, vh); }

    var kx = Math.round(kam.x), ky = Math.round(kam.y);
    var x0 = Math.max(0, Math.floor(kx / k)), x1 = Math.min(welt.breite - 1, Math.floor((kx + vw) / k));
    var y0 = Math.max(0, Math.floor(ky / k)), y1 = Math.min(welt.hoehe - 1, Math.floor((ky + vh) / k));
    var bl = welt.bloecke, bw = welt.breite;
    for (var y = y0; y <= y1; y++) {
      var zeile = y * bw, py = y * k - ky;
      for (var x = x0; x <= x1; x++) {
        var id = bl[zeile + x];
        if (id) blockZeichnen(id, x * k - kx, py, k);
      }
    }

    // Spieler
    var sx = Math.round(koerper.x * k - kx), sy = Math.round(koerper.y * k - ky);
    var sb = Math.round(koerper.breite * k), sh = Math.round(koerper.hoehe * k);
    if (S.grafik && typeof S.grafik.zeichneSpieler === 'function') {
      try { S.grafik.zeichneSpieler(ctx, sx, sy, sb, sh, koerper.blickRechts, laufPhase); }
      catch (e) { ctx.fillStyle = '#d94f4f'; ctx.fillRect(sx, sy, sb, sh); }
    } else { ctx.fillStyle = '#d94f4f'; ctx.fillRect(sx, sy, sb, sh); }

    // Abend-Tönung
    if (tz > 0.7) {
      ctx.fillStyle = 'rgba(15,20,55,' + (Math.min(1, (tz - 0.7) / 0.3) * 0.38).toFixed(3) + ')';
      ctx.fillRect(0, 0, vw, vh);
    }

    // Ziel
    if (ziel) {
      var zx = ziel.x * k - kx, zy = ziel.y * k - ky;
      if (S.grafik && typeof S.grafik.zeichneZiel === 'function') {
        try { S.grafik.zeichneZiel(ctx, zx, zy, k, ziel.erreichbar); } catch (e) { /* ignorieren */ }
      } else {
        ctx.strokeStyle = ziel.erreichbar ? '#fff' : '#e33';
        ctx.lineWidth = 2; ctx.strokeRect(zx + 1, zy + 1, k - 2, k - 2);
      }
      if (abbau.fortschritt > 0 && abbau.x === ziel.x && abbau.y === ziel.y) {
        var zeit = abbauZeit(hole(ziel.x, ziel.y)) || 0.4;
        var anteil = Math.min(1, abbau.fortschritt / zeit);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(zx + 3, zy + k - 8, k - 6, 5);
        ctx.fillStyle = '#ffd34d'; ctx.fillRect(zx + 4, zy + k - 7, Math.round((k - 8) * anteil), 3);
      }
    }

    zeichneHud(vw, vh);
  }

  function zeichneHud(vw, vh) {
    // Leiste
    if (S.grafik && typeof S.grafik.zeichneLeiste === 'function') {
      try { S.grafik.zeichneLeiste(ctx, vw, vh, S.konfig.LEISTE, auswahl, bestand); } catch (e) { /* ignorieren */ }
    }
    // Ziel-Anzeige
    var holz = Math.min(gesammelt.holz, ZIEL_HOLZ), stein = Math.min(gesammelt.stein, ZIEL_STEIN);
    var fertig = holz >= ZIEL_HOLZ && stein >= ZIEL_STEIN;
    var zeilen = fertig
      ? ['Ziel: Baue dein Haus!']
      : ['Ziel: ' + ZIEL_HOLZ + ' Holz, ' + ZIEL_STEIN + ' Stein', 'Holz ' + holz + '/' + ZIEL_HOLZ + '   Stein ' + stein + '/' + ZIEL_STEIN];
    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    var breite = 0, i;
    for (i = 0; i < zeilen.length; i++) breite = Math.max(breite, ctx.measureText(zeilen[i]).width);
    var h = zeilen.length * 18 + 10;
    ctx.fillStyle = 'rgba(30,20,10,0.6)';
    ctx.fillRect(10, 10, breite + 20, h);
    ctx.fillStyle = '#fff3d6';
    for (i = 0; i < zeilen.length; i++) ctx.fillText(zeilen[i], 20, 15 + i * 18);
    if (!fertig) {
      var anteil = (holz + stein) / (ZIEL_HOLZ + ZIEL_STEIN);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(20, 10 + h - 4, breite, 3);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(20, 10 + h - 4, Math.round(breite * anteil), 3);
    }
    ctx.restore();
  }

  S.spiel = {
    start: start,
    pause: pause,
    istPausiert: istPausiert,
    speichere: function () { return speichern(true); },
    stop: function () { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }
  };
})();
