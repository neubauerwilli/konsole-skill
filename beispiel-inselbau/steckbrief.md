# Steckbrief: Inselbau

Beschreibung des Nutzers: „Ein kleines Spiel wie Minecraft, aber in 2D von der Seite, auf einer Insel.“
Technik: 2D, Canvas 2D, Seitenansicht.

## Kern-Schleife
In zehn Sekunden: laufen, einen Block vor sich anvisieren, abbauen, das Material einsammeln, an anderer Stelle wieder setzen. Mit dem Material wächst oder verändert sich die Insel.

## Ziel und Spannung
Kein Endboss. Man will die Insel formen: eine Hütte bauen, Höhlen graben, tiefer kommen. Spannung kommt aus der Frage, was unter dem nächsten Block liegt (Erz, Hohlraum, Wasser) und aus der Tageszeit: nachts wird es dunkel und man sucht sich einen geschützten Platz. Mini-Ziel der ersten Runde: zehn Holz und fünf Stein sammeln und damit ein kleines Haus bauen.

## Steuerung
- links/rechts laufen, springen
- Block abbauen (Maus halten oder Knopf)
- Block setzen
- Material wechseln (Leiste, Zahlentasten oder Wischen)
- Gamepad und Touch mit denselben Aktionen

## Welt
Eine Insel aus einem Raster von Blöcken (Seitenschnitt), etwa 120 breit und 64 hoch, aus einem Seed erzeugt. In der Mitte ein Hügel mit Gras, darunter Erde und Stein, an den Rändern Sand, links und rechts Wasser. Einige Bäume, ein paar Erzadern im Stein, eine kleine Höhle. Unter der Insel Tiefe, am Rand das Meer. Das Wasser ist in der ersten Fassung nur Kulisse.

## Gefühl
Ruhig, gemütlich, kein Zeitdruck. Mittleres Tempo, leichte Schwerkraft, kleiner Sprung über einen Block. Kamera folgt der Figur weich. Pixel-Optik mit klaren Farben, sanfter Wechsel von Tag und Abend.

## Umfang der ersten Fassung (höchstens fünf Funktionen)
1. Laufen und Springen mit Schwerkraft und Block-Kollision
2. Blöcke abbauen
3. Blöcke setzen aus einer Material-Leiste
4. Zufällige Insel aus einem Seed (Gras, Erde, Stein, Sand, Holz, Blätter)
5. Speichern und Laden der Insel im Browser

Später per Mod: Werkzeuge und Handwerk, Tag und Nacht mit Gegnern, Wasser das fließt, Tiere, Erz und Ausrüstung, Boot, weitere Inseln.

## Eigener Name und Abgrenzung
**Name: Inselbau.**
Nicht übernommen: Name, Figuren, Grafiken, Texturen, Musik und Logos des Vorbilds, ebenso die Welt in 3D und die Würfelfigur. Alles entsteht neu im Code: eigene Farben, eigene Pixelblöcke, eigene synthetische Töne. Übernommen wird nur die Spielidee: eine Welt aus Blöcken, die man abbaut und wieder setzt.
