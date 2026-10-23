/* Inselbau: welt.js
   Weltgenerator und Blockzugriff. Alles hängt an window.SPIEL.welt. */
(function () {
  "use strict";
  window.SPIEL = window.SPIEL || {};

  var B = (SPIEL.konfig && SPIEL.konfig.BLOCK) || { LUFT: 0, GRAS: 1, ERDE: 2, STEIN: 3, SAND: 4, HOLZ: 5, BLAETTER: 6, WASSER: 7, ERZ: 8 };
  var MEER = 30; // Meereshöhe: Zeile, ab der Wasser steht

  // Eigener Zufallsgenerator, deterministisch aus dem Seed
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Weiches 1D-Rauschen aus Gitterwerten
  function machRauschen(rnd, n) {
    var g = [];
    for (var i = 0; i < n; i++) g.push(rnd());
    return function (x) {
      var i0 = Math.floor(x), f = x - i0;
      var u = f * f * (3 - 2 * f);
      var a = g[((i0 % n) + n) % n], b = g[(((i0 + 1) % n) + n) % n];
      return a + (b - a) * u;
    };
  }

  function erzeuge(seed) {
    var breite = (SPIEL.konfig && SPIEL.konfig.BREITE) || 120;
    var hoehe = (SPIEL.konfig && SPIEL.konfig.HOEHE) || 64;
    var rnd = mulberry32((seed >>> 0) || 1);
    var bloecke = new Uint8Array(breite * hoehe);
    var welt = { breite: breite, hoehe: hoehe, bloecke: bloecke, spawn: { x: 0, y: 0 } };
    function idx(x, y) { return y * breite + x; }
    function imBereich(x, y) { return x >= 0 && y >= 0 && x < breite && y < hoehe; }

    var n1 = machRauschen(rnd, 64), n2 = machRauschen(rnd, 64);
    var mitte = breite / 2, halb = 48, boden = 40, hub = 24;

    // Oberflächenhöhe je Spalte (Zeilenindex der obersten festen Kachel)
    var oben = [];
    for (var x = 0; x < breite; x++) {
      var s = Math.max(0, 1 - Math.abs(x + 0.5 - mitte) / halb);
      var form = s * s * (3 - 2 * s);
      var n = (n1(x / 7) - 0.5) * 2 + (n2(x / 3) - 0.5) * 0.8;
      var h = Math.round(boden - hub * form + n * (1 + 1.5 * form));
      oben.push(Math.max(4, Math.min(hoehe - 8, h)));
    }

    // Schichten
    for (x = 0; x < breite; x++) {
      var t = oben[x];
      var strand = t >= MEER - 1;
      var deckTiefe = strand ? 2 + Math.floor(rnd() * 2) : 3 + (rnd() < 0.5 ? 1 : 0);
      for (var y = t; y < hoehe; y++) {
        var d = y - t, id;
        if (d < deckTiefe) id = strand ? B.SAND : (d === 0 ? B.GRAS : B.ERDE);
        else id = B.STEIN;
        bloecke[idx(x, y)] = id;
      }
      for (y = MEER; y < t; y++) bloecke[idx(x, y)] = B.WASSER;
    }

    // Erzadern: kleine Zufallspfade im Stein
    for (var v = 0; v < 18; v++) {
      var ex = 24 + Math.floor(rnd() * (breite - 48));
      var tiefe = (v < 4) ? 6 + rnd() * 5 : 8 + rnd() * (hoehe - oben[ex] - 12);
      var ey = Math.floor(oben[ex] + tiefe);
      var laenge = 3 + Math.floor(rnd() * 4);
      for (var k = 0; k < laenge; k++) {
        if (imBereich(ex, ey) && bloecke[idx(ex, ey)] === B.STEIN) bloecke[idx(ex, ey)] = B.ERZ;
        var r = rnd();
        if (r < 0.3) ex++; else if (r < 0.6) ex--; else if (r < 0.8) ey++; else ey--;
      }
    }

    // Kleine Höhle unter dem Hügel (zwei Kammern, Rand leicht unregelmäßig)
    function hoehle(cx, cy, rx, ry) {
      for (var yy = Math.floor(cy - ry - 1); yy <= Math.ceil(cy + ry + 1); yy++) {
        for (var xx = Math.floor(cx - rx - 1); xx <= Math.ceil(cx + rx + 1); xx++) {
          if (!imBereich(xx, yy) || yy < oben[xx] + 6) continue;
          var q = Math.pow((xx - cx) / rx, 2) + Math.pow((yy - cy) / ry, 2);
          if (q <= 1 + (rnd() - 0.5) * 0.35) {
            var cur = bloecke[idx(xx, yy)];
            if (cur === B.STEIN || cur === B.ERZ) bloecke[idx(xx, yy)] = B.LUFT;
          }
        }
      }
    }
    var cx = 52 + Math.floor(rnd() * 16);
    var cy = oben[cx] + 14;
    var rx = 5 + rnd() * 2, ry = 2.5 + rnd();
    hoehle(cx, cy, rx, ry);
    hoehle(cx + rx - 1, cy + 1.5, 2.5, 1.8);
    // Erz an der Höhlendecke, damit man es beim Graben sieht
    for (k = 0; k < 4; k++) {
      var zx = Math.floor(cx - rx + rnd() * rx * 2), zy = Math.floor(cy - ry - 1);
      if (imBereich(zx, zy) && bloecke[idx(zx, zy)] === B.STEIN) bloecke[idx(zx, zy)] = B.ERZ;
    }

    // Bäume auf Grasspalten, mit Abstand, nicht am Spawn
    var spawnX = Math.floor(mitte);
    var letzter = -99, versuche = 0, gesetzt = 0;
    var kandidaten = [];
    for (x = 8; x < breite - 8; x++) kandidaten.push(x);
    // deterministisch mischen
    for (var i = kandidaten.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)), tmp = kandidaten[i];
      kandidaten[i] = kandidaten[j]; kandidaten[j] = tmp;
    }
    var baeume = [];
    for (i = 0; i < kandidaten.length && baeume.length < 8; i++) {
      var bx = kandidaten[i], by = oben[bx];
      if (bloecke[idx(bx, by)] !== B.GRAS) continue;
      if (by > MEER - 4) continue;
      if (Math.abs(bx - spawnX) < 5) continue;
      var frei = true;
      for (var q2 = 0; q2 < baeume.length; q2++) if (Math.abs(baeume[q2] - bx) < 6) frei = false;
      if (!frei) continue;
      baeume.push(bx);
    }
    baeume.sort(function (a, b) { return a - b; });
    for (i = 0; i < baeume.length; i++) {
      bx = baeume[i]; by = oben[bx];
      var hohe = 4 + Math.floor(rnd() * 2);
      var ty = by - hohe; // oberste Stammkachel
      for (var ky = ty - 2; ky <= ty; ky++) {
        var br = (ky === ty - 2) ? 1 : 2;
        for (var kx = bx - br; kx <= bx + br; kx++) {
          if (!imBereich(kx, ky)) continue;
          var ecke = Math.abs(kx - bx) === br && br === 2 && (ky === ty - 1 || ky === ty);
          if (ecke && rnd() < 0.35) continue;
          if (bloecke[idx(kx, ky)] === B.LUFT) bloecke[idx(kx, ky)] = B.BLAETTER;
        }
      }
      for (ky = by - 1; ky >= ty; ky--) if (imBereich(bx, ky)) bloecke[idx(bx, ky)] = B.HOLZ;
    }

    // Spawn: Mitte der Insel, auf der Oberfläche; Luftraum darüber garantiert frei
    var sx = spawnX;
    for (var fy = Math.max(0, oben[sx] - 8); fy < oben[sx]; fy++) bloecke[idx(sx, fy)] = B.LUFT;
    welt.spawn = { x: sx + 0.125, y: oben[sx] - 2 };
    return welt;
  }

  function hole(welt, x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (y >= welt.hoehe) return B.STEIN;
    if (y < 0) return B.LUFT;
    if (x < 0 || x >= welt.breite) return y >= MEER ? B.WASSER : B.LUFT;
    return welt.bloecke[y * welt.breite + x];
  }

  function setze(welt, x, y, id) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= welt.breite || y >= welt.hoehe) return false;
    welt.bloecke[y * welt.breite + x] = id;
    return true;
  }

  function istFest(id) {
    return id !== B.LUFT && id !== B.WASSER;
  }

  SPIEL.welt = { erzeuge: erzeuge, hole: hole, setze: setze, istFest: istFest, MEERESHOEHE: MEER };
})();
