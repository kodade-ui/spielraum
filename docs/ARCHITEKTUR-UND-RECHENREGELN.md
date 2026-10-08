# Architektur und verbindliche Rechenregeln

Diese Beschreibung bezieht sich auf Stand 3.0 (Module) bzw. die unveränderten Rechenregeln seit 2.12. Die Entwicklungshistorie enthält absichtlich auch überholte Beschreibungen.

## Module

| Module | Verantwortung |
| --- | --- |
| `planner.js`, `legacy.js` | Centbeträge, Monatslogik, Validierung, V1-Übernahme, Wiederholung, Änderung und Projektion |
| `planner-ui.js` | App-Zustand, Rendering, Navigation, Dialoge, Editor, Speicherung, Backup, Import, Undo, PWA |
| `intelligence.js` | Kategorienkatalog, Stichwortzuordnung, Regeln und Planungssnapshots |
| `reserves.js`, `reserves-ui.js` | Töpfe, Anfangsbestände, Korrekturen, Bewegungen und Verlauf |
| `actuals.js`, `actuals-ui.js` | Manuelle Einzelkäufe, Editor, CSV-Export; der ältere getrennte Renderer ist noch im Quellcode |
| `reconciliation.js`, `reconciliation-ui.js`, `plan-payments-ui.js` | Zusammengeführte Ausgabenansicht, Verknüpfungen, Teilzahlungen, Import, Monatsabschluss |
| `reconciliation-graphics.js`, `budget-insights.js` | Monatsaufteilung, Restbudget, Kategorien und Erklärung von Planveränderungen |
| `goals.js`, `goals-ui.js` | Wünsche, Preis, Zielmonat, Topfzuordnung und Sparbedarf |
| `purchase.js` (Oberfläche seit 3.0 entfernt) | Einfache Kaufprüfung aus einem Ziel, Folgeausgaben, partielle Topffinanzierung, späterer Beginn |
| `scenarios.js`, `scenarios-schema.js` (Oberfläche seit 3.0 entfernt; `makeJournal` wird weiter genutzt) | Bestehende erweiterte Vergleiche, Vorschau, Übernahmejournal und geschützte Rücknahme |
| `timeline.js`, `planning-schema.js` (Zeitplan-Oberfläche seit 3.0 entfernt; Schema validiert gespeicherte Daten weiter) | Gemeinsamer Zielzeitplan, Ratenverteilung und zusätzliche Datenvalidierung |
| `decision-assistant.js` | Deterministische Suche nach Varianten; kein Modellaufruf |
| `month-ui.js` | Bereich „Monat“: Hauptzahl, Aufteilungsbalken, Postenliste, Schnellerfassung, Detailblatt |
| `theme.js`, `app.css` | Kategorienfarben und das einzige Stylesheet (Tokens hell/dunkel) |
| `sw.js`, `manifest.webmanifest` | Offline-Shell und Installationsidentität |

## Zustand und Speicherung

`spielraum.v2` enthält einen JSON-Zustand mit `version: 2`, `revision`, `updatedAt`, `items`, `skips`, `categories`, `legacy`, `settings` und ergänzten Feldern `pots`, `actualExpenses`, `goals`, `decisions`, `timeline`, `monthClosures`, `importRules`, `snapshots`.

`enhanceState` ergänzt fehlende ältere Felder und Kategorien. `validate` einschließlich zusätzlicher Schemafunktionen prüft den Gesamtzustand. Die UI vergleicht vor dem Speichern den ursprünglich geladenen Rohwert mit dem aktuellen Speicherstand, um Änderungen in anderen Fenstern zu erkennen. Fehler beim Speichern dürfen den bisherigen Stand nicht verlieren lassen. Undo wird durch Revisionsprüfungen geschützt.

Kein Backend, keine Bankschnittstelle, keine Authentifizierung im App-Code, keine geräteübergreifende Synchronisierung. Die bisherige private Zugriffsschranke gehört zum Hosting, nicht zu diesen statischen Dateien.

## Monatsplan

`Einnahmen − Ausgaben − Sparen/Rücklagen = frei verfügbar`.

Alle aktiven Posten zählen sofort für den ausgewählten Monat, auch wenn der Abbuchungstag später liegt. `paymentDay` ist eine Termininformation; ein Tag 31 wird für kurze Monate auf deren letzten Tag begrenzt.

Wiederholungen:

- `month`: voller Betrag jeden aktiven Monat.
- `once`: voller Betrag nur im Startmonat.
- `quarter`: voller Betrag ab Zyklusanker in jedem dritten Monat; dazwischen null. Keine Glättung.
- `year` mit `annualPayment: true`: voller Betrag im Zahlungsmonat und danach alle zwölf Monate.
- Ältere Jahresposten ohne dieses Flag: bisheriger Monatsanteil bleibt bis zur ausdrücklichen Bestätigung des Zahlungsmonats erhalten. Nicht automatisch nachträglich umstellen.
- `cycleStart` erhält den Zahlungsrhythmus bei Änderungen; Endmonat ist inklusive. `skips` bildet einzelne ausgesetzte Vorkommen ab.

`upsertItem` und `removeItem` erhalten frühere Monate und verwenden Serienrevisionen. Diese Logik nicht durch direktes Ändern eines alten Objekts ersetzen.

## Rücklagen

Töpfe haben Anfangsstände/Korrekturen (`checkpoints`) zu Monatsbeginn. Ab dem jüngsten anwendbaren Checkpoint werden verknüpfte geplante Einzahlungen und Entnahmen gerechnet. Spätere Checkpoints können frühere Hochrechnungen ablösen.

- `saving` + `potId`: Monatsrahmen sinkt einmal, Topf steigt einmal.
- `income` + `potId`: Topf sinkt einmal, Monatsrahmen steigt einmal.
- Ein zugeordneter Ausgabenposten wird in der UI zur Sparrücklage, kein zweiter Posten wird daneben erzeugt.
- Sparen ohne Topf bleibt im Budget reserviert, erhöht aber keinen Topf.
- Ein tatsächlich erfasster Einkauf verändert den projizierten Topfbestand nicht automatisch. Topfbewegungen kommen aus dem Plan.
- Eine vorhandene Rücklage ist kein neu verdientes Einkommen. Beide Geldquellen separat beschriften.

## Gemeinsame Ausgabenansicht

Alle tatsächlichen Einträge liegen in `actualExpenses`. `kind` unterscheidet `expense`, `income`, `transfer`; bei alten Einträgen ohne `kind` gilt Ausgabe. Zuordnungen verwenden `planItemId` und `planGroupId` und werden über `resolveExpensePlan` auch über erhaltene historische Revisionen hinweg aufgelöst.

Pro geplantem Ausgabenposten:

```
erfasst = Summe seiner verknüpften Ausgaben
offen = max(0, geplant − erfasst)
über Plan = max(0, erfasst − geplant)
```

Abhaken erzeugt nur den Restbetrag; Teilbetrag ist eine zusätzliche Ausgabe. Bereits vorhandene passende Einträge werden vor erneutem Abhaken zur Zuordnung angeboten. Löschen einer tatsächlichen Zahlung öffnet ihren Betrag wieder im Abgleich, nicht im historischen Monatsplan.

Hauptzahlen aus `reconcileMonth`:

```
availableIncome = geplante gewöhnliche Einnahmen + geplante Topfentnahmen
afterRecorded = availableIncome − tatsächliche Konsumausgaben − geplante Sparbeträge
afterOpen = afterRecorded − offene feste Rechnungen − offene variable Budgets
```

Feste Rechnungen sind offene Zahlungen, variable Budgets sind noch nicht verbrauchte Ausgabenrahmen. Nicht beides als bereits fällige Verbindlichkeit bezeichnen. Tatsächlich erfasste Einnahmen/Transfers werden nicht zusätzlich zum geplanten Einkommensrahmen addiert.

Unzugeordnete Käufe zählen als tatsächliche Ausgaben. Gehören sie zu einem bestehenden Planposten, muss die Verbindung hergestellt werden, sonst wird dessen Betrag weiterhin reserviert. Ein bewusst zusätzlicher Kauf darf unzugeordnet bleiben. Kategorien allein sind keine zuverlässige Zuordnung zu einem einzelnen Planposten.

`reconcileMonth.remaining` ist eine ältere kategorienbasierte Kennzahl. Für die aktuelle Checkliste und den freien Monatsbetrag gelten `afterOpen`, `fixedOpen`, `variableOpen`; diese Werte nicht willkürlich vertauschen.

Monatsabschlüsse benötigen explizite Bestätigung tatsächlicher Beträge/Vollständigkeit. Der positive Rest kann einmalig in den nächsten Monat übertragen werden; es gibt geschützte Rücknahme und abhängige Folgeabschlüsse. Nicht pauschal aus fehlenden Ausgabeeinträgen eine Ersparnis ableiten.

## Ziele und Kaufprüfung

- Ein Ziel allein erzeugt keine Budgetbelastung. Ein Topf darf nur einem offenen Ziel zugeordnet sein.
- `purchaseDraft` erzeugt nur einen temporären Vergleich, keinen gespeicherten Plan.
- Preis, Kaufmonat, zusätzliche monatliche Folgekosten, expliziter Topfbetrag und Mindestspielraum sind Eingaben.
- Eine partielle Finanzierung erzeugt im Vergleich einmal den Kaufpreis als Ausgabe und separat die angegebene Topfentnahme als Einnahme.
- Prüfung: zwölf Monate ab Kaufmonat, einschließlich geschützter Mindeststände aus dem Zielzeitplan. Bei Unterschreitung Suche bis zu 24 spätere Startmonate.
- Freie künftige Überschüsse werden nicht automatisch in einem Topf angespart.
- Die Übernahme legt neue Budgetposten an und erfordert Vorschau/Bestätigung. ID `purchase_<goalId>` verhindert eine zweite aktive Übernahme desselben Ziels.
- `makeJournal`/`undoJournal` sichern betroffene Posten und Serien; neuere Änderungen blockieren eine unsichere Rücknahme.
- Das Ziel selbst wird bei Übernahme nicht als gekauft markiert; ursprünglicher Zielpreis und Wunschdatum werden nicht automatisch geändert. Die übernommenen Planposten enthalten die tatsächlich gewählte Variante.
- Auswirkungen anderer Ziele vergleichen deren Topfdeckung. Keine automatische Neuverteilung aller Sparraten und kein Terminversprechen für Ziele ohne Topf.
- Der separate gemeinsame Zeitplan berücksichtigt 36 Monate, Prioritäten und feste/flexible Termine. Auch dort gibt es eine ausdrückliche Übernahme.

## Grafik- und Vergleichssemantik

Negative Beträge sind keine negativen Tortensegmente. Fehlbeträge ausdrücklich anzeigen. Jede Visualisierung hat lesbare Zahlen; Farbe nicht als einzige Information verwenden.

`planChanges` vergleicht zwei Monatspläne, keine vollständig beobachteten Kontostände oder historischen Istmonate. Revisionen über ihre Serien-ID zusammenfassen; Summe der Treiber muss exakt die Veränderung des freien Betrags ergeben.
