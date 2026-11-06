# Spielraum 3.7 · Backup teilen, Bezeichnungen, Kontostand-Abgleich, Rate aussetzen, fällige Rechnungen

Stand: 6. November 2026 · Auslöser: Der Nutzer hat alle sechs vorgeschlagenen Erweiterungen beauftragt.

## Was sich für Dich ändert

1. **Backup über „Teilen“.** „Backup speichern“ öffnet auf dem Handy das Teilen-Menü (Mail an Dich, Cloud-Ordner, Messenger …). Wohin, entscheidest Du, die App sendet nichts selbst. Kann der Browser keine .json-Dateien teilen, kommt die Datei als .txt mit identischem Inhalt. „Wiederherstellen“ nimmt beides an. Ohne Teilen-Menü (z. B. am Rechner) startet wie bisher ein Download. Brichst Du das Teilen ab, gilt das Backup nicht als gemacht.
2. **Vorschläge beim Benennen.** Beim Tippen einer Bezeichnung schlägt die App Deine bisherigen Namen vor. Ein bekannter Name wählt das Budget vor, in das Du ihn zuletzt gebucht hast, bei „Ohne Budget“ auch die Kategorie. Hast Du vorher selbst ein Ziel angetippt, wählt die App nichts mehr um.
3. **Budget nach Bezeichnung.** Im Detailblatt eines Budgets steht „Wofür im …“, zum Beispiel „Wochenmarkt · 2× · 41,50 €“. Das erscheint, sobald es mindestens zwei Zahlungen und einen eigenen Namen gibt. Zahlungen ohne Namen stehen unter „Ohne Bezeichnung“.
4. **Kontostand-Abgleich.** Im Blatt „Auf dem Konto, geschätzt“ gibst Du den echten Kontostand und den Rest vor dem Gehalt ein. Die App sagt dann, ob es passt oder wie viel fehlt bzw. übrig ist. Fehlt Geld, bietet sie an, die Lücke als Ausgabe zu erfassen. Sind Rechnungen noch nicht abgehakt, weist sie zuerst darauf hin. Den Rest vor dem Gehalt merkt sie sich (er steht im Backup), den Kontostand nicht.
5. **Feste Rate einen Monat aussetzen.** Im Blatt eines Ziels oder einer Rücklage mit fester Rate gibt es „Einen Monat aussetzen“. Du wählst das Budget, das nicht belastet werden soll. Die Vorschau zeigt, was dann frei ist und ob dem Ziel bis zum Termin etwas fehlt. Ausgesetzte Monate stehen im selben Dialog und lassen sich wieder aufnehmen. Danach läuft die Rate normal weiter.
6. **Fällige Rechnungen.** Ist im laufenden Monat der Zahlungstag einer Rechnung erreicht und sie noch offen, steht über „Rechnungen“ ein Hinweis: „Fällig: Miete (900,00 €). Schon abgebucht?“ mit „Abhaken“ bzw. „Alle abhaken“. Gebucht wird mit dem Zahlungstag als Datum, Rückgängig geht.

## Abweichung beim Punkt 6
Beauftragt war „automatisch abhaken“. Gebaut ist ein Hinweis mit einem Tipp. Begründung: Eine Buchung ohne Tipp wäre eine Datenänderung beim Öffnen der App, und das schließen die Projektregeln aus. Außerdem würde eine automatisch gebuchte Rechnung, die Du wieder löschst, beim nächsten Öffnen erneut gebucht. Rechnungen, zu denen schon eine passende, nicht zugeordnete Ausgabe existiert, nimmt der Hinweis nicht auf, damit nichts doppelt gebucht wird.

## Nebenbei korrigiert
- Raten-Dialog: Die Monatsauswahl (seit 3.5.6) wurde bei 360 px abgeschnitten. Sie zeigt jetzt nur den Budget-Monat, die Überweisung steht in der Vorschau („Überweisungen Ende Nov 2026 bis Ende Okt 2027, 12 Raten“).

## Technisch
- Neues Modul `names.js` (`knownNames`, `lastUse`, `targetFor`, `byName`, `datalist`), nur lesend.
- `goals.js`: `rateMonths`, `skipRate`, `resumeRate` über die vorhandenen `skips` (`Posten-ID@Monat`). `potRate` ignoriert beim Finden der laufenden Rate die Aussetzer (`skipped: true`). Sonst verschwände eine im laufenden Monat ausgesetzte Rate aus der Anzeige.
- `planner.js`: optionales `settings.accountBase` (ganze Cent, Betrag ≤ 1 Mrd. €, darf negativ sein) wird validiert.
- `month-ui.js`: Kontostand-Abgleich (`cashCheck`, `saveBase`), Schnellerfassung mit Vorbelegung (`quickAdd(prefill)`), `dueBills`/`dueNotice`, Aktion `month-due-all`, Detailblatt „Wofür im …“.
- `planner-ui.js`: `backup()` mit `navigator.share`, Fallback Download. `index.html` nimmt beim Wiederherstellen auch .txt an.
- Keine Migration. Alte Backups und Datenstände sind unverändert gültig. Service-Worker-Cache `v3-15`, `names.js` ist in der Offline-Liste.

## Geprüft
| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 67 Fachtests (3 neu: Namen und Vorwahl, Aussetzen und Wiederaufnehmen, Validierung `accountBase`), UI-Ablauf 17 Blöcke (neu: Teilen inkl. .txt-Fallback und Abbruch, Vorschläge, Auswertung, Abgleich, Fällig mit Rückgängig, Aussetzen/Wiederaufnehmen) |
| `npm run check` | ohne Befund |
| Chromium 360 px, fiktive Daten | Vorwahl nach Name im echten Browser (Kino → Freizeit; eigene Wahl bleibt), Vorschlagsliste, Detailblatt, Abgleich, Aussetzen inkl. „Wieder aufnehmen“, keine Seitenfehler, kein horizontales Scrollen |

## Nicht geprüft
- Das Teilen-Menü auf Deinem Android-Handy (im Testbrowser nur simuliert). Bitte einmal „Backup speichern“ antippen und die Datei an Dich selbst schicken.
- Wie die Vorschlagsliste aussieht, hängt von der Tastatur bzw. vom Browser ab.
