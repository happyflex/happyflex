# S.T.E.W.A.R.D. Workspace - API Contracts & Backend Integration

## Přehled
Dokument definuje API kontrakt pro budoucí backend implementaci S.T.E.W.A.R.D. Workspace dashboardu.

## Mock Data Location
Všechna mock data jsou v `/app/frontend/src/data/mockData.js`

## API Endpoints

### 1. Workspace Modules Management

#### GET `/api/modules`
Získání všech modulů uživatele
```json
Response: [
  {
    "id": "module-123",
    "type": "notes|tasks|contacts|projects|chart|timer",
    "position": { "x": 100, "y": 200 },
    "size": { "width": 400, "height": 300 },
    "zIndex": 1,
    "isDeferred": false
  }
]
```

#### POST `/api/modules`
Přidání nového modulu
```json
Request: {
  "type": "notes",
  "position": { "x": 100, "y": 200 }
}
```

#### PUT `/api/modules/:id`
Aktualizace pozice/velikosti modulu
```json
Request: {
  "position": { "x": 150, "y": 250 },
  "size": { "width": 450, "height": 350 },
  "zIndex": 2
}
```

#### DELETE `/api/modules/:id`
Smazání modulu

### 2. Notes Management

#### GET `/api/notes`
Seznam všech poznámek
```json
Response: [
  {
    "id": "1",
    "title": "Týdenní plán",
    "content": "Dokončit prezentaci...",
    "color": "#0ea5e9",
    "createdAt": "2025-02-05T10:00:00Z"
  }
]
```

#### POST `/api/notes`
Vytvoření nové poznámky
```json
Request: {
  "title": "Nová poznámka",
  "content": "Obsah",
  "color": "#0ea5e9"
}
```

#### PUT `/api/notes/:id`
Aktualizace poznámky

#### DELETE `/api/notes/:id`
Smazání poznámky

### 3. Tasks Management

#### GET `/api/tasks`
Seznam všech úkolů
```json
Response: [
  {
    "id": "1",
    "title": "Dokončit quarterly report",
    "completed": false,
    "priority": "high|medium|low",
    "dueDate": "2025-02-10"
  }
]
```

#### POST `/api/tasks`
Vytvoření nového úkolu

#### PUT `/api/tasks/:id`
Aktualizace úkolu (včetně toggle completed)

#### DELETE `/api/tasks/:id`
Smazání úkolu

### 4. Contacts Management

#### GET `/api/contacts`
Seznam kontaktů
```json
Response: [
  {
    "id": "1",
    "name": "Jan Novák",
    "email": "jan.novak@example.com",
    "phone": "+420 777 123 456",
    "company": "Tech Corp",
    "position": "CEO"
  }
]
```

#### POST `/api/contacts`
Přidání kontaktu

#### PUT `/api/contacts/:id`
Aktualizace kontaktu

#### DELETE `/api/contacts/:id`
Smazání kontaktu

### 5. Projects Management

#### GET `/api/projects`
Seznam projektů
```json
Response: [
  {
    "id": "1",
    "name": "Web Redesign",
    "progress": 75,
    "status": "active|completed|paused",
    "deadline": "2025-03-01",
    "team": ["Jan", "Marie", "Petr"]
  }
]
```

#### POST `/api/projects`
Vytvoření projektu

#### PUT `/api/projects/:id`
Aktualizace projektu

#### DELETE `/api/projects/:id`
Smazání projektu

### 6. Timer Sessions

#### GET `/api/timer-sessions`
Historie časovač sessions
```json
Response: [
  {
    "id": "1",
    "task": "Deep Work - Programování",
    "duration": 3600,
    "date": "2025-02-07"
  }
]
```

#### POST `/api/timer-sessions`
Uložení session po dokončení

### 7. Statistics

#### GET `/api/statistics/productivity`
Data pro grafy produktivity
```json
Response: [
  { "name": "Po", "hodnota": 65 },
  { "name": "Út", "hodnota": 78 }
]
```

## Database Schema (MongoDB)

### Collections:

1. **users**
   - _id, email, name, password_hash, created_at

2. **modules**
   - _id, user_id, type, position, size, z_index, is_deferred, created_at

3. **notes**
   - _id, user_id, title, content, color, created_at, updated_at

4. **tasks**
   - _id, user_id, title, completed, priority, due_date, created_at

5. **contacts**
   - _id, user_id, name, email, phone, company, position, created_at

6. **projects**
   - _id, user_id, name, progress, status, deadline, team[], created_at

7. **timer_sessions**
   - _id, user_id, task, duration, date, created_at

8. **productivity_stats**
   - _id, user_id, date, value, created_at

## Frontend Integration Changes

### Context Updates
`WorkspaceContext.js` bude potřebovat:
- Nahradit mock data voláními API
- Přidat error handling
- Přidat loading states
- Implementovat authentication

### Files to Update:
1. `/app/frontend/src/context/WorkspaceContext.js` - nahradit všechny mock operace API calls
2. Všechny moduly - přidat loading states a error handling

### Example API Integration:
```javascript
// Místo:
const [notes, setNotes] = useState(mockNotes);

// Použít:
const [notes, setNotes] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API}/notes`);
      setNotes(response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchNotes();
}, []);
```

## Authentication
Budoucí implementace bude potřebovat:
- JWT tokens pro autentizaci
- Login/Register pages
- Protected routes
- User context

## Next Steps for Backend
1. Setup MongoDB models podle schema výše
2. Implementovat všechny API endpoints
3. Přidat JWT authentication middleware
4. Aktualizovat frontend context pro použití real API
5. Přidat error handling a loading states do všech modulů
6. Implementovat WebSocket pro real-time updates (optional)
