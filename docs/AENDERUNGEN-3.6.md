# Spielraum 3.6 · Ausgaben in Budgets benennen

Stand: 6. November 2026 · Auslöser: Wunsch des Nutzers, einzelne Beträge in Budgets optional zu benennen, um später nachzuvollziehen, wofür sie waren.

## Was sich ändert
- **Schnellerfassung (Plus-Taste):** Das Feld „Bezeichnung (optional)“ steht jetzt direkt unter dem Betrag. Bisher war es unter „Bezeichnung und Datum“ eingeklappt. Das Datum steht weiter eingeklappt unter „Datum ändern“.
- **Betrag zu einem Budget hinzufügen (Teilbetrag):** Der Dialog hat jetzt ebenfalls „Bezeichnung (optional)“.
- Ohne Bezeichnung heißt die Ausgabe wie bisher wie der Posten (zum Beispiel „Lebensmittel“).
- Die Bezeichnung erscheint im Detailblatt des Budgets unter „Zahlungen im …“ und in „Alle Käufe“. Nachträglich ändern lässt sie sich über die Zahlung (Feld „Name“).

## Technisch
- `recordPlannedExpense` nimmt optional `title` (getrimmt, höchstens 160 Zeichen; leer = Name des Postens). Das Feld `title` gab es an Ausgaben schon. Kein neues Datenfeld, keine Migration.
- `month-ui.js` (Schnellerfassung), `plan-payments-ui.js` (Teilbetrag), `.quick-title` in `app.css`. Service-Worker-Cache `v3-14`.

## Geprüft
- `npm test`: 64 Fachtests (davon 1 neu), UI-Ablauf um die Bezeichnung in beiden Dialogen und im Detailblatt erweitert. `npm run check` ohne Befund.
- Chromium 360 px, fiktive Daten: Schnellerfassung mit Bezeichnung, Anzeige im Detailblatt, keine Seitenfehler.
