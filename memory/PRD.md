# S.T.E.W.A.R.D. Workspace - Product Requirements Document

## Original Problem Statement
Vytvoření pixel-perfect klonu dashboardu z `https://stark-workspace-hub.base44.app`, který se vyvinul do vlastní feature-rich workspace aplikace podle specifických požadavků uživatele.

## Jazyk
Celé rozhraní aplikace je v **češtině**.

## Core Features

### 1. Modular Dashboard
- Drag & drop canvas systém
- Přizpůsobitelné moduly (poznámky, úkoly, lidi, projekty, časovač, grafy)
- Resize, maximize, minimize okna
- Workspace layouts - ukládání a načítání konfigurace

### 2. Project World (Hlavní feature)
- Fullscreen modul pro správu projektů
- Hierarchická stromová struktura podprojektů
- Freeform canvas pro přidávání a propojování obsahu

### 3. Relationship Logic (Fáze 1 & 2) - IMPLEMENTOVÁNO
- **ItemDetailPanel**: Pravý panel zobrazující detail vybraného objektu
- **RelationshipTypeDialog**: Dialog pro výběr typu vztahu při vytváření spojení
- **SVG Connection Lines**: Vizuální spojnice mezi objekty s popisky typů vztahů

### 4. Modul "Lidi" (People) - IMPLEMENTOVÁNO
Centrální databáze osob sloužící jako zdroj pro projekty, procesy a plánování práce.

**Základní profil osoby:**
- Jméno
- Role v týmu
- Dovednosti / silné stránky  
- Dostupnost (Dostupný/Zaneprázdněný/Nepřítomen/Neznámá)
- Kontaktní údaje (email, telefon)

**Osobní pracovní kontext:**
- Pro členy týmu: osobní to-do list, kalendář (placeholder)
- Pro investory/dodavatele/klienty: checklist úkolů vůči té osobě

**Větvení typů osob:**
- Tým (cyan badge)
- Dodavatel (oranžová badge)
- Investor (zelená badge)
- Klient (fialová badge)
- Ostatní (šedá badge)

**Funkce:**
- Vyhledávání osob
- Filtrování podle typu
- Sbalitelné/rozbalitelné kategorie
- Drag & drop ready pro přetažení do projektů/procesů
- Přidání/editace/mazání osob
- Persistence do localStorage

### 5. Pokročilá správa oken - NOVĚ IMPLEMENTOVÁNO (Prosinec 2025)

**Fáze 1 - Pin & Focus Mode:**
- **Pin tlačítko**: Cyklování mezi 3 stavy:
  - `none` (šedá) - normální okno
  - `lock` (oranžová) - zamčená pozice, nelze přetahovat
  - `top` (fialová) - vždy nahoře (zIndex: 9999)
- **Focus Mode**: Dvojklik na záhlaví okna ztmaví ostatní okna (opacity: 0.4)
- **ESC**: Ukončí focus mode

**Fáze 2 - Snap/Split systém:**
- Přetažení okna k okraji obrazovky zobrazí cyan náhled
- Snap zóny (práh 50px):
  - Levý okraj → levá polovina
  - Pravý okraj → pravá polovina
  - Horní okraj → maximalizace
  - Rohy → čtvrtinové rozložení
- České popisky v náhledech

**Fáze 3 - Magnetismus:**
- Okna se automaticky přichytávají k sobě navzájem (práh 15px)
- Přichytávání hran: levá-levá, pravá-pravá, levá-pravá, pravá-levá
- Funguje pouze když okno není v snap zóně okraje

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, shadcn/ui
- **State Management**: React Context API (WorkspaceContext)
- **Persistence**: localStorage (mockovaná data - žádný backend)
- **Interaktivity**: react-draggable, custom resize handlers

## Data Schema (localStorage)

```javascript
// People data
steward_people: [{
  id: string,
  name: string,
  type: 'team' | 'supplier' | 'investor' | 'client' | 'other',
  role: string,
  skills: string[],
  availability: 'available' | 'busy' | 'away' | 'unknown',
  email: string,
  phone: string,
  todos: [{ id, text, completed }],      // Pro členy týmu
  calendar: [{ id, title, date, recurring }],  // Pro členy týmu
  checklist: [{ id, text, completed }]   // Pro ostatní typy
}]

// Project World data
project_world_{projectId}: {
  structure: {
    root: {
      id, name, children, items, connections
    }
  }
}
```

## File Structure
```
/app/frontend/src/
├── components/
│   ├── modules/
│   │   ├── PeopleModule.jsx
│   │   ├── GoalsModule.jsx
│   │   ├── PlanCanvas.jsx
│   │   ├── ProcessesModule.jsx
│   │   ├── ProcessCanvas.jsx
│   │   └── ...other modules
│   ├── ui/
│   ├── Canvas.jsx              # Snap preview overlay
│   ├── DraggableModule.jsx     # Window management (pin, focus, snap, magnet)
│   ├── BottomToolbar.jsx       # Workzones, toolbar
│   ├── RightSidebar.jsx        # CANVAS buffer
│   └── ...
├── context/
│   └── WorkspaceContext.js     # Global state
└── ...
```

## Co bylo implementováno

### Session 1 - Core Dashboard
- [x] Modular dashboard s drag & drop
- [x] Window management (resize, maximize, fit)
- [x] Workspace layouts (save/load)

### Session 2 - Project World MVP
- [x] Project World jako fullscreen modul
- [x] Stromová struktura podprojektů
- [x] Canvas pro přidávání položek

### Session 3 - Relationship Logic (Fáze 1 & 2)
- [x] ItemDetailPanel s detaily objektu
- [x] RelationshipTypeDialog pro výběr typu vztahu
- [x] SVG spojnice s popisky typů

### Session 4 - Modul Lidi (Prosinec 2025)
- [x] Přejmenování "Kontakty" na "Lidi"
- [x] Rozšířený profil osoby (role, dovednosti, dostupnost)
- [x] Větvení typů: Tým, Dodavatel, Investor, Klient, Ostatní
- [x] Osobní to-do list pro členy týmu
- [x] Checklist úkolů vůči externím osobám
- [x] Vyhledávání a filtrování

### Session 5 - Strategické moduly & UI (Prosinec 2025)
- [x] Modul Cíle (Goals) s PlanCanvas
- [x] Modul Procesy s ProcessCanvas
- [x] Workzones (Problem Solving, Planning, Executing) s barevnými tématy
- [x] CANVAS buffer (pravý sidebar) pro dočasné odkládání modulů
- [x] Obousměrný drag & drop mezi workspace a CANVAS

### Session 6 - Pokročilá správa oken (Prosinec 2025)
- [x] Fáze 1: Pin funkce (lock, always-on-top) + Focus Mode
- [x] Fáze 2: Snap/Split systém (okraje, rohy, náhledy)
- [x] Fáze 3: Magnetismus (přichytávání oken k sobě)

### Session 7 - Modul Kalendář (Únor 2026)
- [x] Nový modul Kalendář přidán do workspace
- [x] Tři pohledy: Denní, Týdenní (výchozí), Měsíční
- [x] Události s atributy: název, datum/čas, typ (schůzka/fokus/deadline/připomínka), projekt
- [x] CRUD operace: vytvoření, editace, mazání událostí
- [x] Persistence do localStorage (steward_calendar_events)
- [x] Barevné kódování typů událostí (modrá/fialová/červená/žlutá)
- [x] Navigace v čase (předchozí/další, tlačítko "Dnes")
- [x] Zvýraznění aktuálního dne

### Session 8 - Cursor HUD Ring (Únor 2026)
- [x] Subtilní HUD ring kolem kurzoru (36px průměr, 1.5px stroke)
- [x] Zobrazení pouze při interakci: drag okna, snap preview, workzone změna, focus mode
- [x] Segmentovaný ring (levý, pravý, horní, spodní) pro snap indikaci
- [x] Zvýraznění aktivního segmentu při přiblížení k okraji
- [x] Workzone pulse - barevný pulz při změně workzone
- [x] Focus pulse - krátké zesílení při aktivaci focus mode
- [x] Jemný glow efekt s SVG filtry
- [x] Plynulé transitions (150ms)

### Session 9 - Modul Hudba/Media Player (Únor 2026)
- [x] Nový modul Hudba jako plnohodnotné okno workspace
- [x] 3 taby: Přehrávač, Knihovna, Playlisty
- [x] Knihovna s podporou: audio soubory (upload), video/stream linky (YouTube embed)
- [x] Playlisty: CRUD operace, přidávání položek z knihovny, reorder, mazání
- [x] Přehrávač: play/pause, prev/next, seek bar, volume, mute, repeat, shuffle
- [x] YouTube embed přehrávání pro video odkazy
- [x] Mini režim pro kompaktní zobrazení
- [x] Persistence do localStorage (knihovna, playlisty, stav přehrávání)
- [x] Integrace s CANVAS buffer (blok ↔ okno)

## Upcoming Tasks

### P1: Integrace Lidi do Project World
- Přetažení osoby z modulu Lidi do projektu
- Vytvoření vztahu "člověk se podílí na procesu"
- Přiřazení úkolů konkrétním lidem

### P1: Process-People Integration
- Přetahování uživatelů z modulu Lidi do Process Canvas pro přiřazení rolí

### P2: Process-Task Integration
- Přetahování kroků z Process Canvas do modulu Úkoly pro vytvoření konkrétních úkolů

### P2: Backend implementace
- Migrace z localStorage na FastAPI + MongoDB

### P2: Kalendář pro členy týmu
- Plná implementace osobního kalendáře

## Testing Status
- Testing agent iteration_1: 95% (Relationship Logic)
- Testing agent iteration_2: 100% (Modul Lidi)
- Testing agent iteration_3: 100% (Pokročilá správa oken - Pin, Focus, Snap, Magnetismus)
- Testing agent iteration_4: Pending (Kalendář - manuálně otestován)

## Preview URL
https://restore-nav-intent.preview.emergentagent.com
