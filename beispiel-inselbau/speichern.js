/* speichern.js - SPIEL.speichern: Spielstand in localStorage (klassisches Skript, keine Module) */
(function (global) {
  "use strict";

  var SPIEL = global.SPIEL = global.SPIEL || {};
  var SCHLUESSEL = "inselbau-spielstand";
  var VERSION = 1;

  function speicher() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  function zahl(v, std) {
    return (typeof v === "number" && isFinite(v)) ? v : std;
  }

  // Lauflaengen-Kodierung: je Lauf 3 Bytes (Wert, Laenge niedrig, Laenge hoch), dann Base64.
  function kodiere(bloecke) {
    var out = [];
    var n = bloecke.length, i = 0;
    while (i < n) {
      var wert = bloecke[i], lauf = 1;
      while (i + lauf < n && bloecke[i + lauf] === wert && lauf < 65535) lauf++;
      out.push(wert & 255, lauf & 255, (lauf >> 8) & 255);
      i += lauf;
    }
    var s = "";
    for (var k = 0; k < out.length; k += 8192) {
      s += String.fromCharCode.apply(null, out.slice(k, k + 8192));
    }
    return global.btoa(s);
  }

  function dekodiere(text, laenge) {
    var s = global.atob(text);
    if (s.length % 3 !== 0) return null;
    var res = new Uint8Array(laenge);
    var pos = 0;
    for (var i = 0; i < s.length; i += 3) {
      var wert = s.charCodeAt(i);
      var lauf = s.charCodeAt(i + 1) | (s.charCodeAt(i + 2) << 8);
      if (lauf < 1 || pos + lauf > laenge) return null;
      if (wert !== 0) res.fill(wert, pos, pos + lauf);
      pos += lauf;
    }
    return pos === laenge ? res : null;
  }

  function bereinigeBestand(b) {
    var res = {};
    if (b && typeof b === "object") {
      for (var k in b) {
        if (Object.prototype.hasOwnProperty.call(b, k)) {
          var v = b[k];
          if (typeof v === "number" && isFinite(v) && v > 0) res[k] = Math.floor(v);
        }
      }
    }
    return res;
  }

  function maxBlockId() {
    var m = 255;
    try {
      var bl = SPIEL.konfig && SPIEL.konfig.BLOCK;
      if (bl) {
        m = 0;
        for (var k in bl) if (typeof bl[k] === "number" && bl[k] > m) m = bl[k];
      }
    } catch (e) { m = 255; }
    return m;
  }

  function speichere(zustand) {
    try {
      var ls = speicher();
      if (!ls || !zustand || !zustand.welt) return false;
      var w = zustand.welt;
      var breite = w.breite | 0, hoehe = w.hoehe | 0;
      if (breite < 1 || hoehe < 1 || !w.bloecke || w.bloecke.length !== breite * hoehe) return false;
      var sp = zustand.spieler || {};
      var daten = {
        version: VERSION,
        welt: {
          breite: breite,
          hoehe: hoehe,
          spawn: { x: zahl(w.spawn && w.spawn.x, 0), y: zahl(w.spawn && w.spawn.y, 0) },
          bloecke: kodiere(w.bloecke)
        },
        spieler: { x: zahl(sp.x, 0), y: zahl(sp.y, 0) },
        auswahl: zahl(zustand.auswahl, 0) | 0,
        bestand: bereinigeBestand(zustand.bestand)
      };
      ls.setItem(SCHLUESSEL, JSON.stringify(daten));
      return true;
    } catch (e) {
      return false;
    }
  }

  function lade() {
    try {
      var ls = speicher();
      if (!ls) return null;
      var roh = ls.getItem(SCHLUESSEL);
      if (!roh) return null;
      var d = JSON.parse(roh);
      if (!d || d.version !== VERSION || !d.welt || typeof d.welt.bloecke !== "string") return null;
      var breite = d.welt.breite, hoehe = d.welt.hoehe;
      if (!(breite >= 1 && hoehe >= 1) || breite !== Math.floor(breite) || hoehe !== Math.floor(hoehe)) return null;
      if (breite * hoehe > 4000000) return null;
      var bloecke = dekodiere(d.welt.bloecke, breite * hoehe);
      if (!bloecke) return null;
      var max = maxBlockId();
      for (var i = 0; i < bloecke.length; i++) if (bloecke[i] > max) return null;
      var sp = d.spieler;
      if (!sp || typeof sp.x !== "number" || typeof sp.y !== "number" || !isFinite(sp.x) || !isFinite(sp.y)) return null;
      var spawn = d.welt.spawn || {};
      return {
        welt: {
          breite: breite,
          hoehe: hoehe,
          bloecke: bloecke,
          spawn: { x: zahl(spawn.x, 0), y: zahl(spawn.y, 0) }
        },
        spieler: { x: sp.x, y: sp.y },
        auswahl: Math.max(0, zahl(d.auswahl, 0) | 0),
        bestand: bereinigeBestand(d.bestand)
      };
    } catch (e) {
      return null;
    }
  }

  function vorhanden() {
    try {
      var ls = speicher();
      return !!(ls && ls.getItem(SCHLUESSEL));
    } catch (e) {
      return false;
    }
  }

  function loesche() {
    try {
      var ls = speicher();
      if (ls) ls.removeItem(SCHLUESSEL);
      return true;
    } catch (e) {
      return false;
    }
  }

  SPIEL.speichern = { speichere: speichere, lade: lade, vorhanden: vorhanden, loesche: loesche };
})(typeof window !== "undefined" ? window : globalThis);
