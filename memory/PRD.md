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

### 4. Modul "Lidi" (People) - NOVĚ IMPLEMENTOVÁNO
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
│   │   ├── PeopleModule.jsx        # NOVÝ - Modul Lidi
│   │   ├── ProjectWorldModule.jsx
│   │   ├── ItemDetailPanel.jsx
│   │   ├── RelationshipTypeDialog.jsx
│   │   └── ...other modules
│   ├── ui/
│   ├── Canvas.jsx
│   ├── DraggableModule.jsx
│   ├── BottomToolbar.jsx
│   └── ...
├── context/
│   └── WorkspaceContext.js
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
- [x] Drag & drop připraveno pro přetažení do projektů

## Upcoming Tasks

### P1: Integrace Lidi do Project World
- Přetažení osoby z modulu Lidi do projektu
- Vytvoření vztahu "člověk se podílí na procesu"
- Přiřazení úkolů konkrétním lidem

### P1: Fáze 3 - Kontextuální projekce
- Zobrazení relevantních položek z jiných podprojektů

### P2: Backend implementace
- Migrace z localStorage na FastAPI + MongoDB

### P2: Kalendář pro členy týmu
- Plná implementace osobního kalendáře

## Testing Status
- Testing agent iteration_1: 95% (Relationship Logic)
- Testing agent iteration_2: 100% (Modul Lidi)

## Preview URL
https://modular-dashboard-8.preview.emergentagent.com
