# Spielraum 3.5.3 · Sparraten gehören zum Monat, für den das Gehalt ist

Stand: 25. Oktober 2026 · Auslöser: Fehlerbericht des Nutzers. Eine Rate, die Ende November vom Gehalt (= Geld für Dezember) abgeht, wurde in der App im November-Budget abgezogen. Der Dezember wirkte dadurch zu freigiebig, bis zum Januar.

## Ursache
Seit 3.5 kamen die festen Raten eines Planmonats erst am Ende dieses Monats im Topf an. Im Budget galten sie aber als Teil des Gehalts vom Ende des Vormonats. Bei gleichbleibenden Raten fiel der Versatz um einen Monat nicht auf, bei endenden oder wechselnden Raten schon.

## Regel ab 3.5.3
Ein Betrag gehört in den Monat, für den das Gehalt gedacht ist. Die Raten eines Planmonats gehen mit dem Gehalt am Ende des Vormonats in den Topf.

- **Stand im Monat (groß)** = alle Bewegungen des Planmonats, inklusive seiner Raten.
- **Stand am Monatsende (klein)** = zusätzlich die festen Raten des Folgemonats.
- **Ziel-Termin** = der Monat, in dem das Geld zur Verfügung steht. Ein Ziel, das mit dem Gehalt Ende November erreicht ist, hat den Termin Dezember.
- **Neue Raten:** Der Start ist standardmäßig der nächste Monat („ab Nov 2026 · Gehalt Ende Okt“). Der laufende Monat bleibt wählbar.
- **Jahreskosten-Rücklagen:** Sie beginnen mit dem nächsten Gehalt. Ist eine Zahlung vorher fällig, geht sie noch wie bisher vom Monat ab.
- Kontostand und „Noch frei“ rechnen unverändert, sie folgten schon dieser Regel.

## Für bestehende Daten
Es gibt keine Migration. Wer Raten bisher nach der alten Regel eingetragen hat (Rate im Monat der Überweisung), schiebt einmal ein Ziel per „Rate ändern“ bzw. Termin passend. Weicht der Stand im laufenden Monat dann genau um eine Rate vom echten Konto ab, korrigiert „Bestand anpassen“ das.

## Technisch und geprüft
- `savings-ui.js`: `nextRates()` und `atNow()` liefern den Stand am Monatsende. `goalInfo` nutzt `goalProgress` unverändert. Raten-Start standardmäßig im nächsten Monat. Die Jahreskosten-Anlage beginnt im Folgemonat.
- `sinking.js`: Schutz für Zahlungen, die vor dem ersten Ratenmonat fällig sind (`onlyLater`, keine Division durch 0).
- Service-Worker-Cache `v3-10`.
- `npm test`: 63 Fachtests (1 neu), UI-Ablauf 16 Blöcke (Stand im Monat mit Rate des Monats, Monatsende mit Folgerate, Jahreskosten ab nächstem Gehalt). Dazu `npm run check`.
