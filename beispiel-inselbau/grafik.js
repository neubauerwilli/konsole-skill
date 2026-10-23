/* Inselbau: grafik.js
   Prozedurale Pixel-Grafik. Alles entsteht im Code: 16x16-Texturen, Himmel, Figur, Oberflaeche. */
(function () {
  "use strict";
  window.SPIEL = window.SPIEL || {};

  var RASTER = 16;
  var texturen = {};      // id -> Canvas 16x16
  var skaliert = {};      // id -> Canvas KACHEL x KACHEL
  var bereit = false;

  function kachel() {
    return (SPIEL.konfig && SPIEL.konfig.KACHEL) || 32;
  }

  // kleiner eigener Zufallsgenerator (mulberry32)
  function zufall(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function px(c, x, y, farbe) {
    if (x < 0 || y < 0 || x >= RASTER || y >= RASTER) return;
    c.fillStyle = farbe;
    c.fillRect(x, y, 1, 1);
  }

  function waehle(r, liste) {
    return liste[Math.floor(r() * liste.length) % liste.length];
  }

  function fuellung(c, r, palette) {
    for (var y = 0; y < RASTER; y++)
      for (var x = 0; x < RASTER; x++) px(c, x, y, waehle(r, palette));
  }

  // ---- Texturen je Block ----
  var bauer = {};

  bauer.erde = function (c, r) {
    fuellung(c, r, ["#8a5a35", "#8a5a35", "#8a5a35", "#7d502e", "#96643c", "#7d502e"]);
    var i;
    for (i = 0; i < 12; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#5f3b20");
    for (i = 0; i < 6; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#b07a4c");
  };

  bauer.gras = function (c, r) {
    bauer.erde(c, r);
    var oben = ["#5fae3a", "#6cbc43", "#549c33", "#74c64a"];
    var x, y;
    for (x = 0; x < 16; x++) {
      var tiefe = 3 + (r() < 0.45 ? 1 : 0) + (r() < 0.2 ? 1 : 0);
      for (y = 0; y < tiefe; y++) px(c, x, y, waehle(r, oben));
    }
    for (var k = 0; k < 4; k++) px(c, Math.floor(r() * 16), 0, "#8fdb62");
    for (var d = 0; d < 3; d++) px(c, Math.floor(r() * 16), 5, "#4a8a2c");
  };

  bauer.stein = function (c, r) {
    fuellung(c, r, ["#8c9097", "#8c9097", "#80848b", "#989ca3", "#80848b"]);
    var i, x, y;
    for (i = 0; i < 2; i++) {
      x = 2 + Math.floor(r() * 12);
      y = 1 + Math.floor(r() * 6);
      for (var l = 0; l < 6; l++) {
        px(c, x, y, "#5e6269");
        if (r() < 0.55) x += r() < 0.5 ? -1 : 1;
        y += 1;
      }
    }
    for (i = 0; i < 8; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#b4b8be");
    for (i = 0; i < 6; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#6d7178");
  };

  bauer.sand = function (c, r) {
    fuellung(c, r, ["#e9d28c", "#e9d28c", "#e2c97e", "#f1dc9c", "#dcc072"]);
    var i;
    for (i = 0; i < 10; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#c9aa5c");
    for (i = 0; i < 5; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#fbeebb");
  };

  bauer.holz = function (c, r) {
    var x, y;
    for (y = 0; y < 16; y++) {
      for (x = 0; x < 16; x++) {
        var spalte = x % 4;
        var f = spalte === 0 ? "#5e3a1e" : spalte === 1 ? "#8d5b30" : spalte === 2 ? "#9c6a3a" : "#7c4d28";
        if (r() < 0.08) f = "#6b4222";
        px(c, x, y, f);
      }
    }
    var ax = 3 + Math.floor(r() * 9), ay = 3 + Math.floor(r() * 9);
    px(c, ax, ay, "#3f2512"); px(c, ax + 1, ay, "#4e2f18"); px(c, ax, ay + 1, "#4e2f18");
    for (y = 0; y < 16; y++) { px(c, 0, y, "#4d2f17"); px(c, 15, y, "#4d2f17"); }
  };

  bauer.blaetter = function (c, r) {
    c.clearRect(0, 0, 16, 16);
    var x, y, wert, i;
    for (y = 0; y < 16; y++) {
      for (x = 0; x < 16; x++) {
        wert = r();
        if (wert < 0.1) continue; // Loch, Himmel scheint durch
        px(c, x, y, wert < 0.4 ? "#3f8f3a" : wert < 0.7 ? "#4fa646" : wert < 0.9 ? "#2f7a30" : "#6bc15a");
      }
    }
    for (i = 0; i < 6; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#8ad672");
    for (i = 0; i < 5; i++) px(c, Math.floor(r() * 16), Math.floor(r() * 16), "#235f26");
  };

  bauer.wasser = function (c, r) {
    var x, y;
    for (y = 0; y < 16; y++)
      for (x = 0; x < 16; x++)
        px(c, x, y, ((x + y) % 7 === 0 && r() < 0.5) ? "#3d86c7" : "#3478b8");
    var zeilen = [3, 9, 13];
    for (var i = 0; i < zeilen.length; i++) {
      var off = Math.floor(r() * 4);
      for (x = 0; x < 16; x++) {
        if ((x + off) % 4 < 2) px(c, x, zeilen[i] + (((x + off) % 4) === 1 ? 0 : 1), "#7fbbe8");
      }
    }
  };

  bauer.erz = function (c, r) {
    bauer.stein(c, r);
    var klumpen = [[3, 4], [10, 3], [6, 10], [12, 11]];
    for (var i = 0; i < klumpen.length; i++) {
      var cx = klumpen[i][0], cy = klumpen[i][1];
      px(c, cx, cy, "#f2b134");
      px(c, cx + 1, cy, "#d98a1f");
      px(c, cx, cy + 1, "#d98a1f");
      px(c, cx + 1, cy + 1, "#a85f14");
      px(c, cx - 1, cy > 0 ? cy - 1 : 0, "#ffe08a");
    }
  };

  function neuesCanvas(b, h) {
    var cv = document.createElement("canvas");
    cv.width = b; cv.height = h;
    return cv;
  }

  function init() {
    var B = SPIEL.konfig.BLOCK;
    var plan = [
      [B.GRAS, bauer.gras, 11], [B.ERDE, bauer.erde, 22], [B.STEIN, bauer.stein, 33],
      [B.SAND, bauer.sand, 44], [B.HOLZ, bauer.holz, 55], [B.BLAETTER, bauer.blaetter, 66],
      [B.WASSER, bauer.wasser, 77], [B.ERZ, bauer.erz, 88]
    ];
    var k = kachel();
    for (var i = 0; i < plan.length; i++) {
      var id = plan[i][0];
      var cv = neuesCanvas(RASTER, RASTER);
      var c = cv.getContext("2d");
      plan[i][1](c, zufall(plan[i][2] * 7919 + SPIEL.konfig.SEED));
      texturen[id] = cv;
      var gross = neuesCanvas(k, k);
      var g = gross.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.drawImage(cv, 0, 0, k, k);
      skaliert[id] = gross;
    }
    bereit = true;
  }

  function zeichneBlock(ctx, id, px_, py_, groesse) {
    if (!id || !bereit) return;
    var tex = texturen[id];
    if (!tex) return;
    var g = groesse || kachel();
    var x = Math.round(px_), y = Math.round(py_);
    var vorher = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    if (id === SPIEL.konfig.BLOCK.WASSER) {
      var a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.78;
      ctx.drawImage(tex, x, y, g, g);
      ctx.globalAlpha = a;
    } else if (g === kachel() && skaliert[id]) {
      ctx.drawImage(skaliert[id], x, y);
    } else {
      ctx.drawImage(tex, x, y, g, g);
    }
    ctx.imageSmoothingEnabled = vorher;
  }

  // ---- Himmel ----
  function mische(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function rgb(c) {
    return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")";
  }

  // Stuetzpunkte: Morgen, Mittag, Abend (oben, unten, Huegel fern, Huegel nah)
  var TAG = [
    { o: [255, 190, 150], u: [255, 232, 190], h1: [214, 176, 170], h2: [172, 150, 140] },
    { o: [92, 170, 232], u: [196, 232, 250], h1: [150, 196, 196], h2: [104, 168, 128] },
    { o: [232, 120, 90], u: [255, 196, 120], h1: [170, 110, 130], h2: [112, 80, 98] }
  ];

  function himmelFarben(t) {
    t = Math.max(0, Math.min(1, t));
    var a, b, f;
    if (t < 0.5) { a = TAG[0]; b = TAG[1]; f = t / 0.5; }
    else { a = TAG[1]; b = TAG[2]; f = (t - 0.5) / 0.5; }
    return {
      o: mische(a.o, b.o, f), u: mische(a.u, b.u, f),
      h1: mische(a.h1, b.h1, f), h2: mische(a.h2, b.h2, f)
    };
  }

  function huegel(ctx, breite, hoehe, grundlinie, amp, welle, versatz, farbe) {
    ctx.fillStyle = farbe;
    ctx.beginPath();
    ctx.moveTo(0, hoehe);
    var schritt = 8;
    for (var x = 0; x <= breite + schritt; x += schritt) {
      var y = grundlinie
        - Math.abs(Math.sin(x * welle + versatz)) * amp
        - Math.sin(x * welle * 2.3 + versatz * 1.7) * amp * 0.25;
      ctx.lineTo(x, Math.round(y / 4) * 4); // stufig, passt zur Pixel-Optik
    }
    ctx.lineTo(breite + schritt, hoehe);
    ctx.closePath();
    ctx.fill();
  }

  function zeichneHimmel(ctx, breitePx, hoehePx, tageszeit) {
    var t = typeof tageszeit === "number" ? tageszeit : 0.5;
    t = Math.max(0, Math.min(1, t));
    var f = himmelFarben(t);
    var v = ctx.createLinearGradient(0, 0, 0, hoehePx);
    v.addColorStop(0, rgb(f.o));
    v.addColorStop(0.75, rgb(f.u));
    v.addColorStop(1, rgb(f.u));
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, breitePx, hoehePx);

    // Sonne auf flachem Bogen
    var sx = breitePx * (0.1 + 0.8 * t);
    var sy = hoehePx * (0.58 - 0.4 * Math.sin(Math.PI * t));
    var r = Math.max(14, Math.min(breitePx, hoehePx) * 0.05);
    ctx.fillStyle = t > 0.8 ? "rgba(255,170,90,0.35)" : "rgba(255,240,170,0.35)";
    ctx.beginPath(); ctx.arc(sx, sy, r * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t > 0.8 ? "#ffb15c" : "#fff3b0";
    ctx.fillRect(Math.round(sx - r), Math.round(sy - r), Math.round(r * 2), Math.round(r * 2));

    // Wolken (feste Klotz-Wolken)
    ctx.fillStyle = "rgba(255,255,255," + (t > 0.85 ? 0.45 : 0.75) + ")";
    var wolken = [[0.12, 0.16, 90], [0.46, 0.1, 120], [0.74, 0.22, 100], [0.9, 0.12, 70]];
    for (var i = 0; i < wolken.length; i++) {
      var wx = Math.round(breitePx * wolken[i][0]), wy = Math.round(hoehePx * wolken[i][1]), w = wolken[i][2];
      ctx.fillRect(wx, wy, w, 14);
      ctx.fillRect(wx + 14, wy - 10, w - 40, 12);
      ctx.fillRect(wx - 12, wy + 6, Math.round(w * 0.5), 10);
    }

    // ferne Huegel
    var grund = hoehePx * 0.78;
    huegel(ctx, breitePx, hoehePx, grund, hoehePx * 0.12, 0.006, 1.3, rgb(f.h1));
    huegel(ctx, breitePx, hoehePx, grund + hoehePx * 0.08, hoehePx * 0.09, 0.011, 4.1, rgb(f.h2));
  }

  // ---- Spieler: eigene Figur, Inselbewohner mit Strohhut ----
  // Raster 12 x 28 Einheiten
  function zeichneSpieler(ctx, px_, py_, breitePx, hoehePx, blickRechts, laufPhase) {
    var u = breitePx / 12, v = hoehePx / 28;
    var ph = laufPhase || 0;
    var schwung = Math.sin(ph * Math.PI * 2);
    var bein = schwung * 1.6;
    var heben = Math.abs(schwung) * 0.0;
    ctx.save();
    ctx.translate(Math.round(px_), Math.round(py_));
    if (blickRechts === false) { ctx.translate(breitePx, 0); ctx.scale(-1, 1); }

    function R(x, y, w, h, farbe) {
      ctx.fillStyle = farbe;
      var X = Math.round(x * u), Y = Math.round((y + heben) * v);
      ctx.fillRect(X, Y, Math.max(1, Math.round((x + w) * u) - X), Math.max(1, Math.round((y + h + heben) * v) - Y));
    }

    // Schatten am Boden
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(Math.round(1.5 * u), Math.round(27.4 * v), Math.round(9 * u), Math.max(1, Math.round(0.6 * v)));

    // Beine (hinteres dunkler), Schwung gegenlaeufig
    R(3 + bein, 20, 3, 6, "#2f5e7a");
    R(6 - bein, 20, 3, 6, "#3a7090");
    R(3 + bein, 26, 3.6, 2, "#4a2f1b");
    R(6 - bein, 26, 3.6, 2, "#5a3a22");

    // hinterer Arm
    R(1.6 - schwung * 1.2, 12, 2, 7, "#d6a07a");

    // Koerper: Tunika
    R(2.5, 11, 7, 10, "#e0743a");
    R(2.5, 11, 7, 1.2, "#f09a5a");
    R(2.5, 18, 7, 1.4, "#8a4a22");   // Guertel
    R(5.2, 18, 1.6, 1.4, "#f2c14e"); // Schnalle
    R(2.5, 20, 7, 1, "#b85a2a");

    // Kopf
    R(3, 5, 6, 6.5, "#f0b98f");
    R(3, 10.5, 6, 1, "#d6a07a");
    R(6.9, 7.2, 1.3, 1.8, "#2a1a14");   // Auge
    R(7.1, 7.3, 0.5, 0.6, "#ffffff");
    R(6.6, 9.6, 1.8, 0.6, "#a8562f");   // Mund
    R(5.6, 8.6, 0.8, 0.6, "#e49a78");   // Wange
    R(3, 5, 1.6, 4.5, "#6a3d1f");       // Haar hinten

    // Strohhut
    R(0.5, 4, 11, 1.6, "#e8c25a");
    R(0.5, 5, 11, 0.6, "#b8902f");
    R(3, 1.2, 6, 3.2, "#f0d070");
    R(3, 3.2, 6, 0.9, "#c0452f");       // Hutband

    // vorderer Arm
    R(7.6 + schwung * 1.2, 12, 2, 7, "#f0b98f");
    R(7.6 + schwung * 1.2, 18.2, 2, 1.4, "#e49a78");

    ctx.restore();
  }

  function zeichneZiel(ctx, px_, py_, groesse, erreichbar) {
    var x = Math.round(px_), y = Math.round(py_), g = Math.round(groesse);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.strokeRect(x + 0.5, y + 0.5, g - 1, g - 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = erreichbar ? "#ffffff" : "#ff4d4d";
    ctx.strokeRect(x + 1.5, y + 1.5, g - 3, g - 3);
    if (!erreichbar) {
      ctx.fillStyle = "rgba(255,77,77,0.15)";
      ctx.fillRect(x + 2, y + 2, g - 4, g - 4);
    }
    ctx.restore();
  }

  // ---- Material-Leiste ----
  function zeichneLeiste(ctx, breitePx, hoehePx, leiste, auswahlIndex, bestand) {
    if (!leiste || !leiste.length) return;
    var n = leiste.length;
    var slot = Math.max(36, Math.min(60, Math.floor((breitePx - 24) / n) - 6));
    var luecke = 6;
    var gesamt = n * slot + (n - 1) * luecke;
    var pad = 8;
    var x0 = Math.round((breitePx - gesamt) / 2);
    var y0 = Math.round(hoehePx - slot - 14 - pad);
    var icon = slot - 14;
    var schrift = Math.max(11, Math.round(slot * 0.26));

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "rgba(48,30,18,0.82)";
    ctx.fillRect(x0 - pad, y0 - pad, gesamt + pad * 2, slot + pad * 2);
    ctx.fillStyle = "#c9a35a";
    ctx.fillRect(x0 - pad, y0 - pad, gesamt + pad * 2, 2);
    ctx.fillRect(x0 - pad, y0 + slot + pad - 2, gesamt + pad * 2, 2);

    for (var i = 0; i < n; i++) {
      var sx = x0 + i * (slot + luecke);
      var aktiv = i === auswahlIndex;
      ctx.fillStyle = aktiv ? "rgba(255,236,170,0.28)" : "rgba(0,0,0,0.32)";
      ctx.fillRect(sx, y0, slot, slot);
      zeichneBlock(ctx, leiste[i], sx + 7, y0 + 5, icon);
      ctx.lineWidth = aktiv ? 3 : 1;
      ctx.strokeStyle = aktiv ? "#ffd75a" : "#8a6a3a";
      ctx.strokeRect(sx + (aktiv ? 1.5 : 0.5), y0 + (aktiv ? 1.5 : 0.5), slot - (aktiv ? 3 : 1), slot - (aktiv ? 3 : 1));
      // Nummer oben links
      ctx.font = "bold " + Math.round(schrift * 0.85) + "px monospace";
      ctx.textBaseline = "top"; ctx.textAlign = "left";
      ctx.fillStyle = "#000"; ctx.fillText(String(i + 1), sx + 4, y0 + 3);
      ctx.fillStyle = aktiv ? "#ffd75a" : "#e8d8b0"; ctx.fillText(String(i + 1), sx + 3, y0 + 2);
      // Anzahl unten rechts
      var anz = bestand && bestand[leiste[i]] != null ? bestand[leiste[i]] : 0;
      ctx.font = "bold " + schrift + "px monospace";
      ctx.textBaseline = "alphabetic"; ctx.textAlign = "right";
      ctx.fillStyle = "#000"; ctx.fillText(String(anz), sx + slot - 3, y0 + slot - 3);
      ctx.fillStyle = anz > 0 ? "#ffffff" : "#ff8a7a"; ctx.fillText(String(anz), sx + slot - 4, y0 + slot - 4);
    }
    ctx.restore();
  }

  SPIEL.grafik = {
    init: init,
    zeichneHimmel: zeichneHimmel,
    zeichneBlock: zeichneBlock,
    zeichneSpieler: zeichneSpieler,
    zeichneZiel: zeichneZiel,
    zeichneLeiste: zeichneLeiste
  };
})();
