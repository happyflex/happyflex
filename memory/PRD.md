# S.T.E.W.A.R.D. Workspace - Product Requirements Document

## Original Problem Statement
Vytvoření pixel-perfect klonu dashboardu z `https://stark-workspace-hub.base44.app`, který se vyvinul do vlastní feature-rich workspace aplikace podle specifických požadavků uživatele.

## Jazyk
Celé rozhraní aplikace je v **češtině**.

## Core Features

### 1. Modular Dashboard
- Drag & drop canvas systém
- Přizpůsobitelné moduly (poznámky, úkoly, kontakty, projekty, časovač, grafy)
- Resize, maximize, minimize okna
- Workspace layouts - ukládání a načítání konfigurace

### 2. Project World (Hlavní feature)
- Fullscreen modul pro správu projektů
- Hierarchická stromová struktura podprojektů
- Freeform canvas pro přidávání a propojování obsahu

### 3. Relationship Logic (Fáze 1 & 2) - IMPLEMENTOVÁNO
- **ItemDetailPanel**: Pravý panel zobrazující detail vybraného objektu
  - Sekce "Použito v" - kde se objekt nachází
  - Sekce "Související s" - propojené objekty s typy vztahů
  - Sekce "Informace" - ID a typ objektu
- **RelationshipTypeDialog**: Dialog pro výběr typu vztahu při vytváření spojení
  - Je součástí (modrá)
  - Ovlivňuje (fialová)
  - Závisí na (žlutá)
  - Blokuje (červená)
  - Souvisí s (cyan)
- **SVG Connection Lines**: Vizuální spojnice mezi objekty s popisky typů vztahů

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, shadcn/ui
- **State Management**: React Context API (WorkspaceContext)
- **Persistence**: localStorage (mockovaná data - žádný backend)
- **Interaktivity**: react-draggable, custom resize handlers

## Data Schema (localStorage)
```javascript
// Workspace modules
modules: [{ id, type, position: {x, y}, size: {width, height}, zIndex }]

// Project World data
project_world_{projectId}: {
  structure: {
    root: {
      id: 'root',
      name: 'Hlavní projekt',
      children: [...subprojects],
      items: [...canvasItems],
      connections: [{ id, from, to, type }]
    }
  }
}
```

## File Structure
```
/app/frontend/src/
├── components/
│   ├── modules/
│   │   ├── ProjectWorldModule.jsx  # Hlavní komponenta Project World
│   │   ├── ItemDetailPanel.jsx     # Panel detailu objektu
│   │   ├── RelationshipTypeDialog.jsx  # Dialog typu vztahu
│   │   ├── ProjectTree.jsx         # Stromová navigace
│   │   └── ...other modules
│   ├── ui/                         # shadcn/ui komponenty
│   ├── Canvas.jsx
│   ├── BottomToolbar.jsx
│   └── ...
├── context/
│   └── WorkspaceContext.js
└── ...
```

## Co bylo implementováno (Prosinec 2025)

### Session 1 - Core Dashboard
- [x] Modular dashboard s drag & drop
- [x] Window management (resize, maximize, fit)
- [x] Workspace layouts (save/load)
- [x] Bug fix: text selection during drag

### Session 2 - Project World MVP
- [x] Project World jako fullscreen modul
- [x] Stromová struktura podprojektů
- [x] Canvas pro přidávání položek
- [x] Build fix: rekurzivní komponenta

### Session 3 - Relationship Logic (Fáze 1 & 2)
- [x] ItemDetailPanel s detaily objektu
- [x] RelationshipTypeDialog pro výběr typu vztahu
- [x] SVG spojnice s popisky typů
- [x] Vylepšená viditelnost spojnic (opacity 0.9, strokeWidth 3)

## Upcoming Tasks

### P1: Fáze 3 - Kontextuální projekce
- Zobrazení relevantních položek z jiných podprojektů
- Read-only odkazy na související objekty

### P1: Backend implementace
- Migrace z localStorage na FastAPI + MongoDB
- API design dle contracts.md

### P2: Sdílení objektů
- Reference objektů bez duplikace dat
- Synchronizace změn across podprojektů

### P2: Pokročilé typy obsahu
- Visual sketchpady
- Flow diagram editory
- Embedded média

### P3: Alternativní pohledy
- High-level dashboard
- Timeline/roadmap view
- Grafy a metriky

## Testing Status
- Testing agent: 95% frontend success rate
- ItemDetailPanel: PASS
- RelationshipTypeDialog: PASS
- SVG connections: PASS (improved visibility)
- Connection flow: PASS

## Known Issues
- Žádné kritické issues
- UX suggestion: Connection lines můžou být ještě výraznější v určitých barevných schématech

## Preview URL
https://modular-dashboard-8.preview.emergentagent.com
