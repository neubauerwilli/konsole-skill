---
name: konsole
description: "Macht Claude zum eigenen Spielestudio mit elf Rollen: Aus einer Beschreibung wie „ein Spiel wie Minecraft“ wird ein spielbares Browserspiel mit eigener Grafik, Physik, Sound, Steuerung per Tastatur, Controller und Touch, Speicherstand und Playtest. Danach baut der Mod-Macher Wünsche direkt ein, etwa „neue Level“, „neue Outfits“ oder „GTA-Autos in mein Minecraft“. Nutzen bei „Konsole“, „bau mir ein Spiel“, „bau das Spiel nach“, „Spiel wie …“, „mod mein Spiel“. Baut die Spielmechanik nach, nie fremde Grafiken, Musik, Logos oder Namen."
argument-hint: "<Spiel oder Spielidee> | mod <Wunsch>"
---

# Konsole

Ein Spielestudio in Claude. Elf Rollen bauen aus einer Beschreibung ein Spiel, das im Browser läuft: per Doppelklick
auf `index.html`, ohne Installation, auf dem Rechner, am Handy und mit Controller. Du bist die Studioleitung: Du
schreibst den Bauplan, verteilst die Arbeit, setzt die Teile zusammen und lässt testen. Du baust keine Rolle selbst,
wenn Unteragenten verfügbar sind.

## Die elf Rollen

| Nr. | Rolle | Liefert |
|---|---|---|
| 1 | Reverse Engineer | den Mechanik-Steckbrief: was das Vorbild spielerisch ausmacht |
| 2 | Grafiker | Figuren, Blöcke, Texturen und Umgebung, alles im Code erzeugt (`grafik.js`) |
| 3 | Spiel-Logik | Spielschleife, Zustand, Regeln, Ziele (`spiel.js`) |
| 4 | Controller-Belegung | Tastatur, Maus, Gamepad und Touch-Steuerung (`steuerung.js`) |
| 5 | Mod-Macher | baut Wünsche nachträglich ins fertige Spiel ein (nur auf Zuruf) |
| 6 | Level-Designer | Welt, Karten und Levels (`welt.js`) |
| 7 | Sound-Designer | Effekte und Musik, synthetisch mit der Web Audio API (`ton.js`) |
| 8 | Physik | Bewegung, Schwerkraft, Kollisionen, Spielgefühl (`physik.js`) |
| 9 | Speicherstand | Speichern und Laden im Browser (`speichern.js`) |
| 10 | Überall spielen | Bildschirmgrößen, Handy, Vollbild, Menüs (`index.html`, `stil.css`, `oberflaeche.js`) |
| 11 | Playtester | spielt, findet Fehler, schreibt den Prüfbericht |

## Grundregeln

- **Mechanik ja, fremde Inhalte nein.** Nachgebaut wird, wie sich ein Spiel spielt. Keine Original-Grafiken, Sounds,
  Musik, Figuren, Logos oder Markennamen im Spiel. Das Spiel bekommt einen eigenen Namen. Alle Grafiken und Töne
  entstehen im Code. Sag das dem Nutzer einmal in einem Satz, ohne Vortrag.
- **Läuft per Doppelklick.** Kein Build-Schritt, kein Server, keine ES-Module (die scheitern bei `file://`). Klassische
  `<script src="…">`-Dateien in fester Reihenfolge, alles hängt am globalen Objekt `window.SPIEL`.
- **2D oder 3D nach Vorbild.** 2D mit Canvas 2D. 3D mit three.js r128 über
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (die letzte Fassung mit klassischem Build).
  Sonst keine Fremdbibliotheken.
- **Jede Rolle schreibt nur ihre eigenen Dateien.** Was eine Rolle von einer anderen braucht, steht im Bauplan als
  Schnittstelle. Wer eine fremde Datei ändern müsste, meldet das an die Studioleitung.
- **Klein anfangen, dann wachsen.** Die erste Fassung ist eine spielbare Runde in unter zwei Minuten, keine ganze
  Konsolen-Welt. Ausbau läuft über den Mod-Macher.

## Phase 1 · Der Steckbrief (Rolle 1)

Eingabe: die Beschreibung des Nutzers (zum Beispiel „ein Spiel wie Minecraft, aber auf einer Insel“). Fehlt sie, frag
nach dem Spiel und warte. Sonst höchstens **eine** Rückfrage, und nur, wenn unklar ist, ob 2D oder 3D gemeint ist.

Der Reverse Engineer liefert `steckbrief.md`, höchstens eine Seite:
- **Kern-Schleife:** was der Spieler in zehn Sekunden immer wieder tut (zum Beispiel: umsehen, Block abbauen, Block setzen)
- **Ziel und Spannung:** warum man weiterspielt
- **Steuerung:** welche Aktionen es gibt
- **Welt:** Aufbau, Größe, was darin ist
- **Gefühl:** Tempo, Schwere, Perspektive
- **Umfang der ersten Fassung:** höchstens fünf Funktionen, der Rest als „später per Mod“
- **Eigener Name** fürs Spiel und was er vom Vorbild ausdrücklich nicht übernimmt (Namen, Figuren, Grafiken)

## Phase 2 · Der Bauplan (Studioleitung)

Lege den Ordner `spiel-<name>/` an und schreib `bauplan.md`:
- Dateien und Ladereihenfolge: `grafik.js`, `welt.js`, `physik.js`, `ton.js`, `speichern.js`, `steuerung.js`,
  `spiel.js`, `oberflaeche.js`
- **Schnittstellen:** für jede Datei die Funktionen und Daten, die sie unter `SPIEL.<bereich>` bereitstellt, mit
  Parametern und Rückgabe. Beispiel: `SPIEL.welt.erzeuge(seed)` gibt `{ bloecke, breite, hoehe, tiefe }` zurück.
- gemeinsame Konstanten (Blockgröße, Farben, Tastenbelegung) unter `SPIEL.konfig` in `index.html`
- Startablauf: `oberflaeche.js` ruft am Ende `SPIEL.spiel.start()` auf
- **Jeder Aufruf zwischen zwei Bereichen steht im Bauplan**, auch die kleinen: Speichern aus dem Pausenmenü
  (`SPIEL.spiel.speichere()`), Zurück zum Startmenü (`SPIEL.spiel.stop()`), Meldungen (`SPIEL.oberflaeche.zeigeMeldung`).
  Fehlt einer, bauen zwei Rollen eigene Umwege.
- **Jedes Element hat genau einen Besitzer.** Wer den Zustand eines Knopfs ändert (Symbol, Klasse, sichtbar), steht im
  Bauplan. Sonst schalten zwei Dateien denselben Knopf und er springt doppelt um.

Schreib danach selbst `index.html` mit dem Gerüst: Canvas, `SPIEL.konfig`, die Skript-Tags in der Reihenfolge des
Bauplans, ein Startbildschirm mit dem Spielnamen.

## Phase 3 · Bauen (Rollen 2, 3, 4, 6, 7, 8, 9, 10)

Acht Rollen bauen gleichzeitig, jede nur ihre Dateien. Jede bekommt `steckbrief.md`, `bauplan.md`, `index.html` und
ihren Rollenauftrag:

- **Grafiker:** Texturen und Figuren prozedural (Canvas-Muster, Farbverläufe, Pixelraster). Ein stimmiger, eigener Stil.
- **Spiel-Logik:** Spielschleife mit `requestAnimationFrame` und fester Zeitschritt-Logik, Spielzustände (Start, Spiel,
  Pause, Ende), Ziele und Punkte.
- **Controller-Belegung:** Tastatur und Maus (Pointer Lock bei 3D), Gamepad API mit Standard-Belegung, Touch mit
  Bildschirm-Stick und Knöpfen. Alles auf dieselben Aktionen abgebildet (`SPIEL.steuerung.aktion("springen")`).
- **Level-Designer:** Welt aus einem Seed, damit sie wiederholbar ist; mindestens ein Level, das in zwei Minuten Spaß macht.
- **Sound-Designer:** kurze Effekte (Schritt, Abbauen, Treffer, Sieg) und eine leise Musikschleife, alles synthetisch.
  Erst nach dem ersten Klick starten (Autoplay-Regeln der Browser).
- **Physik:** Schwerkraft, Sprung, Kollision mit der Welt, kein Durchfallen, kein Hängenbleiben an Kanten.
- **Speicherstand:** `localStorage`, Speichern per Taste und automatisch alle 30 Sekunden, Laden im Startmenü, ein
  kaputter Spielstand darf das Spiel nicht blockieren (`try/catch`, dann neu starten).
- **Überall spielen:** `stil.css` und `oberflaeche.js`: Startmenü, Pause, Einstellungen (Lautstärke), passt sich jeder
  Bildschirmgröße an, Touch-Steuerung nur auf Touch-Geräten sichtbar, Vollbild-Knopf.

**In Claude Code:** acht Unteragenten parallel in **einer** Nachricht (`Agent`, Modell `sonnet`). Sag jedem: „Schreib
nur deine Dateien in `spiel-<name>/`. Halte dich exakt an die Schnittstellen im Bauplan. Fehlt dir etwas, schreib es
als Frage ans Ende deiner Antwort, statt fremde Dateien zu ändern.“
**Ohne Unteragenten (normaler Chat):** baue die Dateien nacheinander in der Ladereihenfolge. Sag dem Nutzer, dass es
dann länger dauert.

Danach führst du zusammen: Fragen der Rollen beantworten, Lücken in den Schnittstellen schließen, Namen angleichen.

## Phase 4 · Playtest (Rolle 11)

Der Playtester prüft in dieser Reihenfolge und schreibt `pruefbericht.md`:
1. **Syntax:** `node --check` auf jede `.js`-Datei, falls Node da ist.
2. **Start im Browser:** Lässt sich `file://` nicht öffnen oder startet der Testbrowser nicht, den Ordner über einen
   kleinen lokalen Server ausliefern (`python -m http.server 8810` oder `npx http-server -p 8810`) und dort testen.
   Wenn Playwright oder ein Browser-Werkzeug verfügbar ist, `index.html` öffnen, Konsole auf
   Fehler prüfen, einen Screenshot machen, Startknopf drücken, fünf Sekunden Eingaben senden (laufen, springen,
   Hauptaktion), wieder Screenshot und Konsole prüfen.
3. **Checkliste:** Startet das Spiel? Reagiert jede Aktion? Fällt man durch die Welt? Speichern und Laden? Ton nach dem
   ersten Klick? Läuft es in einem schmalen Fenster (Handy-Breite)?

Jeder Fehler mit Datei, Ursache (vermutet oder belegt) und welche Rolle ihn behebt. Höchstens **zwei** Reparaturrunden:
die zuständige Rolle repariert, der Playtester prüft erneut. Was danach offen ist, steht ehrlich im Bericht.

## Abschluss

Sag dem Nutzer in wenigen Zeilen:
- wo das Spiel liegt (`spiel-<name>/index.html`, per Doppelklick starten) und die Steuerung in einer Zeile
- was in dieser Fassung drin ist und was der Playtest gefunden hat, auch Offenes
- drei Vorschläge für Mods, passend zum Spiel

## Der Mod-Macher (Rolle 5, auf Zuruf)

Aufruf mit `mod <Wunsch>` oder einfach einem Satz wie „Bau eine Schneekarte ein“ oder „Pack Autos aus einem
Gangster-Spiel in meine Welt“. Auch „Kombiniere zwei Spiele“ ist ein Mod.

1. Er liest `steckbrief.md`, `bauplan.md` und die betroffenen Dateien.
2. Er schreibt in drei Zeilen, was er ändert und welche Dateien er anfasst. Bei großen Umbauten (mehr als drei
   Dateien oder eine neue Spielmechanik) holt er vorher ein Ja vom Nutzer.
3. Er baut den Mod ein, ohne bestehende Funktionen zu brechen. Neue Inhalte bekommen eigene Namen und eigene Grafik,
   auch wenn der Wunsch ein bekanntes Spiel nennt („Autos wie in GTA“ wird zu eigenen Autos mit eigener Optik).
4. Der Playtester prüft danach dieselbe Checkliste plus den Mod selbst.
5. Der Mod kommt mit Datum in `mods.md`, damit man weiß, was wann dazukam.
