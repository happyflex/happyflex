# S.T.E.W.A.R.D. Workspace Dashboard

Futuristický workspace dashboard inspirovaný Tony Starkem pro správu poznámek, úkolů, projektů a produktivity.

## ✨ Funkce

### 🎯 Modulární Canvas Systém
- **Drag & Drop**: Přesouvejte moduly po canvasu
- **Odložené moduly**: Minimalizujte moduly do pravého sidebaru
- **Dynamické přidávání**: Klikněte na ikonu v bottom toolbar pro přidání modulu

### 📦 Dostupné Moduly

1. **📝 Poznámky**
   - Vytváření barevných poznámek
   - Kategorizace podle barev
   - Smazání poznámek

2. **✅ Úkoly**
   - Správa úkolů s prioritami (vysoká, střední, nízká)
   - Datum splnění
   - Označení jako dokončené
   - Oddělený seznam aktivních a dokončených

3. **👥 Kontakty**
   - Databáze kontaktů
   - Email, telefon, firma, pozice
   - Avatar s iniciálami

4. **📊 Projekty**
   - Sledování progress projektů (%)
   - Status (aktivní, dokončený, pozastavený)
   - Deadline a členové týmu

5. **📈 Statistiky**
   - Týdenní graf produktivity
   - Průměr a maximum
   - Animované sloupcové grafy

6. **⏱️ Časovač**
   - Stopky pro měření času
   - Historie sessions
   - Start/Pauza/Reset

## 🎨 Design

- **Dark theme** s gradient pozadím (tmavě modrá → fialová)
- **Cyan accent** barvy pro interaktivní elementy
- **Glassmorphism** efekty na modulech
- **Smooth animace** a transitions
- **Grid overlay** na pozadí pro futuristický vzhled

## 🛠️ Technologie

- **Frontend**: React 19, React Context API
- **UI**: Shadcn/ui komponenty, Tailwind CSS
- **Ikony**: Lucide React
- **Backend**: FastAPI (připraveno pro integraci)
- **Database**: MongoDB (připraveno pro integraci)

## 📂 Struktura Projektu

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Hlavní navigace
│   │   ├── Canvas.jsx              # Pracovní plocha
│   │   ├── BottomToolbar.jsx       # Nástroje pro přidání modulů
│   │   ├── RightSidebar.jsx        # Odložené moduly
│   │   ├── DraggableModule.jsx     # Wrapper pro přesouvatelné moduly
│   │   └── modules/
│   │       ├── NotesModule.jsx
│   │       ├── TasksModule.jsx
│   │       ├── ContactsModule.jsx
│   │       ├── ProjectsModule.jsx
│   │       ├── ChartModule.jsx
│   │       └── TimerModule.jsx
│   ├── context/
│   │   └── WorkspaceContext.js     # Globální state management
│   ├── data/
│   │   └── mockData.js             # Mock data pro všechny moduly
│   └── App.js
└── contracts.md                     # API contracts pro backend
```

## 🚀 Jak Používat

### Přidání Modulu
1. Klikněte na ikonu v dolním toolbar
2. Modul se objeví na canvasu

### Přesun Modulu
1. Klikněte na header modulu (horní lišta)
2. Přetáhněte na požadované místo

### Minimalizace Modulu
1. Klikněte na ikonu minus v headeru modulu
2. Modul se přesune do pravého sidebaru
3. Pro obnovení klikněte na modul v sidebaru

### Zavření Modulu
1. Klikněte na ikonu X v headeru modulu

## 📊 Mock Data

Aplikace používá mock data pro demonstraci funkcionality:
- 2 poznámky
- 4 úkoly
- 3 kontakty
- 3 projekty
- Týdenní statistiky
- 3 časovač sessions

**POZNÁMKA**: Všechna data jsou momentálně MOCKOVÁNA a neuloží se po refreshi stránky.

## 🔮 Připraveno pro Backend

V souboru `/app/contracts.md` jsou definovány:
- API endpoints pro všechny moduly
- MongoDB schema
- Plán integrace s backendem
- Authentication flow

## 🎯 Budoucí Vylepšení

- [ ] Backend API integrace
- [ ] Autentizace uživatelů
- [ ] Persistentní ukládání dat
- [ ] Real-time synchronizace (WebSocket)
- [ ] Export/import workspace
- [ ] Více typů grafů
- [ ] Kalender modul
- [ ] AI asistent (tlačítko s sparkles ikonou)

## 🎨 Barevná Paleta

- **Background**: `#0a1628`, `#0d1b3a`, `#1a1f3a`
- **Accent**: `#06b6d4` (cyan)
- **Gradient**: cyan → blue → purple
- **Text**: `#ffffff` (white), `#9ca3af` (gray)

## 💡 Inspirace

Dashboard je inspirován futuristickým UI z Iron Man filmů (J.A.R.V.I.S., F.R.I.D.A.Y.) a moderními workspace nástroji jako Notion a Monday.com.

---

**Vytvořeno s ❤️ pro produktivní práci**
