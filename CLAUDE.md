# CLAUDE.md
 
Leitplanken und Konventionen für Claude Code in diesem Repository.
 
## GitHub-Workflow
 
Repository: `ml-hub-git/Skattrainer3000`
 
### Push-Mechanik (wichtig für Claude)
 
- **MCP GitHub-Tools sind hier read-only.** Sowohl `mcp__github__create_or_update_file` als auch `mcp__github__push_files` antworten mit HTTP 403 "Resource not accessible by integration". Nicht darauf verlassen für Writes.
- **Pushes laufen über `git push` direkt nach `github.com`.** Dafür braucht es einen PAT, den der User bei Bedarf im Chat teilt. Transient verwenden, nie persistieren, nie in Dateien schreiben.
- Nach Gebrauch den User erinnern, den Token unter https://github.com/settings/tokens zu widerrufen (GitHubs Secret-Scanning revoziert ihn ggf. schon automatisch).
### Branch-Policy (pragmatisch)
 
- **Größere Features / Refactorings / Strukturänderungen** → neuer Branch `claude/kurze-beschreibung`, nach dem Push melden: *"Branch X ist bereit — PR bitte selbst öffnen"*
- **Kleinigkeiten** (Version-Bump, Tippfehler, Einzeilen-Fixes) → direkt auf `main`
### Keine Auto-PRs
 
Claude erstellt **keine** PRs. Nach dem Push auf einen Feature-Branch erledigt GitHub selbst die Vorarbeit:
 
- GitHubs Push-Output zeigt eine Vorschlags-URL (`/pull/new/<branch>`); auf der Repo-Seite erscheint oben die gelbe "Compare & pull request"-Leiste.
- Klick darauf öffnet das neue-PR-Formular **vorausgefüllt**:
  - Base = `main`, Compare = gepushter Branch
  - Titel = Commit-Subject (wenn nur ein Commit im Branch)
  - Body = Commit-Body
- User klickt "Create pull request" → "Merge pull request" → fertig.
**Konsequenz:** Gute Commit-Messages sind hier der halbe PR. Deshalb:
 
## Commit-Messages
 
- Sprache: **Deutsch**
- Titelzeile kurz (< 70 Zeichen), konkret, präzise
- Leerzeile, dann Body mit dem **Warum** (nicht dem Was — das zeigt der Diff)
- Bei Feature-Branches: Body-Stil als Stichpunktliste, weil er direkt zur PR-Beschreibung wird
- Footer-Link `https://claude.ai/code/session_...` wie bisher beibehalten
Beispiel:
```
v2.4: Persistenter Rang
 
Einmal erreichte Ränge bleiben erhalten, auch wenn der Streak bricht.
Nur ein Wechsel des Schwierigkeitsgrades setzt Rang und Streak zurück.
 
- Neues Feld highestRankIdx in skat_p
- Backfill aus record für Bestands-Saves
- updateStats zeigt max(aktueller Rang, gespeicherter Rang)
 
https://claude.ai/code/session_...
```
 
## Projektstruktur (statische Single-Page-App)
 
- `index.html` — nur HTML-Struktur. **Kein Inline-CSS, kein Inline-JavaScript.**
- `style.css` — alle CSS-Regeln. Google-Fonts (Playfair Display, Lato) via CDN im `<head>`.
- `app.js` — gesamtes JavaScript. Im HTML eingebunden als:
  ```html
  <script src="app.js" defer></script>
  ```
  Platzierung im `<head>`; `defer` ist Pflicht.
- Kein Build-Step, kein Bundler, kein Framework. Alles plain statisch, GitHub-Pages-tauglich.
## Version-Bump-Regel
 
Version wird an **zwei** Stellen synchron gepflegt:
1. `index.html` Footer: `<p class="version-tag">vX.Y</p>`
2. `app.js` Header-Kommentar Zeile 2: `SKAT TRAINER vX.Y`
Beide gemeinsam in einem Commit aktualisieren.
 
## localStorage-Schlüssel (keine neuen erfinden)
 
- `skat_p` — JSON-Objekt mit dem gesamten Fortschritt. Felder:
  - `streak`, `record`, `games`, `wins`
  - `history` (Array der letzten bis zu 50 Accuracy-Werte)
  - `lastWinDate`, `dayStreak`
  - `avgMode` (10 / 20 / 50)
  - `onboardingSeen`
  - `difficulty` (`'easy'` / `'normal'` / `'hard'`)
  - `box1Mode` (`'streak'` / `'record'`)
  - `box2Mode` (`'today'` / `'wins'` / `'games'`)
  - `highestRankIdx` (0–6, seit v3.0 persistenter Rang)
- `skat_haptic` — String `'on'` / `'off'` (Vibrations-Toggle)
Bei Schema-Erweiterungen: Feld in `defP()` ergänzen und sicherstellen, dass `loadP()` alte Saves migriert (`for (var k in defs)`-Merge ist dafür da).
 
## Security-Guardrail
 
- **Niemals** Secrets, Tokens, API-Keys, Passwörter in committete Dateien schreiben — auch nicht in Kommentare, auch nicht in diese CLAUDE.md.
- Der einzige legitime Ort für User-Secrets ist der Chat, transient, ausschließlich für den aktuellen Task.
