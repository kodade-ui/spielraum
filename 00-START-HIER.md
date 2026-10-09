# Spielraum an Claude übergeben

Stand: 9. Oktober 2026 · App-Version 3.1 (Übergabe von GPT: 2.12, 6. Oktober 2026) · Deutsch · Android-PWA · https://spielraum-k7.rotkehlchen42.workers.dev/

Änderungen seit der Übergabe: `docs/AENDERUNGEN-2.13.md`, `docs/AENDERUNGEN-3.0.md`, `docs/AENDERUNGEN-3.1.md`.

Dieses Paket enthält die vollständige statische App, ihre Tests, vorhandene Icons und eine Übergabe. Deine persönlichen Eingaben sind nicht enthalten. Die bestehende App wurde für den Export nicht verändert.

## Für Dich

1. Gib Claude dieses ZIP und den Text aus `01-AUFTRAG-FUER-CLAUDE.md`.
2. Falls Deine Claude-Oberfläche ZIP-Dateien nicht öffnen kann, entpacke das ZIP und verwende eine Arbeitsumgebung, die den ganzen Projektordner bearbeiten kann. Nur Screenshots oder der App-Link reichen nicht. Claude soll fehlenden Dateizugriff offen benennen.
3. Lass Claude zuerst `CLAUDE.md` und `docs/OFFENE-PUNKTE.md` lesen und den Stand prüfen. Eine neue Funktion oder Veröffentlichung erfolgt erst nach Deiner Freigabe.
4. Bevor Du später auf eine andere App-Adresse umziehst: in der bisherigen App **Daten & Backup → Backup speichern**. Diese private Datei bleibt bei Dir; verwende Beispieldaten für die Entwicklung.
5. Bei einer neuen Adresse: dort das Backup über **Daten & Backup → Wiederherstellen** importieren und Beträge/Monate prüfen. Behalte die alte App, bis der Umzug geprüft ist. Website-Daten nicht löschen.

Ein normaler Chat kann Quellcode besprechen, muss aber nicht dieselben Möglichkeiten zum Bearbeiten, Ausführen und Veröffentlichen haben wie eine Entwicklungsumgebung. Die Übergabe enthält deshalb keine Annahme über Dein Claude-Abo oder einen bestimmten Claude-Modus.

## Für Claude / die Entwicklungsumgebung

Mit Node.js 24 (geprüft mit 24.19.0), ohne zusätzliche npm-Pakete:

```sh
npm start
```

Die lokale App läuft unter `http://127.0.0.1:4173`. `dist/index.html` nicht direkt per Doppelklick als `file://` öffnen: ES-Module und PWA benötigen einen Webserver.

```sh
npm test
npm run check
```

`npm install` ist für Start und Tests nicht erforderlich. `dist/` enthält den bearbeitbaren Quellcode und zugleich die veröffentlichungsfähigen Dateien; es gibt keinen Bundler oder Build-Schritt.

## Orientierung

| Datei/Ordner | Zweck |
| --- | --- |
| `01-AUFTRAG-FUER-CLAUDE.md` | Fertiger Einstiegstext zum Einfügen |
| `CLAUDE.md` | Arbeitsregeln und technische Orientierung |
| `docs/ARCHITEKTUR-UND-RECHENREGELN.md` | Datenmodell, Verknüpfungen und Berechnungen |
| `docs/OFFENE-PUNKTE.md` | Was fertig ist, was fehlt und welche Prioritäten gelten |
| `docs/TESTEN-UND-UMZIEHEN.md` | Prüfabläufe, Backup und Veröffentlichung |
| `docs/ENTWICKLUNGSHISTORIE.md` | Original-README mit Historie; ältere Abschnitte beschreiben teilweise überholte Regeln |
| `dist/` | Vollständige App inklusive PWA und Icons |
| `tests/` | Fachtests und synthetische Bedienabläufe |
| `tools/` | Für diese Übergabe ergänzter lokaler Server und Teststarter |
| `SOURCE-MANIFEST.json` | Quellstand, Originaldateien und Prüfsummen |

## Grenzen dieser Übergabe

- Keine Bankanbindung, kein KI-Schlüssel und keine echten Finanzdaten enthalten.
- Keine Git-Zugangsdaten, Hosting-Berechtigungen oder aktive Sitzung enthalten.
- Die bisherige Adresse ist kein übertragbarer Hosting-Zugang. Dieses Paket ist zunächst für lokale Weiterentwicklung oder ein separat freigegebenes Hosting gedacht.
- Die App speichert Finanzdaten im Browser des jeweiligen Geräts. Ein neues Gerät, Browserprofil, eine neue Domain oder ein anderer lokaler Port hat einen eigenen Datenstand.
- Die Darstellung wurde bisher nicht auf dem physischen Handy visuell abgenommen. Das ist eine offene Prüfung, kein bereits erfülltes Qualitätsmerkmal.
