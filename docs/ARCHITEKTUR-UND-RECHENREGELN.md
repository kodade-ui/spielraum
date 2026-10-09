# Architektur und verbindliche Rechenregeln

Diese Beschreibung bezieht sich auf Stand 3.1 (Module) bzw. die unveränderten Rechenregeln seit 2.12. Die Entwicklungshistorie enthält absichtlich auch überholte Beschreibungen.

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
| `savings-ui.js` | Bereich „Sparen“: Töpfe mit Zielstatus, Topfblatt, Wünsche mit Terminschieber, „Sparplan starten“ |
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

## Ziele und Sparplan

- Ein Ziel allein erzeugt keine Budgetbelastung. Ein Topf darf nur einem offenen Ziel zugeordnet sein.
- Ein Wunsch ist ein offenes Ziel ohne Topf. Der Sparrechner teilt den Preis durch die gewählte Monatszahl (1–60) und rundet auf volle Euro auf. Er beginnt im Monat nach dem gewählten, frühestens nach dem aktuellen Monat. Vorhandenes Geld zählt erst über einen Topf.
- „Sparplan starten“ ist eine einzige rückgängig machbare Änderung: neuer Topf (Bestand 0 € ab Startmonat), Ziel bekommt Topf und Zieldatum (= letzter Ratenmonat), monatliche Sparposten mit Ende im Zielmonat. Ein Wunsch mit Topf kann nicht erneut gestartet werden.
- Der Status eines Ziels mit Topf kommt aus `goalProgress` und berücksichtigt alle geplanten Ein- und Auszahlungen bis zum Termin.
- Die frühere Kaufprüfung, Szenarien und der gemeinsame Zeitplan sind entfernt. Gespeicherte `decisions` und `timeline` bleiben gültig und werden nicht verändert.

## Jahr

- Die zwölf Werte sind `reconcileMonth(Monat).afterOpen`, also dieselbe Definition wie „Noch frei“ im Monat. Die Summe oben addiert sie; sie ist kein Kontostand.
- Sonderzahlungen sind Ausgaben mit Rhythmus vierteljährlich, jährlich (Zahlungsmonat) oder einmalig. Einmalige Abweichungen eines Monatspostens (gleiche `groupId`) und unbestätigte alte Jahresanteile zählen nicht dazu.
- Abos & Verträge: wiederkehrende Ausgaben je Gruppe in der Version, die im gewählten Monat gilt (sonst die nächste künftige), wenn sie fest eingeordnet sind oder der Name eindeutig nach Vertrag klingt. Jahreskosten = monatlich × 12, vierteljährlich × 4, jährlich × 1.
- Rückblick: `reconcileMonth` des Vormonats, je Kategorie geplant gegen erfasst; nicht abgehakte feste Rechnungen werden genannt.

## Grafik- und Vergleichssemantik

Negative Beträge sind keine negativen Tortensegmente. Fehlbeträge ausdrücklich anzeigen. Jede Visualisierung hat lesbare Zahlen; Farbe nicht als einzige Information verwenden.

`planChanges` vergleicht zwei Monatspläne, keine vollständig beobachteten Kontostände oder historischen Istmonate. Revisionen über ihre Serien-ID zusammenfassen; Summe der Treiber muss exakt die Veränderung des freien Betrags ergeben.
