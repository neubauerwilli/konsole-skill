/* physik.js: Körper-Physik für Inselbau. Einheiten: Kacheln und Sekunden. */
(function () {
  "use strict";
  var SPIEL = (window.SPIEL = window.SPIEL || {});

  var E = 1e-5;                 // Epsilon für Kachelbereiche
  var LAUFTEMPO = 5;            // Kacheln/s
  var BESCHL_BODEN = 45;        // Kacheln/s²
  var BESCHL_LUFT = 28;
  var BREMSE_BODEN = 55;
  var BREMSE_LUFT = 12;
  var SCHWERKRAFT = 30;
  var SPRUNG_H = 1.33;          // Kacheln
  var SPRUNG_V = Math.sqrt(2 * SCHWERKRAFT * SPRUNG_H);
  var SPRUNG_KAPPE = 3.0;       // Abschwung bei losgelassener Taste
  var MAX_FALL = 20;            // Kacheln/s, pro Schritt 0,33 < 1 Kachel
  var MAX_STEIG = 20;
  var KOYOTE = 0.1;             // s nach Verlassen der Kante noch springen
  var PUFFER = 0.12;            // s Sprungwunsch vor der Landung merken
  var MAX_TEILSCHRITT = 0.4;    // Kacheln je Teilbewegung

  // Wasser
  var W_TEMPO = 2.8;
  var W_SCHWERKRAFT = 7;
  var W_SINKEN = 2.5;
  var W_SCHWIMMEN = 4.5;
  var W_DAEMPFUNG = 3.0;

  function fest(welt, x, y) {
    return SPIEL.welt.istFest(SPIEL.welt.hole(welt, x, y));
  }
  function istWasser(welt, x, y) {
    return SPIEL.welt.hole(welt, x, y) === SPIEL.konfig.BLOCK.WASSER;
  }
  function zuNull(v, d) {
    if (v > 0) return Math.max(0, v - d);
    return Math.min(0, v + d);
  }
  function naeher(v, ziel, d) {
    if (v < ziel) return Math.min(ziel, v + d);
    return Math.max(ziel, v - d);
  }

  function bewegeX(k, welt, dx) {
    if (dx === 0) return false;
    k.x += dx;
    var y0 = Math.floor(k.y), y1 = Math.floor(k.y + k.hoehe - E);
    var tx, y;
    if (dx > 0) {
      tx = Math.floor(k.x + k.breite - E);
      for (y = y0; y <= y1; y++) {
        if (fest(welt, tx, y)) { k.x = tx - k.breite - 2 * E; k.vx = 0; return true; }
      }
    } else {
      tx = Math.floor(k.x);
      for (y = y0; y <= y1; y++) {
        if (fest(welt, tx, y)) { k.x = tx + 1 + 2 * E; k.vx = 0; return true; }
      }
    }
    return false;
  }

  // gibt 1 zurück bei Aufprall nach unten (Boden), -1 bei Kopfstoß, sonst 0
  function bewegeY(k, welt, dy) {
    if (dy === 0) return 0;
    k.y += dy;
    var x0 = Math.floor(k.x), x1 = Math.floor(k.x + k.breite - E);
    var ty, x;
    if (dy > 0) {
      ty = Math.floor(k.y + k.hoehe - E);
      for (x = x0; x <= x1; x++) {
        if (fest(welt, x, ty)) { k.y = ty - k.hoehe - 2 * E; k.vy = 0; return 1; }
      }
    } else {
      ty = Math.floor(k.y);
      for (x = x0; x <= x1; x++) {
        if (fest(welt, x, ty)) { k.y = ty + 1 + 2 * E; k.vy = 0; return -1; }
      }
    }
    return 0;
  }

  function stehtAuf(k, welt) {
    var x0 = Math.floor(k.x), x1 = Math.floor(k.x + k.breite - E);
    var ty = Math.floor(k.y + k.hoehe + 4 * E);
    for (var x = x0; x <= x1; x++) if (fest(welt, x, ty)) return true;
    return false;
  }

  function imWasser(k, welt) {
    var mx = Math.floor(k.x + k.breite / 2);
    return istWasser(welt, mx, Math.floor(k.y + k.hoehe * 0.6)) ||
           istWasser(welt, mx, Math.floor(k.y + k.hoehe * 0.3));
  }

  var physik = {
    neuerKoerper: function (x, y) {
      return {
        x: x, y: y, vx: 0, vy: 0, breite: 0.75, hoehe: 1.75,
        amBoden: false, blickRechts: true,
        _koyote: 0, _puffer: 0, _sprungVorher: false, _springt: false
      };
    },

    schritt: function (k, welt, dt, eingabe) {
      eingabe = eingabe || {};
      if (!(dt > 0)) dt = 1 / 60;
      if (dt > 1 / 30) dt = 1 / 30;
      var ergebnis = { gelandet: false, gesprungen: false, gelaufen: false };
      var links = !!eingabe.links, rechts = !!eingabe.rechts, spring = !!eingabe.springen;
      var wasser = imWasser(k, welt);
      var warAmBoden = k.amBoden;

      // Richtung und Zielgeschwindigkeit
      var dir = (rechts ? 1 : 0) - (links ? 1 : 0);
      if (dir > 0) k.blickRechts = true; else if (dir < 0) k.blickRechts = false;
      var tempo = wasser ? W_TEMPO : LAUFTEMPO;
      var beschl = wasser ? 18 : (k.amBoden ? BESCHL_BODEN : BESCHL_LUFT);
      var bremse = wasser ? 14 : (k.amBoden ? BREMSE_BODEN : BREMSE_LUFT);
      if (dir !== 0) {
        var ziel = dir * tempo;
        // Richtungswechsel bremst stärker
        var d = (k.vx !== 0 && Math.sign(k.vx) !== dir) ? (beschl + bremse) * dt : beschl * dt;
        k.vx = naeher(k.vx, ziel, d);
      } else {
        k.vx = zuNull(k.vx, bremse * dt);
      }

      // Sprungpuffer und Koyote
      var flanke = spring && !k._sprungVorher;
      k._sprungVorher = spring;
      if (flanke) k._puffer = PUFFER; else k._puffer = Math.max(0, k._puffer - dt);
      if (k.amBoden) k._koyote = KOYOTE; else k._koyote = Math.max(0, k._koyote - dt);

      if (wasser) {
        k.vy += W_SCHWERKRAFT * dt;
        if (spring) k.vy = naeher(k.vy, -W_SCHWIMMEN, 40 * dt);
        else k.vy = naeher(k.vy, Math.min(k.vy, W_SINKEN), 0);
        if (k.vy > W_SINKEN) k.vy -= (k.vy - W_SINKEN) * Math.min(1, W_DAEMPFUNG * 3 * dt);
        k._springt = false;
        // Sprung aus dem Wasser über eine Kante: Ausstieg per Springen bleibt möglich
        if (k._puffer > 0 && k._koyote > 0) {
          k.vy = -SPRUNG_V; k._puffer = 0; k._koyote = 0; k._springt = true; ergebnis.gesprungen = true;
        }
      } else {
        k.vy += SCHWERKRAFT * dt;
        if (k._puffer > 0 && k._koyote > 0) {
          k.vy = -SPRUNG_V;
          k._puffer = 0; k._koyote = 0; k._springt = true;
          k.amBoden = false;
          ergebnis.gesprungen = true;
        }
        // Taste los: Sprung abkürzen
        if (!spring && k._springt && k.vy < -SPRUNG_KAPPE) k.vy = -SPRUNG_KAPPE;
        if (k.vy >= 0) k._springt = false;
      }
      if (k.vy > MAX_FALL) k.vy = MAX_FALL;
      if (k.vy < -MAX_STEIG) k.vy = -MAX_STEIG;

      // Bewegung getrennt je Achse, in kleinen Teilschritten (kein Tunneln)
      var dx = k.vx * dt, dy = k.vy * dt;
      var n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_TEILSCHRITT));
      var sx = dx / n, sy = dy / n, treffer = 0;
      for (var i = 0; i < n; i++) {
        bewegeX(k, welt, sx);
        var r = bewegeY(k, welt, sy);
        if (r === 1) treffer = 1;
        if (r !== 0) sy = 0;
      }

      // Boden bestimmen
      k.amBoden = k.vy >= 0 && stehtAuf(k, welt);
      if (k.amBoden) {
        k._springt = false;
        if (!warAmBoden && (treffer === 1 || true)) ergebnis.gelandet = !wasser;
      }
      if (k.amBoden && Math.abs(k.vx) > 0.5 && dir !== 0) ergebnis.gelaufen = true;
      return ergebnis;
    },

    ueberlappt: function (k, bx, by) {
      return k.x < bx + 1 - E && k.x + k.breite > bx + E &&
             k.y < by + 1 - E && k.y + k.hoehe > by + E;
    }
  };

  SPIEL.physik = physik;
})();
