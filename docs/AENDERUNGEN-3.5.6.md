# Spielraum 3.5.6 · Raten nach Budget-Monat wählen

Stand: 25. Oktober 2026 · Auslöser: Der Nutzer legte eine Urlaub-Rate „ab Januar“ an. Die App buchte sie erstmals Ende Januar und belastete damit erst das Februar-Budget. Gemeint war: Die Januar-Rate kommt vom Gehalt Ende Dezember und belastet das Januar-Budget.

## Befund
Die Berechnung war nicht falsch. Eine Rate im Monat M geht Ende M ab (Nutzer bestätigt: eine Oktober-Rate ist am 25. Oktober noch nicht im Topf) und zählt für das Budget von M+1. Falsch war die Beschriftung und die Eingabe: „ab Januar“ klang nach Januar-Budget.

## Was sich ändert
- **Raten-Dialog:** Das Feld heißt „Belastet das Budget ab“ und bietet zwölf Monate an, jeweils mit „Überweisung Ende <Vormonat>“. Gespeichert wird der Vormonat. Eine Rate „ab Januar-Budget“ ist damit ein Posten ab Dezember.
- **Monat:** Für Raten in einem Topf ist die graue Zeile „geht Ende Januar ab · zählt für Februar“ weg. Stattdessen steht unter „Sparen“ ein Hinweis: „Ende Januar gehen noch 250,00 € in Rücklagen. Das zählt für Februar.“ Alte Sparposten ohne Topf behalten die graue Zeile, weil man sie nur dort bearbeiten kann.
- **Vorschau beim Beenden einer Rate:** nennt jetzt den Budget-Monat, ab dem die Rate nicht mehr belastet.

## Unverändert
- Berechnung, Sparen-Summen (Anfang/Ende), gespeicherte Daten und Datenformat. Keine Migration. Bestehende Raten bleiben, wie sie sind. Wer eine Rate eine Zeile früher belasten lassen will, stellt den Beginn auf den Vormonat.

## Technisch
- `savings-ui.js` (`monthOptions`, Vorschau), `month-ui.js` (Hinweis statt Folgemonat-Zeilen). Service-Worker-Cache `v3-13`.
