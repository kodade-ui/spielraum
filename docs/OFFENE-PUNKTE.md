# Produktstand, Kritik und nächste Entscheidungen

## Ziel des Nutzers

Ein hochwertiger, einfacher persönlicher Planer auf dem Android-Handy. Prioritäten: (1) größere Anschaffungen durchspielen, (2) weniger manuelle Arbeit, (3) Wünsche zeitlich miteinander vereinbaren. Keine zweite Bankbuchhaltung, keine erneute Analyse-Hauptnavigation. Datenerhalt hat Vorrang vor einem technisch bequemen Neubau.

## Tatsächlich vorhanden

- Vier Hauptbereiche: Monatsplan, Rücklagen, Ausgaben, Ziele.
- Sofortige Monatsprojektion, erweiterbare Kategorien, monatliche/vierteljährliche/jährliche/einmalige Posten.
- Verknüpfte Rücklagentöpfe mit Anfangsbeständen und geplanten Bewegungen.
- Eine gemeinsame Ausgabenansicht mit Abhaken, Teilbeträgen, zusätzlichen Einkäufen, Zuordnung, Diagrammen und Journal.
- Optionale lokale CSV-Verarbeitung und bestätigter Monatsabschluss. Kein Bankkonto verbunden.
- Ziele, Zielzeitplan, „Kauf prüfen“ direkt am Ziel, fortgeschrittene alte Szenarien hinter einer sekundären Aufklappfunktion.
- Lokale Speicherung, Datei-Backup, Wiederherstellung, PWA-Installation und Offline-Shell.

## Erledigt in 3.0 (8. Oktober 2026) · Paket 1

- Neues Stylesheet, Dunkelmodus, untere Navigation mit Plus-Taste.
- Bereich „Monat“ ersetzt Monatsplan + Ausgaben: eine Hauptzahl „Noch frei“, Aufteilungsbalken, eine Liste (Rechnungen, Budgets, Ohne Budget, Sparen, Einnahmen), Detailblatt je Posten.
- Schnellerfassung (auch per App-Icon lang drücken), Ein-Tipp-Zuordnung von Käufen ohne Budget.
- Kauf prüfen, Szenarien, Zeitplan, CSV-Import, Monatsabschluss aus der Oberfläche entfernt (Daten bleiben).
- Neues Logo, Icons als Dateien, Startfarben passend zur App.

## Nächste freigegebene Pakete

- **Paket 2 · Sparen:** Rücklagen und Ziele in einem Bereich, Sparrechner mit Terminschieber, Logik- und Testaufräumen der entfernten Funktionen.
- **Paket 3 · Jahr:** Zwölf-Monats-Leiste mit Spitzen (ersetzt „Ein Blick nach vorn“), Abos & Verträge mit Jahreskosten, Monatsrückblick Plan gegen Ist.

## Erledigt in 2.13 (8. Oktober 2026)

- Code zeilenweise formatiert, nachweislich ohne Verhaltensänderung.
- Trennzeichen in der Postenliste („WohnenMonatlich“) behoben.
- Doppelte Aktionsleiste im Monatsplan auf dem Handy aufgelöst; untere Leiste enthält jetzt auch „Rücklage“.
- Neu bemerkt, offen: Legende der Verteilungskarte reicht auf Handybreite bis an den Kartenrand.

Details und Prüfungen: `docs/AENDERUNGEN-2.13.md`.

## Wichtigste ungelöste Rückmeldung

Nach Version 2.12 erkannte der Nutzer vor allem die Zusammenführung der Ausgaben, das Entfernen des prominenten Entscheidungspfads und minimale Designänderungen. Er erwartete einen deutlich sichtbaren, zusammenhängenden Fortschritt nach der besprochenen SharkFin-Referenz. Diese Kritik ist nicht als Missverständnis des Nutzers abzuweisen. Die überarbeitete Gesamtsicht ist noch nicht überzeugend fertig.

## Besprochene Referenz: SharkFin

Der Nutzer brachte Screenshots einer anderen privaten Budget-App ein: ruhige helle Oberflächen, klare Summen, sortierte Buchungslisten, ein Geldflussdiagramm mit proportionalen Verbindungen, Kategorienring plus Betragsliste, eigenständig gestaltete Mobilansichten und eine Vermögensansicht. Diese Prinzipien inspirieren; Layout/Marke nicht 1:1 kopieren. Die fremden Screenshots und deren Finanzangaben sind nicht Teil dieses Pakets. Für einen exakten visuellen Vergleich kann der Nutzer sie erneut bereitstellen.

## Naheliegendes nächstes Paket – erst mit Nutzer abstimmen

1. **Eine sichtbar neue integrierte Übersicht:** Einnahmen, separat ausgewiesene Rücklagenentnahmen, Ausgaben, Reservierungen und freier Betrag als zusammenhängender Aufbau. Eine bloße Ansammlung weiterer Karten oder umbenannte bestehende Diagramme genügt nicht.
2. **Echtes mobil lesbares Geldflussdiagramm:** bisher NICHT geliefert. Die existierende Aufteilung besteht überwiegend aus Ring und Restbudgetstreifen. Wenige gut lesbare Gruppen, proportionale Flüsse, exakte Textwerte und antippbare Details; Fehlbetrag und Sparen fachlich korrekt darstellen.
3. **Kategorienverteilung direkt integrieren:** „Erfasst / Geplant“ existiert bereits, liegt aber unterhalb der Postenliste. Platzierung, Sichtbarkeit, Navigation zum Detail und Rückweg als zusammenhängenden Ablauf gestalten.
4. **Kaufprüfung verständlich auffindbar machen:** Aktion ist vorhanden. Ihr Nutzen und die Ergebnisdarstellung müssen ohne Kenntnis von Szenarien verständlich sein. Preis/Termin am ursprünglichen Ziel und tatsächlich geprüfte/übernommene Variante sind bisher nicht automatisch synchronisiert; verständliche Anzeige und bewusstes Änderungsverhalten gemeinsam festlegen.

Die Bitte um dieses Übergabepaket ist keine neue Freigabe, diese Punkte sofort umzusetzen oder live zu veröffentlichen.

## Weitere Ideen, bisher nicht beauftragt/umgesetzt

- Anschaffungsprojekte mit mehreren Bestandteilen, z. B. Reise aus Transport/Unterkunft/Aktivitäten oder Kaffeeset aus Maschine/Mühle/Zubehör. Die derzeitige Kaufprüfung kennt Gesamtpreis und eine zusätzliche monatliche Kostensumme, keine vollständige Projektstruktur.
- Vermögensübersicht aus bestätigten Beständen und optionalen Verbindlichkeiten. Rücklagentöpfe sind Zweckbindungen und dürfen nicht zusätzlich zu denselben Kontobeständen als Vermögen gezählt werden.
- Eine neue Jahresübersicht mit deutlich sichtbaren Belastungsspitzen; vorhandene Vorschauen und Zeitpläne zuerst nutzen, nicht eine weitere parallele Logik erstellen.
- Erweiterte persönliche Zuordnungsregeln; vorhandene Kategorien- und Importregeln berücksichtigen.

## Technische Punkte für den nächsten Review

- CSS besteht aus einer gewachsenen Basis mit vielen Überschreibungen plus `refinement.css`. Konsolidierung kann sinnvoll sein, muss aber anhand tatsächlich gerenderter Ansichten erfolgen.
- JavaScript ist stellenweise sehr dicht formatiert. Eine gezielte Formatierung könnte die Wartung verbessern; keinen vollständigen Rewrite daraus ableiten.
- Der frühere getrennte Ausgabenrenderer und erweiterte Szenarien existieren weiter im Code. Nicht unbesehen löschen, bevor Aktionshandler/Export/alte Daten geprüft sind.
- Ziele ohne Topf lassen sich in der Deckungsprognose nicht verlässlich terminieren. Diese Grenze ist sichtbar zu machen, nicht durch erfundene Prognosen zu ersetzen.
- Viele Filter-/Diagrammwechsel rendern den Bereich neu. Scrollposition, Fokus und geöffnete Details auf dem echten Handy prüfen.
- Automatisches Neuladen bei Updates wurde nicht als neuer vollständiger Update-Dialog umgesetzt. Identität und vorhandene Daten erhalten; PWA-Cache gezielt versionieren.
- Monatsabschlussregeln in allen Bearbeitungswegen prüfen, insbesondere CSV-Import und historische Planänderungen. Es gibt bestehende Signatur-/Rücknahmeprüfungen; keine unbelegte Zusicherung, dass jeder Weg abgeschlossen gesperrt ist.
- Kein aktueller physischer Android-Test und keine vollständige visuelle Abnahme. Die synthetischen UI-Tests beweisen weder Layoutqualität noch Touch-Ergonomie.

## Akzeptanz für ein künftiges Umsetzungspaket

- Nutzer erkennt auf dem ersten relevanten Bildschirm einen tatsächlichen Strukturgewinn.
- Ein Lebensmitteleinkauf von 100 € bei 400 € Plan lässt 300 € offen und wird einmal berücksichtigt.
- Gehalt, Rücklagenentnahme und Sparbetrag bleiben begrifflich/rechnerisch getrennt.
- Filter und Diagramme erklären ihre Auswahl; Monat bleibt beim Wechsel erhalten.
- Kein Verlust vorhandener Einträge, Notizen, eigener Kategorien, Revisionen oder Übernahmejournale.
- Screenshots/visuelle Ergebnisse werden nur als tatsächlich geprüft bezeichnet, wenn sie gerendert und angesehen wurden.
