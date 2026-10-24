# Spielraum 3.0 · Paket 1: Fundament und Bereich „Monat“

Stand: 8. Oktober 2026 · Grundlage: Rundum-Check und Freigabe des Nutzers (drei Bereiche, Logo A, CSV-Import und Monatsabschluss entfernen).

## Was sich für Dich ändert

- **Eine Hauptzahl:** „Noch frei im Oktober“ berücksichtigt den Plan und alles, was Du schon gekauft hast. Käufe innerhalb eines Budgets ändern sie nicht. Käufe ohne Budget oder über Plan senken sie, darunter steht dann, wie viel außerhalb des Plans lag.
- **Aufteilungsbalken:** Deine Einnahmen aufgeteilt in Ausgegeben, Rechnungen (noch offen), Budget übrig, Sparen und Frei. Die fünf Werte ergeben zusammen exakt die Einnahmen.
- **Eine Liste statt zwei Seiten:**
  - Rechnungen sind nach Abbuchungstag sortiert, der Kreis hakt sie ab.
  - Budgets zeigen ihren Rest und einen Balken.
  - Darunter folgen „Ohne Budget“ mit Zuordnungsvorschlag, Sparen und Einnahmen.
  - Eine Zeile antippen öffnet das Detailblatt mit Zahlungen, „Betrag erfassen“, „Bearbeiten“ und „Entfernen“.
- **Schnellerfassung:** Die Plus-Taste öffnet den Betrag, dann wählst Du das Budget und tippst „Erfassen“. Die Vorschau zeigt, was danach im Budget übrig bleibt. Auch über langes Drücken auf das App-Icon → „Ausgabe erfassen“.
- **Navigation unten:** Monat, Rücklagen, Plus-Taste, Ziele. Den Monat wechselst Du oben.
- **Dunkelmodus** folgt der Systemeinstellung.
- **Neues Logo:** Ring mit goldenem Stück. Die Icons sind jetzt echte Bilddateien inklusive Android-Variante mit Schutzzone, und der Startbildschirm hat die App-Farbe statt Lavendel.
- **Entfernt:** Kauf prüfen, Szenarien/Entscheidungen, Zeitplan, CSV-Import, Monatsabschluss, Ring-/Kreisdiagramm, Filterbereich „Abbuchungen & Entnahmen“, Löschen-Kreuze an jeder Zeile. Gespeicherte Daten dazu bleiben in Deiner Datei.

## Technisch

- `app.css` ersetzt `planner.css` + `refinement.css`. Statt 1.681 Regeln mit 384 doppelten Selektoren gibt es ein Stylesheet mit Tokens für hell und dunkel.
- Neu ist `month-ui.js`. Entfernt sind `purchase-ui.js`, `timeline-ui.js`, `scenarios-ui.js`, alte Icons und die Skripte, die Icons als Data-URIs ins Manifest eingebettet haben. Diese Einbettung war die wahrscheinliche Ursache für das unscharfe Logo beim Start.
- Das Manifest hat dieselbe ID, denselben Scope und dieselbe Start-URL. Dazu kommen Icons als Dateien, eine Verknüpfung für die Schnellerfassung und Start-/Themenfarbe `#f3f2ed`.
- Der Service-Worker-Cache heißt jetzt `v3-1`. Die Asset-Liste wurde neu aufgebaut, `npm run check` prüft jetzt zusätzlich, dass jedes geladene Modul offline verfügbar ist und dass Icons Dateien sind.
- Die Datenhaltung ist unverändert: Schlüssel `spielraum.v2`, Validierung, Undo und Revisionsschutz wie bisher. Es gibt keine Migration.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 62/62 Fachtests; UI-Ablauf angepasst: 13 Blöcke bestanden, davon neu Schnellerfassung/Zuordnung/Detailblatt und „entfernte Einstiege ändern keine Daten“ |
| `npm run check` | 41 JS-Dateien, Module, Offline-Liste, Icons |
| Chromium 390/360 px, hell und dunkel, mit fiktiven Daten | keine Seitenfehler, kein horizontales Scrollen |
| Schnellerfassung 18,50 € auf Lebensmittel | Budget 220 → 201,50 €, Noch frei unverändert 544,10 € |
| Rechnung abhaken | Noch frei unverändert, Rechnung als bezahlt markiert |
| Kauf ohne Budget zuordnen / Rückgängig | 544,10 → 568,00 → 544,10 € |
| App-Icon-Verknüpfung `?aktion=ausgabe` | öffnet Schnellerfassung, Adresse wird bereinigt |
| Installierbarkeit (Chrome-Prüfung) | keine Fehler im Manifest oder bei der Installierbarkeit |
| Update 2.13 → 3.0 im selben Browserprofil | Daten byte-identisch, Cache `v2-15` → `v3-1`, neue Oberfläche aktiv |

## Nicht geprüft / Grenzen

- Kein Test auf Deinem Handy. Ob das neue Icon auf dem Startbildschirm und beim Start scharf ist, siehst erst Du. Chrome aktualisiert Icon und Name einer installierten App selbst, das kann etwas dauern und Chrome fragt eventuell einmal nach.
- Löschen per Wischen ist bewusst nicht umgesetzt (Verwechslungsgefahr beim Scrollen). Gelöscht wird im Detailblatt, mit Rückgängig.
- „Ein Blick nach vorn“ bleibt bis Paket 3 in der alten Form am Ende von „Monat“.
- Rücklagen und Ziele sind nur neu eingekleidet. Der Umbau zu „Sparen“ folgt in Paket 2.
