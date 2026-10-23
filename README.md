# Konsole

Dein eigenes Spielestudio in Claude. Elf Rollen bauen aus einer Beschreibung wie „ein Spiel wie Minecraft“ ein spielbares Browserspiel: eigene Grafik, Physik, Sound, Tastatur, Controller und Touch, Speicherstand und Playtest. Danach baut der Mod-Macher deine Wünsche direkt ins Spiel ein.

## In Claude Code verwenden
Den Ordner unter `~/.claude/skills/konsole/` ablegen, sodass `SKILL.md` direkt darin liegt. Mit installiertem Git:

Windows (PowerShell):
```powershell
git clone https://github.com/neubauerwilli/konsole-skill "$env:USERPROFILE\.claude\skills\konsole"
```
Mac/Linux:
```bash
git clone https://github.com/neubauerwilli/konsole-skill ~/.claude/skills/konsole
```
Vorhandene Installation nicht erneut klonen oder ungeprüft überschreiben. Dann in Claude Code `/konsole ein Spiel wie Minecraft` aufrufen. [Offizielle Skill-Dokumentation](https://code.claude.com/docs/en/skills).

Am besten läuft der Skill in Claude Code, weil dort acht Rollen gleichzeitig an getrennten Dateien bauen und der Playtester das Spiel im Browser starten kann. In der Claude-App geht es auch, dann baut Claude die Dateien nacheinander.

## Die elf Rollen
Reverse Engineer · Grafiker · Spiel-Logik · Controller-Belegung · Mod-Macher · Level-Designer · Sound-Designer · Physik · Speicherstand · Überall spielen · Playtester

## So läuft es
Steckbrief des Vorbilds → Bauplan mit festen Schnittstellen → acht Rollen bauen gleichzeitig → Zusammenbau → Playtest mit bis zu zwei Reparaturrunden. Ergebnis: ein Ordner `spiel-<name>/`, Start per Doppelklick auf `index.html`, ohne Installation.

## Mods
`/konsole mod Bau eine Schneekarte ein` · `mod neue Outfits` · `mod Autos in meine Welt` · `mod kombiniere das mit einem Rennspiel`. Jeder Mod wird getestet und in `mods.md` festgehalten.

## Was der Skill nachbaut und was nicht
Er baut nach, wie sich ein Spiel spielt: Mechanik, Steuerung, Aufbau. Grafiken, Töne und Musik entstehen im Code, das Spiel bekommt einen eigenen Namen. Original-Inhalte, Figuren, Logos und Markennamen übernimmt er nicht. Der Skill ist kostenlos; Claude-Zugang und Nutzungslimits gelten separat. Ein Bau mit acht parallelen Rollen verbraucht entsprechend Nutzungslimit.

Von Willi Neubauer · Lizenz: [MIT](LICENSE).

## Beispiel und Prüfstand · 23.10.2026
Im Ordner [`beispiel-inselbau`](beispiel-inselbau/) liegt ein Spiel, das der Skill selbst gebaut hat: „Inselbau“, ein 2D-Blockbauspiel auf einer Insel, aus dem Satz „Ein kleines Spiel wie Minecraft, aber in 2D von der Seite, auf einer Insel“. Acht Rollen haben parallel gebaut, alle Dateien bestehen `node --check`. Im Browser getestet: Start, Laufen, Abbauen, Bestand, Speichern und Pausenmenü funktionieren, keine Konsolenfehler. Nicht getestet: echtes Gamepad und echtes Handy.
