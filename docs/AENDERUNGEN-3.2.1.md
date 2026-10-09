# Spielraum 3.2.1 · Fehlerkorrekturen

Stand: 9. Oktober 2026 · Auslöser: Rückmeldungen des Nutzers.

## Was sich für Dich ändert

- **Einnahmen, Rücklagen und Topf-Bewegungen lassen sich wieder löschen.** Im Bearbeiten-Dialog steht unten „Ab {Monat} entfernen“ (bei einmaligen Posten „Posten löschen“), mit „Rückgängig“. Seit 3.0 fehlte dieser Knopf, weil nur das Detailblatt der Ausgaben einen hatte.
- **Bestand eines Topfs anpassen** ist im Topfblatt jetzt der Hauptknopf „Bestand anpassen“. Er ändert nur den Topf und legt keinen Posten an. „Einzahlung“ und „Entnahme“ heißen jetzt „einplanen“, weil sie Planposten anlegen (die Entnahme erscheint als Einnahme im Monat).
- **Ein eingetragener Bestand verschwindet nicht mehr im Folgemonat.** Ursache: Töpfe aus dem Wunsch-Fahrplan starten mit einem Bestand von 0 € in ihrem Startmonat. Ein früher eingetragener Bestand wurde dort wieder auf 0 € zurückgesetzt. Jetzt wird so ein 0-€-Startpunkt beim Eintragen eines früheren Bestands entfernt, und der Bestand läuft mit den geplanten Einzahlungen fortlaufend weiter.
- Ist für einen späteren Monat ein eigener Bestand mit Geld eingetragen, bleibt er bestehen und gilt ab dort wieder. Der Dialog „Bestand anpassen“ weist jetzt darauf hin.

## Technisch

- `correctPot` entfernt den frühesten Eintrag, wenn er nach dem neuen Monat liegt und 0 € beträgt. Neu: `laterCheckpoints`.
- Löschen-Knopf im Editor nutzt den vorhandenen Handler `delete-item` und `deletePost` (Undo bleibt).
- Service-Worker-Cache `v3-4`, Version 3.2.1. Datenformat und Speicherschlüssel unverändert, keine Migration.

## Geprüft

- `npm test`: 60 Fachtests (2 neu: Bestand vor späterem 0-€-Start läuft fort; später eingetragener Bestand mit Geld bleibt), UI-Ablauf mit neuem Block (Löschen im Editor mit Rückgängig, Topfblatt-Reihenfolge). `npm run check` ohne Befund.

## Nicht geklärt

- Gemeldet wurde, dass eine ab Dezember geplante Einzahlung im Oktober mitgezählt wurde. Das ließ sich mit Testdaten nicht nachstellen: Die Rechnung zählt Posten erst ab ihrem Startmonat. Wenn es wieder passiert, bitte Startmonat, Rhythmus und den Topf des Postens nennen.
