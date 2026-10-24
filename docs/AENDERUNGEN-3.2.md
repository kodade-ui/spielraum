# Spielraum 3.2 · Wunsch-Fahrplan und Diagramme

Stand: 9. Oktober 2026 · Grundlage: Vorschlag „Wunsch-Fahrplan“ und Auftrag, alle Diagramme gestalterisch zu prüfen und direkt zu verbessern.

## Was sich für Dich ändert

- **Wunsch-Fahrplan in „Sparen“.** Statt eines Schiebers je Wunsch gibt es einen gemeinsamen Plan:
  - **Ein Schieber** legt fest, wie viel Du pro Monat für Wünsche zurücklegen willst. Darunter steht, was laut Plan üblicherweise frei ist.
  - **Reihenfolge per Pfeil:** Der oberste Wunsch wird zuerst angespart, dann der nächste.
  - **Zeitleiste:** Jeder Wunsch zeigt als Balken, wann er dran ist, mit Rate und Zeitraum. Liegt das Ende nach Deinem Wunschtermin, steht das daneben, z. B. „2 Monate nach Wunschtermin“.
  - **Zusammenfassung:** wann alle Wünsche erfüllt sind und wie viel im knappsten Monat danach noch frei bleibt (oder was fehlt). Bereits laufende Sparraten für Ziele mit Topf werden genannt.
  - **„Fahrplan übernehmen“** legt mit einem Tipp für jeden Wunsch einen Topf, das Zieldatum und die Sparrate an, ab dem Folgemonat. Mit „Rückgängig“ ist alles wieder weg.
  - Schieberstellung und Reihenfolge merkt sich die App.
- **Diagramme überarbeitet:**
  - **Aufteilungsbalken (Monat):** „Ausgegeben“ und „Frei“ waren beide fast schwarzgrün und kaum zu unterscheiden. Jetzt ist Frei grün, Sparen blau, Budget ocker. Ausgegeben und offene Rechnungen sind bewusst grau: Dieses Geld ist schon weg oder gebunden. Die Farben sind auf Farbenblindheit geprüft, hell und dunkel.
  - **Budget- und Rückblickbalken:** Eine Überschreitung war bisher nur ein voll roter Balken, 110 % und 160 % sahen gleich aus. Jetzt läuft der Balken grau bis zum Plan (mit Strich), der Teil darüber ist rot und so lang, wie er wirklich ist. Die zufälligen Kategoriefarben sind raus, sie bedeuteten hier nichts.
  - **Jahresbalken:** alle in Grün, der gewählte Monat kräftig. Neu ist eine Linie „üblich“ (Median), an der knappe Monate sofort auffallen. Sonderzahlungen sind ein Ring statt eines goldenen Punkts, damit Gold nicht zwei Bedeutungen hat.
  - Große Zahlen (z. B. „Noch frei“) nutzen normale statt gleich breiter Ziffern und wirken dadurch ruhiger.

## Technisch

- Neu ist `wishplan.js` mit `wishOrder`, `planWishes` und `applyWishPlan`. Es nutzt nur `createPot`, `saveGoal`, `upsertItem` und `suggestCategory`.
- Neues optionales Feld `settings.wishPlan = {monthly, order}`. `validate` prüft es: Betrag in Cent, IDs; veraltete IDs sind erlaubt. Ältere Versionen ignorieren das Feld. Kein bestehendes Feld wurde geändert.
- `planMeter` in `theme.js` ist der einzige Plan-gegen-Ist-Balken (Monat, Detailblatt, Rückblick).
- Farb-Tokens `--seg-*` neu, dazu `--seg-free-soft` für helle Jahresbalken. Geprüft mit dem Dataviz-Validator: Helligkeitsband, Sättigung, Farbenblind-Abstand ΔE ≥ 13 und Normalsicht-Abstand ΔE ≥ 15 für die farbigen Segmente, hell und dunkel. Die zwei grauen Segmente sind bewusst ungesättigt (Hervorhebung durch Zurücknahme) und tragen Beschriftungen.
- Service-Worker-Cache `v3-3`, `wishplan.js` in `ASSETS`.

## Geprüft

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 58/58 Fachtests (5 neu für den Fahrplan); UI-Ablauf 14 Blöcke, der Sparen-Block deckt jetzt Schieber, Speichern, Reihenfolge, Übernahme, Doppelschutz und Rückgängig ab |
| `npm run check` | 40 JS-Dateien, Module, Offline-Liste, Icons |
| Chromium 390/360 px hell, 390 px dunkel | keine Seitenfehler, kein horizontales Scrollen, Diagramme und Fahrplan angesehen |
| Fahrplan im Browser | Reihenfolge ändern, Schieber 300 € speichern, übernehmen → 3 Töpfe, Rückgängig → Wünsche wieder da |
| Update 3.1 → 3.2 im selben Browserprofil | Daten byte-identisch, Cache `v3-2` → `v3-3` |

## Grenzen

- Der Fahrplan spart Wünsche nacheinander an, nicht parallel. Wer zwei Dinge gleichzeitig will, stellt sie an Position 1 und 2 und nimmt einen höheren Betrag; dann bleibt Wunsch 2 trotzdem zweiter.
- Pro Wunsch gilt eine feste Rate in ganzen Monaten. Im letzten Monat eines Wunsches bleibt deshalb manchmal etwas vom Monatsbetrag ungenutzt (höchstens ein Monatsanteil). Das ist bewusst so, damit es pro Wunsch nur eine Sparrate gibt.
- Kein Test auf Deinem Handy.
