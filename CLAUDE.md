# Spielraum – Arbeitskontext für Claude

## Einstieg und Arbeitsweise

Dies ist eine bestehende private Budget-PWA, keine Aufforderung zu einem Neubau. Nutzer kommuniziert auf Deutsch, ist kein Softwareentwickler und erwartet selbstständig erledigte, freigegebene Aufgaben. Erst prüfen und konkret vorschlagen; Änderungen erst nach Freigabe. Kein Bankzugang und keine personenbezogenen Daten im Paket. Keine Hintergrundaktionen oder dauerhaften Erinnerungen anlegen.

Lies `docs/ARCHITEKTUR-UND-RECHENREGELN.md`, `docs/OFFENE-PUNKTE.md` und `docs/TESTEN-UND-UMZIEHEN.md`. Die aktuelle App ist Version **3.4**, Service-Worker-Cache **v3-6** (Änderungen: `docs/AENDERUNGEN-2.13.md`, `docs/AENDERUNGEN-3.0.md`, `docs/AENDERUNGEN-3.1.md`, `docs/AENDERUNGEN-3.2.md`, `docs/AENDERUNGEN-3.2.1.md`, `docs/AENDERUNGEN-3.3.md`, `docs/AENDERUNGEN-3.4.md`). Live seit 9. Oktober 2026 auf Cloudflare (Workers, statische Dateien): https://spielraum-k7.rotkehlchen42.workers.dev/ – der Nutzer lädt `dist/` als ZIP selbst hoch. Achtung: Ein Worker mit statischen Dateien lässt sich im Dashboard NICHT per Upload aktualisieren (Drag & Drop nur beim Anlegen). Funktionierender Weg (9. Oktober 2026, Update auf 3.1): neuen Worker per „Upload your static files“ anlegen (Zufallsname), alten Worker löschen, neuen in Settings auf `spielraum-k7` umbenennen. Die Adresse (= Name) muss gleich bleiben, sonst ist die App leer. Danach mit Cache-Brecher prüfen (`/sw.js?x=1`), ob die neue SW-Version ausgeliefert wird. GitHub `kodade-ui/spielraum` ist seit 16. Oktober 2026 wieder erreichbar (öffentliches Repository, nur Code). Arbeitsweise: Änderungen auf einem Branch, Pull Request (Workflow testet), Nutzer merged. Veröffentlichung: Cloudflare Workers Builds mit `wrangler.jsonc` (Name muss `spielraum-k7` bleiben), sobald im Dashboard verbunden; bis dahin ZIP-Upload wie oben. Der Workflow veröffentlicht nach dem Merge zusätzlich auf GitHub Pages (zweite Adresse, eigener leerer Datenbereich). Ursprünglicher Quellstand 2.12: `6897d9daee90b0e8dd843c1ee933b7054d5e6901`; seitdem Git-Historie im Projektordner. Die Anbieter-Publikationsnummer 15 ist eine andere Zählung als die App-Version.

## Technik

- Statisches HTML/CSS/JavaScript mit nativen ES-Modulen. Kein React, kein Backend, kein Build, keine Runtime-Abhängigkeiten.
- `dist/` ist der wirkliche Quellcode und zugleich der Webroot. Hier editieren, kein nicht vorhandenes `src/` suchen.
- `dist/planner-ui.js` hält UI-Zustand, Navigation, Dialoge, globale Events, Persistenz und Undo.
- Fachlogik liegt in kleinen Modulen: `planner.js`, `reconciliation.js`, `reserves.js`, `goals.js`, `actuals.js`, `intelligence.js`; `scenarios.js` und die Schemadateien nur noch für Journal und die Validierung gespeicherter Altdaten.
- Seit 2.13 ist der Code zeilenweise formatiert (eine Anweisung/Deklaration pro Zeile). HTML in Template-Strings bleibt einzeilig, weil Umbrüche dort die Ausgabe verändern würden.
- Darstellung: Hell/Dunkel folgt dem Handy oder der Wahl in den Einstellungen (`localStorage` `spielraum.theme`, nicht im Datenstand). `index.html` setzt `data-theme` vor dem ersten Zeichnen. Die Dunkel-Tokens stehen zweimal in `app.css` (Medienabfrage und `[data-theme=dark]`) und müssen gleich bleiben.
- Styles: genau ein Stylesheet `app.css` mit Tokens (hell/dunkel) am Anfang. Farben nur über Tokens, keine späteren Überschreibungen anhängen; bestehende Regel ändern statt neue darüberlegen.
- Bereiche: `month-ui.js` (Monat), `savings-ui.js` (Sparen: zuerst Rücklagen mit Gesamtstand und Aufteilungsbalken, dann Ziele als Kacheln; Nutzer will dort keinen Verlauf; Einzahlen, feste Rate, Jahreskosten; Rechenlogik in `goals.js` und `sinking.js`), `year-ui.js` (Jahr: zwölf Monate, Abos & Verträge, Rückblick). `reserves-ui.js`, `goals-ui.js`, `actuals-ui.js`, `reconciliation-ui.js`, `plan-payments-ui.js` liefern nur noch Dialoge und Aktionen. „Frei“ ist überall `reconcileMonth(...).afterOpen`.
- `month-ui.js` rendert den Bereich „Monat“ (Plan und tatsächliche Ausgaben zusammen, Schnellerfassung, Detailblatt). Geldlogik nur über `reconcileMonth`, `recordPlannedExpense`, `saveActual`, `saveEntryClassification`.
- Diagramme: Farben der Aufteilung sind mit dem Dataviz-Validator geprüft (Farbe nach Bedeutung: Ausgegeben/Rechnungen bewusst neutral, Frei = Grün, Sparen = Blau, Budget = Ocker). Plan-gegen-Ist-Balken nur über `planMeter` aus `theme.js`. Rücklagen-Farben `--pot-1…6` (geprüft), Farbe folgt dem Topf, nicht der Größe; ab Topf 7 „Weitere“. Große Einzelzahlen ohne `tabular-nums`.
- Icons: Quellen `icon.svg`, `icon-maskable.svg`, `icon-shortcut.svg`; PNGs daraus mit einem Browser rendern. Im Manifest nur Dateien, keine eingebetteten Data-URIs (`npm run check` prüft das).
- `package.json` und `tools/` wurden nur zur portablen Übergabe ergänzt. `SOURCE-MANIFEST.json` beschreibt den Ausgangsstand 2.12; seit 2.13 weichen `dist/*.js`, `dist/*.css` und `tests/ui-flow.mjs` davon ab (Formatierung + Korrekturen, siehe Git-Log).
- `npm start`, `npm test`, `npm run check`; Node.js 24. Kein `npm install` erforderlich. Der Server bindet nur an 127.0.0.1, sein Port bleibt standardmäßig 4173.

## Unverhandelbare Datenregeln

1. Alle Geldwerte sind Integer-Cent. Euroformat nur in Anzeige/Eingabe. Keine Gleitkomma-Summen in der Fachlogik.
2. Lokaler Hauptschlüssel `spielraum.v2`, Legacy `spielraum.v1`. Unverändert lassen. Vorhandene Daten nicht beim Start überschreiben; niemals zum Testen echte Daten löschen.
3. Identität der PWA (`manifest.webmanifest`, ID, Scope, Start-URL) bei Aktualisierung derselben Installation erhalten. Service-Worker-Version bei Shell-Änderungen erhöhen und neue Dateien in `ASSETS` aufnehmen.
4. `validate`, `enhanceState`, `persist`, `commitUndo` und vorhandene Transaktions-/Revisionsprüfungen verwenden; keine parallele Speicherlogik bauen.
5. Monatsplan und tatsächliche Käufe sind zwei Sichten auf zusammengehörige Daten. Zugeordnete Käufe senken den offenen Planbetrag. Nicht den Planbetrag und den zugehörigen Istbetrag vollständig doppelt abziehen.
6. Einnahmen, Sparen und Umbuchungen nicht als Konsumausgaben darstellen. Topfanfangsbestände sind keine Einnahmen. Eine Rücklagenentnahme erhöht den Monatsrahmen einmal und senkt den Topf einmal.
7. Wiederkehrende Änderungen ab dem gewählten Monat erhalten die Historie. `groupId` und `planGroupId` stabil auflösen; Titel sind keine belastbare Verknüpfung.
8. Simulationen verändern den Monatsplan erst nach einer konkreten Übernahmevorschau und Bestätigung. Geschützte Rücklagen und Mindestspielraum respektieren. Übernahmen nicht duplizieren.
9. Alle dynamischen Texte escapen; keine privaten Daten an externe Dienste übertragen. Die vorhandene Auswertung ist deterministische Logik, keine angebundene KI.

## Qualität und Umfang

- Primär Android/Touch, Breiten 360–430 px; zusätzlich Desktop und 200 % Textvergrößerung berücksichtigen. Lesbare Beträge und ausreichend große Bedienflächen vor maximaler Informationsdichte.
- Bereiche seit 3.1: Monat · Sparen · Jahr (untere Navigation, Plus-Taste = Schnellerfassung). Keine erneute Trennung von Plan und Ausgaben, keine zusätzliche Hauptnavigation ohne Abstimmung.
- Entfernt auf Wunsch des Nutzers: Kauf prüfen, Szenarien/Entscheidungen, Zeitplan, CSV-Import, Monatsabschluss, ab 3.3 auch Regler/Wunsch-Fahrplan (der Nutzer fand Regler nicht sinnvoll; er spart flexibel mal hier, mal dort). Die Module `purchase.js`, `timeline.js`, `decision-assistant.js` sind seit 3.1 gelöscht; gespeicherte Daten dazu werden weiter validiert und bleiben erhalten. Nichts davon wieder einbauen.
- Kein Frameworkwechsel, Cloudspeicher oder Rewrite allein aus Bequemlichkeit. Solche Architekturänderungen separat vorschlagen und abstimmen.
- Tests sind Prüfmittel, keine Produktdefinition: Ältere Testtitel erwähnen historische Jahresanteile. Die aktuellen Regeln stehen im Fachkonzept und im Code.
- Nach einer Änderung vollständiges Projekt zurückgeben, nicht nur einzelne Schnipsel. Erläutere Auswirkungen auf Speicherung/PWA und notwendige manuelle Prüfungen.
- Veröffentlichung: Nach allen Prüfungen nur den Inhalt von `dist/` als ZIP (Dateien im ZIP-Wurzelverzeichnis) an den Nutzer geben; er lädt ihn bei Cloudflare hoch. Adresse und Manifest-ID nicht ändern, sonst verliert die installierte App ihren Datenbereich. Service-Worker-Cache bei jeder Änderung erhöhen. Zusätzlich immer den kompletten Projektordner als ZIP zurückgeben – er ist derzeit die einzige Quelle des Codes.
