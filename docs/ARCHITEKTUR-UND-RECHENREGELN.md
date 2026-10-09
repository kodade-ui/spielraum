# Architektur und verbindliche Rechenregeln

Diese Beschreibung bezieht sich auf Stand 3.2 (Module) bzw. die unveränderten Rechenregeln seit 2.12. Die Entwicklungshistorie enthält absichtlich auch überholte Beschreibungen.

## Module

| Module | Verantwortung |
| --- | --- |
| `planner.js`, `legacy.js` | Centbeträge, Monatslogik, Validierung, V1-Übernahme, Wiederholung, Änderung und Projektion |
| `planner-ui.js` | App-Zustand, Rendering, Navigation, Dialoge, Editor, Speicherung, Backup, Import, Undo, PWA |
| `intelligence.js` | Kategorienkatalog, Stichwortzuordnung, Regeln und Planungssnapshots |
| `reserves.js`, `reserves-ui.js` | Töpfe, Anfangsbestände, Korrekturen, Bewegungen; UI-Modul nur noch Dialoge (Topf anlegen/bearbeiten, Bestand, Einzahlung/Entnahme) |
| `actuals.js`, `actuals-ui.js` | Manuelle Einzelkäufe und ihr Dialog |
| `reconciliation.js` | Plan gegen Käufe (`reconcileMonth`), Zahlungen zu Planposten, Klassifizierung; CSV- und Abschlusslogik nur noch für gespeicherte Altdaten |
| `reconciliation-ui.js`, `plan-payments-ui.js` | Dialoge: Kauf zuordnen, Zahlungen eines Planpostens, Teilbetrag, Einordnung fest/variabel, Abschluss zurücknehmen |
| `budget-insights.js` | `planChanges`: Erklärung der Veränderung gegenüber dem Vormonat |
| `goals.js`, `goals-ui.js` | Wünsche, Preis, Zielmonat, Topfzuordnung und Sparbedarf; UI-Modul nur noch Ziel-Dialog und Aktionen |
| `scenarios.js`, `scenarios-schema.js`, `planning-schema.js` | Übernahmejournal (`makeJournal`/`undoJournal`) und Validierung gespeicherter Entscheidungen, Zeitpläne, Importregeln und Abschlüsse; keine Oberfläche |
| `month-ui.js` | Bereich „Monat“: Hauptzahl, Aufteilungsbalken, Postenliste, Schnellerfassung, Detailblatt |
| `savings-ui.js` | Bereich „Sparen“: Ziele und Rücklagen als Kacheln, Blätter, Dialoge Einzahlen / Rate / Neues Ziel / Jahreskosten |
| `sinking.js` | Jahreskosten glätten: Kandidaten, Optionen, Anlage (Topf, Rate, Entnahme), Status |
| `year-ui.js` | Bereich „Jahr“: zwölf Monate frei mit Sonderzahlungen, Abos & Verträge mit Jahreskosten, Rückblick Vormonat |
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

## Ziele, Rücklagen und Sparraten (ab 3.3)

- Ein Ziel hat einen Topf (neue Ziele legen ihn sofort an, mit „schon angespart“ als Bestand zu Beginn des Monats). Alte Ziele ohne Topf („Wünsche“ bis 3.2) bekommen ihn beim ersten Geld (`ensureGoalPot`). Ein Topf darf nur einem offenen Ziel zugeordnet sein.
- Zwei Arten zu sparen: **fest** = monatlicher Sparposten mit `potId` (`applyRate`), **flexibel** = einmalige Sparposten im gewählten Monat (`addDeposit`). Beides senkt „frei“ im jeweiligen Monat wie jede Sparrate.
- `planRate` rechnet Termin → Rate (Fehlbetrag am Termin / Monate ab Start, auf volle Euro aufgerundet) oder Rate → Termin (erster Monat, in dem geplanter Bestand + Rate × Monate ≥ Preis). Dabei zählen bestehende Einmalbeträge, die bisherige feste Rate ab Start wird ersetzt (`withoutRates`). Mehr als 120 Monate werden abgelehnt.
- Eine neue Rate gilt ab dem gewählten Monat (dieser oder nächster, nie in der Vergangenheit); frühere Monate behalten ihre Rate (Serie über `groupId`, wie bei allen Planänderungen). „Keine“ beendet die feste Rate ab dem Monat; Eingezahltes bleibt.
- Vorschau „Was die Rate kostet“: frei im Startmonat nach der Rate und der knappste Monat bis zum Ende (höchstens 24 Monate), jeweils `afterOpen` ohne die ersetzte Rate minus neue Rate.
- Status eines Ziels: `goalProgress` (alle geplanten Ein- und Auszahlungen bis zum Termin). Flexibel mit Termin zeigt die nötige Monatsrate, ohne sie anzulegen.
- `settings.wishPlan` (3.2) wird nicht mehr benutzt, bleibt aber gültig, damit alte Backups einlesbar sind.
- Die frühere Kaufprüfung, Szenarien und der gemeinsame Zeitplan sind entfernt. Gespeicherte `decisions` und `timeline` bleiben gültig und werden nicht verändert.

## Jahreskosten glätten (ab 3.3)

- Kandidaten: Ausgaben jährlich mit Zahlungsmonat oder vierteljährlich, ohne Topf, noch nicht gedeckt (keine Entnahme mit `covers` = Postengruppe) und nicht in `settings.sinkingDismissed`. Immer ab dem aktuellen Monat gerechnet, unabhängig vom angezeigten.
- Anlage in einer rückgängig machbaren Änderung: Topf, monatliche Sparrate (Betrag / 12 bzw. / 3, auf volle Euro) und eine Entnahme (Einnahme mit `potId` und `covers`) im selben Rhythmus ab dem Zahlungsmonat. Im Zahlungsmonat gleicht die Entnahme die Ausgabe aus (Regel 6: Entnahme erhöht den Monatsrahmen einmal, senkt den Topf einmal).
- Reicht die Zeit bis zur nächsten Zahlung nicht: „now“ = höhere Rate bis zum Zahlungsmonat, danach die normale (zwei Posten einer Serie); „later“ = nächste Zahlung wie bisher aus dem Monat, Rate ab dem Monat danach, Entnahme ab der übernächsten Zahlung. Ist die Zahlung schon im aktuellen Monat fällig, gibt es nur „later“.
- Ändert sich später der Betrag der Ausgabe, bleibt die Entnahme gleich; der Status der Rücklage zeigt dann, ob es reicht („es fehlen …“).

## Jahr

- Die zwölf Werte sind `reconcileMonth(Monat).afterOpen`, also dieselbe Definition wie „Noch frei“ im Monat. Die Summe oben addiert sie; sie ist kein Kontostand.
- Sonderzahlungen sind Ausgaben mit Rhythmus vierteljährlich, jährlich (Zahlungsmonat) oder einmalig. Einmalige Abweichungen eines Monatspostens (gleiche `groupId`) und unbestätigte alte Jahresanteile zählen nicht dazu.
- Abos & Verträge: wiederkehrende Ausgaben je Gruppe in der Version, die im gewählten Monat gilt (sonst die nächste künftige), wenn sie fest eingeordnet sind oder der Name eindeutig nach Vertrag klingt. Jahreskosten = monatlich × 12, vierteljährlich × 4, jährlich × 1.
- Rückblick: `reconcileMonth` des Vormonats, je Kategorie geplant gegen erfasst; nicht abgehakte feste Rechnungen werden genannt.

## Grafik- und Vergleichssemantik

Negative Beträge sind keine negativen Tortensegmente. Fehlbeträge ausdrücklich anzeigen. Jede Visualisierung hat lesbare Zahlen; Farbe nicht als einzige Information verwenden.

- Aufteilungsbalken (Monat): Teil-vom-Ganzen mit fünf Segmenten und 2-px-Lücken; Farbe nach Bedeutung, bewusst neutrale Töne für bereits ausgegebenes und gebundenes Geld; Legende mit Beträgen.
- Planbalken (`planMeter`): Ausgegebenes neutral bis zum Plan, Überschreitung rot dahinter, Strich am Planbetrag; Maßstab ist der größere Wert.
- Jahresbalken: eine Reihe in einer Farbe, gewählter Monat kräftig, übrige heller; Achse ab 0 €; Linie „üblich“ = Median der zwölf Monate; Sonderzahlung als Ring (Form statt Farbe).
- Rücklagen (Sparen): Gesamtstand groß, darunter ein Aufteilungsbalken (Teil vom Ganzen, nur positive Bestände, 2-px-Lücken) und Zeilen mit Betrag und Anteil, die zugleich die Legende sind. Farbe je Topf nach Anlagereihenfolge (`--pot-1…6`, mit dem Dataviz-Validator hell/dunkel geprüft), ab dem siebten Topf Grau „Weitere“. Bei nur einer Rücklage kein Balken.
- Fortschrittsring (Sparen): eine Farbe (`--ring`), Spur neutral, erreicht = Gold (`--ring-done`, Text in `--done-ink`); Rücklagen ohne Ziel zeigen ein Symbol statt Ring. Prozentzahl und Beträge stehen immer daneben.

`planChanges` vergleicht zwei Monatspläne, keine vollständig beobachteten Kontostände oder historischen Istmonate. Revisionen über ihre Serien-ID zusammenfassen; Summe der Treiber muss exakt die Veränderung des freien Betrags ergeben.
