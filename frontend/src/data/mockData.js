// Mock data pro S.T.E.W.A.R.D. Workspace

export const mockNotes = [
  {
    id: '1',
    title: 'Týdenní plán',
    content: 'Dokončit prezentaci pro klienta\nPřipravit analýzu trhu\nSchůzka s týmem ve čtvrtek',
    color: '#0ea5e9',
    createdAt: '2025-02-05T10:00:00Z'
  },
  {
    id: '2',
    title: 'Nápady na projekt',
    content: 'AI asistent pro produktivitu\nIntegrace s kalendářem\nMobilní aplikace',
    color: '#8b5cf6',
    createdAt: '2025-02-04T14:30:00Z'
  }
];

export const mockTasks = [
  {
    id: '1',
    title: 'Dokončit quarterly report',
    completed: false,
    priority: 'high',
    dueDate: '2025-02-10'
  },
  {
    id: '2',
    title: 'Code review PR #234',
    completed: true,
    priority: 'medium',
    dueDate: '2025-02-07'
  },
  {
    id: '3',
    title: 'Aktualizovat dokumentaci',
    completed: false,
    priority: 'low',
    dueDate: '2025-02-15'
  },
  {
    id: '4',
    title: 'Zavolat klientovi',
    completed: false,
    priority: 'high',
    dueDate: '2025-02-08'
  }
];

export const mockContacts = [
  {
    id: '1',
    name: 'Jan Novák',
    email: 'jan.novak@example.com',
    phone: '+420 777 123 456',
    company: 'Tech Corp',
    position: 'CEO'
  },
  {
    id: '2',
    name: 'Marie Svobodová',
    email: 'marie.s@example.com',
    phone: '+420 777 987 654',
    company: 'Innovation Hub',
    position: 'Project Manager'
  },
  {
    id: '3',
    name: 'Petr Dvořák',
    email: 'petr.dvorak@example.com',
    phone: '+420 777 555 444',
    company: 'StartupX',
    position: 'CTO'
  }
];

export const mockProjects = [
  {
    id: '1',
    name: 'Web Redesign',
    progress: 75,
    status: 'active',
    deadline: '2025-03-01',
    team: ['Jan', 'Marie', 'Petr']
  },
  {
    id: '2',
    name: 'Mobile App',
    progress: 45,
    status: 'active',
    deadline: '2025-04-15',
    team: ['Marie', 'Petr']
  },
  {
    id: '3',
    name: 'API Integration',
    progress: 100,
    status: 'completed',
    deadline: '2025-01-30',
    team: ['Petr']
  }
];

export const mockChartData = [
  { name: 'Po', hodnota: 65 },
  { name: 'Út', hodnota: 78 },
  { name: 'St', hodnota: 82 },
  { name: 'Čt', hodnota: 71 },
  { name: 'Pá', hodnota: 89 },
  { name: 'So', hodnota: 45 },
  { name: 'Ne', hodnota: 52 }
];

export const mockCalendarEvents = [
  {
    id: '1',
    title: 'Schůzka s klientem',
    date: '2025-02-08T10:00:00Z',
    duration: 60,
    type: 'meeting'
  },
  {
    id: '2',
    title: 'Týmová retrospektiva',
    date: '2025-02-09T14:00:00Z',
    duration: 90,
    type: 'internal'
  },
  {
    id: '3',
    title: 'Prezentace projektu',
    date: '2025-02-10T11:00:00Z',
    duration: 45,
    type: 'presentation'
  }
];

export const mockTimerSessions = [
  {
    id: '1',
    task: 'Deep Work - Programování',
    duration: 3600,
    date: '2025-02-07'
  },
  {
    id: '2',
    task: 'Meeting - Projektová schůzka',
    duration: 2700,
    date: '2025-02-07'
  },
  {
    id: '3',
    task: 'Design Review',
    duration: 1800,
    date: '2025-02-06'
  }
];
