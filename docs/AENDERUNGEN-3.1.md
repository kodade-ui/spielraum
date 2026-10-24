# Spielraum 3.1 · Paket 2 „Sparen“ und Paket 3 „Jahr“

Stand: 9. Oktober 2026 · Grundlage: freigegebenes Zielbild Monat · Sparen · Jahr aus dem Rundum-Check.

## Was sich für Dich ändert

- **Navigation unten:** Monat, Sparen, Plus-Taste, Jahr. Rücklagen und Ziele sind jetzt ein Bereich.
- **Sparen**
  - Oben steht, was Ende des Monats in allen Töpfen liegt, darunter Sparraten und was im Monat noch frei ist (dieselbe Zahl wie in „Monat“).
  - **Töpfe** sind eine Liste. Hat ein Topf ein Ziel, zeigt er Fortschritt und Status: „bis Juli 2027 gedeckt“ mit Puffer oder „40 € im Monat fehlen“ mit „Rate anpassen“. Ohne Ziel gibt es „Ziel für diesen Topf“.
  - Ein Topf antippen öffnet sein Blatt: Anfang, Ein, Aus, Ende, die Bewegungen des Monats, später eingeplante Bewegungen und die eingetragenen Bestände. Dort liegen Einzahlung, Entnahme, Bestand korrigieren, Topf bearbeiten und die Ziel-Aktionen.
  - **Wünsche** sind Ziele ohne Topf. Jeder Wunsch hat einen **Schieber für den Termin** (1–60 Monate). Beim Schieben siehst Du sofort die Monatsrate, die Zahl der Raten mit Zeitraum und was danach im ersten Sparmonat noch frei bleibt.
  - **„Sparplan starten“** legt mit einem Tipp einen Topf, das Zieldatum und eine monatliche Sparrate an. Der Plan beginnt im Folgemonat, damit der laufende Monat unverändert bleibt. Die Rate ist auf volle Euro aufgerundet. Mit „Rückgängig“ ist alles wieder weg.
- **Jahr**
  - Zwölf Balken ab dem gewählten Monat zeigen, was in jedem Monat frei bleibt. Ein goldener Punkt markiert Monate mit Sonderzahlungen (jährlich, vierteljährlich, einmalig). Oben stehen die Summe und der knappste Monat.
  - Einen Balken antippen zeigt den Monat: frei, Abweichung von einem üblichen Monat, Einnahmen/Ausgaben/Sparen und die Sonderzahlungen. „Öffnen“ springt in den Monat.
  - **Abos & Verträge:** alle festen wiederkehrenden Ausgaben mit ihren Kosten im Jahr, nach Größe sortiert, mit Summe und Monatsdurchschnitt. Posten wie „Handyvertrag“ zählen auch dann dazu, wenn sie unter einer variablen Kategorie stehen.
  - **Rückblick auf den Vormonat:** geplant gegen ausgegeben, je Kategorie mit Balken. Nicht abgehakte Rechnungen werden mit Betrag genannt, weil sie sonst wie eine Ersparnis aussehen würden.
- „Ein Blick nach vorn“ am Ende von „Monat“ ist entfallen, das Jahr ersetzt es.
- Wurde ein Monat mit einer früheren Version abgeschlossen, zeigt „Monat“ jetzt „Wieder öffnen“. Bisher gab es dafür keinen Weg mehr.

## Technisch

- Neu sind `savings-ui.js` (Bereich Sparen) und `year-ui.js` (Bereich Jahr). Beide rechnen nur über vorhandene Funktionen: `reserveSummary`, `goalProgress`, `saveGoal`, `createPot`, `upsertItem`, `forecast` und `reconcileMonth`.
- „Frei“ heißt überall `reconcileMonth(...).afterOpen`, also dieselbe Zahl wie in „Monat“. Für künftige Monate ohne Käufe ist das gleich dem Planüberschuss.
- Entfernt sind:
  - die Module `purchase.js`, `timeline.js`, `decision-assistant.js` und `reconciliation-graphics.js` samt ihren Tests;
  - in `reconciliation-ui.js` die alte Ausgabenansicht, der CSV-Import und der Monatsabschluss, 197 → 44 Zeilen;
  - die alten Renderer in `actuals-ui.js`, `plan-payments-ui.js`, `reserves-ui.js`, `goals-ui.js` und `budget-insights.js`;
  - die Diagrammfunktion für Browser-Assistenten, die einen Kreis zeigen wollte, den es nicht mehr gibt.
- Die Logik für gespeicherte Daten bleibt vollständig: `scenarios.js` (Journal), `planning-schema.js`, `scenarios-schema.js`, CSV-/Abschlussfunktionen in `reconciliation.js`. Alte Backups mit Entscheidungen, Zeitplan, Importregeln oder Abschlüssen bleiben gültig.
- In `app.css` gibt es neue Abschnitte für Sparen und Jahr. Regeln für Klassen, die nirgends mehr vorkommen, wurden entfernt (30,3 → 27,3 kB).
- Das Feld „Sparziel“ am Topf erscheint nur noch bei Töpfen, die schon eines haben; neue Ziele laufen über „Ziel setzen“. Das Ziel-Formular übernimmt den Topf, von dem aus es geöffnet wurde.
- Der Service-Worker-Cache heißt jetzt `v3-2`. Manifest, Adresse, Speicherschlüssel und Datenformat sind unverändert, es gibt keine Migration.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 53/53 Fachtests (9 entfallen mit den entfernten Modulen); UI-Ablauf: 14 Blöcke bestanden, neu: Schieber, Sparplan starten und rückgängig, Doppelstart-Schutz, Ziel am Topf, Topfblatt, Jahr mit 12 Balken, Monatswahl, Verträge, Rückblick |
| `npm run check` | 38 JS-Dateien, Module, Offline-Liste, Icons |
| Chromium 390/360 px hell, 390 px dunkel, fiktive Daten | keine Seitenfehler, kein horizontales Scrollen, alle verbliebenen Dialoge geöffnet und angesehen |
| Sparplan für 900 € über 6 Monate | 150 € ab November, Topf „Espressomaschine“, Status „bis Apr 2027 gedeckt“; Oktober unverändert |
| Update 3.0 → 3.1 im selben Browserprofil (Beispieldaten mit Töpfen, Zielen, Käufen) | Daten byte-identisch, Cache `v3-1` → `v3-2`, neue Bereiche zeigen Töpfe, Wünsche und das zuvor angelegte Abo |

## Nicht geprüft / Grenzen

- Kein Test auf Deinem Handy. Insbesondere den Schieber mit dem Daumen bitte selbst ausprobieren.
- Die Wunschrate ist eine einfache Teilung: Preis durch Monate. Bereits vorhandenes Geld zählt erst, wenn der Wunsch einen Topf hat. Danach rechnet der Topfstatus mit dem echten Bestand.
- Die Jahresbalken beginnen bei 0 €. Unterschiede von wenigen hundert Euro sehen deshalb klein aus. Das ist bewusst so, damit die Balken nichts übertreiben.
- Der Rückblick kennt nur erfasste Käufe. Was Du nicht einträgst, fehlt dort.
