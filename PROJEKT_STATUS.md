# Projekt-Status: Skattrainer3000

## Kernziel

Statische, mobile-first Web-App zum Trainieren des Skat-Kartenrechnens (Schätzung der Punkte beider Parteien über 10 Runden). Hostbar auf GitHub Pages, kein Backend, kein Build-Step. Aktueller Entwicklungsschwerpunkt: Theme-System (Default + Casino) sowie visueller Glow-Effekt am Spieltisch.

---

## Technischer Stack

| Datei | Rolle |
|---|---|
| `index.html` | Nur HTML-Struktur, kein Inline-CSS, kein Inline-JS |
| `style.css` | Alle CSS-Regeln inkl. CSS Custom Properties für Theming |
| `app.js` | Gesamtes JavaScript, eingebunden per `<script src="app.js" defer>` im `<head>` |

- **Hosting:** GitHub Pages (`ml-hub-git/Skattrainer3000`)
- **Framework/Bundler:** keiner — reines Vanilla JS
- **Fonts:** Google Fonts CDN — ausschließlich Playfair Display + Lato
- **Persistenz:** `localStorage` → Key `skat_p` (JSON-Objekt) + `skat_haptic`
- **Theming:** CSS Custom Properties, gescoped über `[data-theme="default"]` vs. `[data-theme="casino"]`

---

## Wichtige Entscheidungen

### Architektur (seit v3.0, dauerhaft gültig)
- Drei-Datei-Trennung (HTML/CSS/JS), keine Inline-Styles im HTML
- Weiße Karten + `color-scheme: light` als Force-Dark-Workaround
- 3D-Flip-Animation, SVG-Ring-Timer (rAF), Genauigkeit in % (÷ 120 − Skat-Punkte)
- `bothExact`-Prüfung (statt `acc === 100`) löst Gold-Burst aus (Ring + 12 Strahlen + 14 Funken)
- Variante-A-Reveal: Eingabebox = Reveal-Element, Truth-Zahl rechts bei Fehler
- Persistenter Rang (`highestRankIdx` in `skat_p`): Anzeige = max(aktueller Rang, gespeicherter); Reset nur bei Difficulty-Wechsel
- `localStorage`-Migration via `for (var k in defs)`-Merge in `loadP()`
- Parteilabels 90° gedreht, `#result` im Filz, Inputs zentriert

### Theme-System (seit v3.1)
- Semantische Token-Hierarchie: Body < Section-Container < Slot (`--surface-tile`) < Stat
- `--surface-*` = ausschließlich Hintergründe; `--text-*` = ausschließlich Textfarben (strikt getrennt)
- Casino-Theme: Sekundärtext/Borders/Arrow-Glow gezielt aufgehellt (Amber statt Rot), Schatten weniger hart — reiner Token-Pass, keine Layout-/JS-Änderungen
- Casino-Fonts (Cinzel/IM Fell English): **verworfen** — nie per CDN geladen, zurück zu Default-Fonts
- Casino-Borders: von opak-dunkelbraun (`#2a2010`) auf semitransparentes Gold (`#c9a84c40`) umgestellt

### Glow-Effekt am Spieltisch (seit v3.1.4)
- Inset-Schatten (direktional, links/rechts), kein äußerer Border-Glow
- Parameter: `inset 50px 0 80px -20px var(--glow-color-hard)`
- `--glow-color-hard` opak, kein Alpha (Default: `#ff1a1a` Rot; Casino: `#e0ba50` Gold)

### Workflow (dauerhaft, in CLAUDE.md dokumentiert)
- MCP-GitHub-Write-Tools (`push_files`, `create_or_update_file`): HTTP 403, faktisch read-only → Pushes laufen via `git push` + PAT direkt zu GitHub
- SSH (Port 22 blockiert), `credential.helper store` (Klartext), Token im Repo (Secret-Scanning) — alle **verworfen**
- Claude erstellt **keine** PRs; User öffnet selbst via GitHub-Banner
- Commits auf Deutsch, Body erklärt das Warum, Footer = Session-URL
- Version-Bump synchron an zwei Stellen: `index.html` Footer + `app.js` Header-Kommentar

---

## Aktueller Stand

**Aktuelle Version: v3.1.4** (auf Branch `claude/add-theme-system-DAFj9`)

| Version | Branch | Inhalt |
|---|---|---|
| v3.0 | `main` | Drei-Datei-Aufteilung, persistenter Rang, CLAUDE.md |
| v3.1.0 | `claude/theme-system` | Theme-System eingeführt (Default + Casino) |
| v3.1.1 | `claude/theme-system` | Kontrast- & Lesbarkeits-Pass |
| v3.1.2 | `claude/add-theme-system-DAFj9` | Zirkuläre `--card-text`-Variable gefixt (Default + Casino) |
| v3.1.3 | `claude/add-theme-system-DAFj9` | Casino: Schriftkontrast, Gold-Borders, Font-Overrides entfernt |
| v3.1.4 | `claude/add-theme-system-DAFj9` | `.tisch-hint`, `.side-label`, `.side-arrow` auf `--text-muted`; zirkuläre `--arrow-active`-Variable gefixt |
| v3.1.5 | `claude/create-projekt-status-TAWKv` | `active-a`/`active-b` in `style.css` aktualisiert (neuer Glow) | 

---

## Offene Punkte

### Sofort (User-Aktion erforderlich)
-

### Features (noch nicht beauftragt)
- [ ] Bilder für die einzelnen Level des Fortschritts
- [ ] Echte B/D/K-Kartengrafiken (me.uk/cards CC0 mit Index-Remap oder eigene SVGs)
- [ ] PWA / Service Worker / Manifest / Homescreen-Installation
- [ ] Konfetti als Meilenstein-Effekt (Rang-Aufstieg, neuer Rekord)
- [ ] Mikro-Effekte: Punkt-Float, Zähler-Animation
- [ ] Cache-Busting-Strategie für `style.css`/`app.js` (Query-String oder Hash)

---

## Technische Schuld

| Problem | Status |
|---|---|
| Samsung Internet Dark-Mode invertiert Karten teilweise | Keine 100 %-Lösung bekannt |
| Hard-Mode-Timer läuft bei geöffneten Settings weiter | Kein Pause-Mechanismus implementiert |
| `fireGoldBurst` auf Viewports < 360 px nicht final geprüft | Ausstehend |
| Truth-Reveal-Verschiebung (~13 px) durch zentrierte `.score-row` | Bewusst nicht gefixt (kaum wahrnehmbar während Scale-Animation) |
