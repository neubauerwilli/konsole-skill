# Bauplan: Inselbau

2D, Seitenansicht, Canvas 2D. Start per Doppelklick auf `index.html`. Keine Module, keine Fremdbibliotheken.
Alles hängt an `window.SPIEL`. Einheiten in der Welt sind **Kacheln** (1 Kachel = `SPIEL.konfig.KACHEL` Pixel).
Weltkoordinate y wächst nach unten (Zeile 0 ist oben).

## Ladereihenfolge
`grafik.js`, `welt.js`, `physik.js`, `ton.js`, `speichern.js`, `steuerung.js`, `spiel.js`, `oberflaeche.js`

## SPIEL.konfig (steht in index.html)
```js
KACHEL: 32, BREITE: 120, HOEHE: 64, SEED: 20261023,
BLOCK: { LUFT:0, GRAS:1, ERDE:2, STEIN:3, SAND:4, HOLZ:5, BLAETTER:6, WASSER:7, ERZ:8 },
LEISTE: [1,2,3,4,5,6],   // Material-Leiste, Block-IDs
REICHWEITE: 5,            // Kacheln vom Spieler bis zum Zielblock
AUTOSPEICHERN_MS: 30000
```

## grafik.js · SPIEL.grafik
- `init()` erzeugt einmalig die Block-Texturen (Offscreen-Canvas je Block-ID, 16x16 Pixelraster, auf KACHEL skaliert ohne Glättung).
- `zeichneHimmel(ctx, breitePx, hoehePx, tageszeit)` tageszeit 0..1 (0 Morgen, 0.5 Mittag, 1 Abend), Verlauf plus ferne Hügel.
- `zeichneBlock(ctx, id, px, py, groesse)` zeichnet Block `id` an Bildschirmpixel `px,py`. LUFT zeichnet nichts.
- `zeichneSpieler(ctx, px, py, breitePx, hoehePx, blickRechts, laufPhase)` px,py = linke obere Ecke in Bildschirmpixeln; laufPhase 0..1 für Beinanimation. Eigene Figur, kein Würfelkopf.
- `zeichneZiel(ctx, px, py, groesse, erreichbar)` Rahmen um den anvisierten Block (weiß wenn erreichbar, rot sonst).
- `zeichneLeiste(ctx, breitePx, hoehePx, leiste, auswahlIndex, bestand)` Material-Leiste unten mittig; bestand = Objekt {blockId: anzahl}.

## welt.js · SPIEL.welt
- `erzeuge(seed)` gibt `{ breite, hoehe, bloecke: Uint8Array(breite*hoehe), spawn: {x, y} }` zurück. Insel in der Mitte (Hügel, Gras oben, Erde, darunter Stein mit ERZ-Adern, eine kleine Höhle), Sandränder, links und rechts WASSER bis zur Meereshöhe, ein paar Bäume (HOLZ-Stamm, BLAETTER-Krone). Gleicher Seed ergibt gleiche Welt (eigener kleiner Zufallsgenerator, nicht Math.random). spawn liegt auf der Oberfläche nahe der Mitte, in Kacheln.
- `hole(welt, x, y)` Block-ID an ganzzahligen Kachelkoordinaten. Außerhalb links/rechts: WASSER unterhalb der Meereshöhe, sonst LUFT. Unterhalb der Welt: STEIN. Oberhalb: LUFT.
- `setze(welt, x, y, id)` setzt, wenn innerhalb der Welt; gibt true/false zurück.
- `istFest(id)` true für alles außer LUFT und WASSER.

## physik.js · SPIEL.physik
- `neuerKoerper(x, y)` gibt `{ x, y, vx: 0, vy: 0, breite: 0.75, hoehe: 1.75, amBoden: false, blickRechts: true }` zurück (x,y = linke obere Ecke in Kacheln).
- `schritt(koerper, welt, dt, eingabe)` dt in Sekunden (fest 1/60), eingabe `{ links, rechts, springen }` (booleans). Laufen etwa 5 Kacheln/s mit kurzer Beschleunigung, Schwerkraft etwa 30 Kacheln/s², Sprung hoch genug für gut einen Block (etwa 1,4 Kacheln), Kollision getrennt auf x und y gegen `SPIEL.welt.istFest`, kein Durchfallen, kein Hängenbleiben an Kanten. Im Wasser langsamer und sanft schwimmend. Setzt `blickRechts` und `amBoden`. Gibt `{ gelandet: bool, gesprungen: bool, gelaufen: bool }` zurück.
- `ueberlappt(koerper, bx, by)` true, wenn der Körper die Kachel bx,by berührt (damit man keinen Block in sich selbst setzt).

## ton.js · SPIEL.ton
- `init()` erzeugt den AudioContext (erst nach einer Nutzeraktion aufrufen; mehrfacher Aufruf harmlos).
- `spiele(name)` name: "schritt", "sprung", "abbauen", "setzen", "speichern", "klick". Kurz, synthetisch.
- `musik(an)` leise, ruhige Musikschleife an/aus.
- `lautstaerke(wert)` 0..1, gilt für alles.
Ohne init() tut jede Funktion nichts und wirft keinen Fehler.

## speichern.js · SPIEL.speichern
- `speichere(zustand)` zustand `{ welt, spieler: {x, y}, auswahl, bestand }`; schreibt nach localStorage (`inselbau-spielstand`), Blöcke kompakt (z. B. als Base64 oder Lauflängen-Kodierung). Gibt true/false.
- `lade()` gibt zustand im selben Format (welt.bloecke wieder als Uint8Array) oder null bei fehlendem/kaputtem Stand (try/catch).
- `vorhanden()` true/false. `loesche()`.

## steuerung.js · SPIEL.steuerung
- `init(canvas)` Tastatur (A/D oder Pfeile laufen, W/Leertaste/Pfeil hoch springen, 1 bis 6 Material, Mausrad wechselt, S oder F5 nicht: **K** speichert, Esc oder P Pause), Maus (links halten = abbauen, rechts = setzen, Kontextmenü unterdrücken), Gamepad (linker Stick/Steuerkreuz laufen, A springen, RT/R2 abbauen, LT/L2 setzen, LB/RB Material, Start Pause; Ziel per rechtem Stick relativ zur Figur), Touch über die vorhandenen Elemente `#touch-links`, `#touch-rechts`, `#touch-springen`, `#touch-modus` (Modus wechselt zwischen Abbauen und Setzen) und Tippen auf die Welt.
- `zustand()` einmal pro Frame aufrufen. Gibt zurück:
  `{ links, rechts, springen, abbauenGehalten, setzenGedrueckt, zeiger: {x, y, aktiv} | null, zeigerRelativ: {dx, dy} | null, auswahlWechsel, auswahlDirekt, speichern, pause }`
  zeiger in Canvas-Pixeln (Maus oder Tippen). zeigerRelativ (Gamepad, rechter Stick) in Kacheln relativ zur Spielermitte. auswahlWechsel -1/0/+1, auswahlDirekt Index 0..5 oder null. setzenGedrueckt, speichern, pause und auswahl* sind nur im Frame des Drückens true (Flanken). Beim Tippen auf die Welt: im Modus Abbauen gilt abbauenGehalten solange der Finger liegt, im Modus Setzen ist setzenGedrueckt beim Antippen true.
- `istTouch()` true auf Touch-Geräten.

## spiel.js · SPIEL.spiel
- `start(optionen)` optionen `{ laden: bool }`. Lädt über `SPIEL.speichern.lade()` oder erzeugt neu mit `SPIEL.welt.erzeuge(SPIEL.konfig.SEED)`. Startet die Schleife mit `requestAnimationFrame` und festem Zeitschritt 1/60.
- Je Frame: `SPIEL.steuerung.zustand()`, Pause prüfen, `SPIEL.physik.schritt`, Kamera folgt weich, Zielblock aus Zeiger (Bildschirm zu Welt über Kamera) oder zeigerRelativ, Reichweite prüfen, Abbauen braucht etwa 0,4 s Halten (Stein 0,8 s) und legt den Block in `bestand`, Setzen nimmt aus `bestand` (nicht in sich selbst, nicht in WASSER-freie Luft ohne Nachbarn: mindestens ein fester Nachbar), Töne über `SPIEL.ton.spiele`, Autospeichern alle `AUTOSPEICHERN_MS`, Speichern per Taste mit Meldung.
- Zeichnen: Himmel, sichtbare Blöcke, Spieler, Ziel, Leiste, oben links kleines Ziel „10 Holz, 5 Stein“ mit Fortschritt.
- Tageszeit läuft langsam von 0 bis 1 in etwa 5 Minuten und zurück.
- `pause(an)`, `istPausiert()`. Bei Pause ruft es `SPIEL.oberflaeche.zeigePause()` auf.
- Startbestand: je 10 von jedem Leisten-Material.

## oberflaeche.js + stil.css · SPIEL.oberflaeche
- Beim Laden der Seite: Canvas `#spielfeld` auf Fenstergröße (bei resize anpassen, Pixel ohne Glättung), Startmenü `#startmenue` zeigen. Knopf „Neues Spiel“ und, wenn `SPIEL.speichern.vorhanden()`, „Weiterspielen“. Klick: `SPIEL.ton.init()`, `SPIEL.ton.musik(true)`, `SPIEL.steuerung.init(canvas)`, `SPIEL.grafik.init()`, `SPIEL.spiel.start({laden})`, Menü ausblenden.
- `zeigePause()` Pausenmenü `#pausenmenue` mit Weiter (ruft `SPIEL.spiel.pause(false)`), Speichern, Lautstärke-Regler (`SPIEL.ton.lautstaerke`), Vollbild-Knopf, Zum Startmenü.
- `zeigeMeldung(text)` kurze Einblendung `#meldung` für 2 s.
- Touch-Knöpfe `#touch-steuerung` nur sichtbar, wenn `SPIEL.steuerung.istTouch()`. Großzügige Trefferflächen, nichts verdeckt die Leiste.
- Ruft am Ende nichts automatisch auf außer das Startmenü zu zeigen.
- Stil: eigener, warmer Pixel-Look, gut lesbar am Handy.
