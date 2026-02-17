import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, ChevronRight, ChevronDown,
  Briefcase, Star, Clock, CheckSquare, Calendar,
  Phone, Mail, GripVertical, X, Edit2, Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import * as DialogPrimitive from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { toast } from '../../hooks/use-toast';
import { useTrash } from '../../context/TrashContext';

const Dialog = DialogPrimitive.Dialog;
const DialogContent = DialogPrimitive.DialogContent;
const DialogHeader = DialogPrimitive.DialogHeader;
const DialogTitle = DialogPrimitive.DialogTitle;

// Typy osob pro větvení
const PERSON_TYPES = {
  team: { label: 'Tým', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: Users },
  supplier: { label: 'Dodavatel', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: Briefcase },
  investor: { label: 'Investor', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: Star },
  client: { label: 'Klient', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: Briefcase },
  other: { label: 'Ostatní', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', icon: Users }
};

// Dostupnost
const AVAILABILITY = {
  available: { label: 'Dostupný', color: 'bg-green-500' },
  busy: { label: 'Zaneprázdněný', color: 'bg-yellow-500' },
  away: { label: 'Nepřítomen', color: 'bg-red-500' },
  unknown: { label: 'Neznámá', color: 'bg-gray-500' }
};

const PeopleModule = () => {
  const { addPersonToTrash } = useTrash();
  const [people, setPeople] = useState(null); // null = not loaded yet
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(['team', 'supplier', 'investor', 'client']);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [draggedPerson, setDraggedPerson] = useState(null);

  // Load from localStorage
  useEffect(() => {
    const loadPeople = () => {
      const saved = localStorage.getItem('steward_people');
      if (saved) {
        try {
          setPeople(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading people:', e);
          initializeDefaultPeople();
        }
      } else {
        initializeDefaultPeople();
      }
    };

    loadPeople();

    // Listen for external updates (e.g., from trash restore)
    const handleExternalUpdate = () => {
      const saved = localStorage.getItem('steward_people');
      if (saved) {
        try {
          setPeople(JSON.parse(saved));
        } catch (e) {
          console.error('Error reloading people:', e);
        }
      }
    };
    window.addEventListener('steward-people-updated', handleExternalUpdate);
    
    return () => {
      window.removeEventListener('steward-people-updated', handleExternalUpdate);
    };
  }, []);

  // Auto-save - only when people is not null (initialized)
  useEffect(() => {
    if (people !== null) {
      localStorage.setItem('steward_people', JSON.stringify(people));
    }
  }, [people]);

  // Sync selectedPerson with people changes
  useEffect(() => {
    if (selectedPerson) {
      const updatedPerson = people.find(p => p.id === selectedPerson.id);
      if (updatedPerson && JSON.stringify(updatedPerson) !== JSON.stringify(selectedPerson)) {
        setSelectedPerson(updatedPerson);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  const initializeDefaultPeople = () => {
    const defaults = [
      {
        id: 'person-1',
        name: 'Jan Novák',
        type: 'team',
        role: 'Frontend Developer',
        skills: ['React', 'TypeScript', 'UI/UX'],
        availability: 'available',
        email: 'jan.novak@example.com',
        phone: '+420 777 123 456',
        todos: [
          { id: 't1', text: 'Dokončit dashboard komponentu', completed: false },
          { id: 't2', text: 'Code review PR #42', completed: true }
        ],
        calendar: [
          { id: 'c1', title: 'Standup', date: '2025-12-16T09:00', recurring: 'daily' }
        ],
        checklist: []
      },
      {
        id: 'person-2',
        name: 'Marie Svobodová',
        type: 'team',
        role: 'Product Manager',
        skills: ['Agile', 'Komunikace', 'Analýza'],
        availability: 'busy',
        email: 'marie.s@example.com',
        phone: '+420 777 987 654',
        todos: [
          { id: 't3', text: 'Připravit roadmapu Q1', completed: false }
        ],
        calendar: [],
        checklist: []
      },
      {
        id: 'person-3',
        name: 'Petr Dvořák',
        type: 'investor',
        role: 'Angel Investor',
        skills: ['Finance', 'Networking', 'Strategie'],
        availability: 'unknown',
        email: 'petr.dvorak@example.com',
        phone: '+420 777 555 444',
        todos: [],
        calendar: [],
        checklist: [
          { id: 'ch1', text: 'Poslat měsíční report', completed: false },
          { id: 'ch2', text: 'Domluvit schůzku na Q1 review', completed: false }
        ]
      },
      {
        id: 'person-4',
        name: 'Eva Králová',
        type: 'supplier',
        role: 'Design Agency',
        skills: ['Branding', 'Grafika', 'Video'],
        availability: 'available',
        email: 'eva@designstudio.cz',
        phone: '+420 777 333 222',
        todos: [],
        calendar: [],
        checklist: [
          { id: 'ch3', text: 'Objednat nové vizuály', completed: false }
        ]
      }
    ];
    setPeople(defaults);
  };

  // Filter people - handle null state
  const filteredPeople = people ? people.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         person.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || person.type === filterType;
    return matchesSearch && matchesType;
  }) : [];

  // Group by type
  const groupedPeople = Object.keys(PERSON_TYPES).reduce((acc, type) => {
    acc[type] = filteredPeople.filter(p => p.type === type);
    return acc;
  }, {});

  const toggleCategory = (type) => {
    setExpandedCategories(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const addPerson = (personData) => {
    const newPerson = {
      id: `person-${Date.now()}`,
      ...personData,
      todos: [],
      calendar: [],
      checklist: []
    };
    setPeople(prev => prev ? [...prev, newPerson] : [newPerson]);
    toast({ title: 'Osoba přidána', description: `${personData.name} byl/a přidán/a do systému` });
  };

  const updatePerson = (id, updates) => {
    setPeople(prev => prev ? prev.map(p => p.id === id ? { ...p, ...updates } : p) : prev);
  };

  const deletePerson = (id) => {
    // Find person and add to trash before deleting
    const person = people?.find(p => p.id === id);
    if (person) {
      addPersonToTrash(person);
    }
    setPeople(prev => prev ? prev.filter(p => p.id !== id) : prev);
    if (selectedPerson?.id === id) setSelectedPerson(null);
    toast({ title: 'Osoba přesunuta do koše' });
  };

  // Todo/Checklist management
  const addTodoItem = (personId, text, isChecklist = false) => {
    const field = isChecklist ? 'checklist' : 'todos';
    const newItem = { id: `item-${Date.now()}`, text, completed: false };
    setPeople(prev => prev.map(p => 
      p.id === personId 
        ? { ...p, [field]: [...p[field], newItem] }
        : p
    ));
  };

  const toggleTodoItem = (personId, itemId, isChecklist = false) => {
    const field = isChecklist ? 'checklist' : 'todos';
    setPeople(prev => prev.map(p => 
      p.id === personId 
        ? { 
            ...p, 
            [field]: p[field].map(item => 
              item.id === itemId ? { ...item, completed: !item.completed } : item
            )
          }
        : p
    ));
  };

  const deleteTodoItem = (personId, itemId, isChecklist = false) => {
    const field = isChecklist ? 'checklist' : 'todos';
    setPeople(prev => prev.map(p => 
      p.id === personId 
        ? { ...p, [field]: p[field].filter(item => item.id !== itemId) }
        : p
    ));
  };

  // Drag handlers for drag & drop to projects
  const handleDragStart = (e, person) => {
    setDraggedPerson(person);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'person',
      person: person
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedPerson(null);
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Lidi
            </h3>
            <p className="text-xs text-gray-400">{people.length} osob v databázi</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <Plus className="h-4 w-4 mr-1" />
            Přidat
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Hledat osobu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 text-sm text-white"
          >
            <option value="all">Všichni</option>
            {Object.entries(PERSON_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* People List & Detail */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* List */}
        <ScrollArea className={`${selectedPerson ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="space-y-3 pr-2">
            {Object.entries(groupedPeople).map(([type, typePersons]) => {
              if (typePersons.length === 0) return null;
              const typeInfo = PERSON_TYPES[type];
              const TypeIcon = typeInfo.icon;
              const isExpanded = expandedCategories.includes(type);

              return (
                <div key={type} className="space-y-2">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(type)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <TypeIcon className="h-4 w-4" />
                    <span>{typeInfo.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs">{typePersons.length}</Badge>
                  </button>

                  {/* People in category */}
                  {isExpanded && (
                    <div className="space-y-2 pl-2">
                      {typePersons.map(person => (
                        <PersonCard
                          key={person.id}
                          person={person}
                          isSelected={selectedPerson?.id === person.id}
                          onSelect={() => setSelectedPerson(person)}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedPerson?.id === person.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Detail Panel */}
        {selectedPerson && (
          <PersonDetailPanel
            person={selectedPerson}
            onClose={() => setSelectedPerson(null)}
            onUpdate={(updates) => {
              updatePerson(selectedPerson.id, updates);
              setSelectedPerson(prev => ({ ...prev, ...updates }));
            }}
            onDelete={() => deletePerson(selectedPerson.id)}
            onAddTodo={(text, isChecklist) => addTodoItem(selectedPerson.id, text, isChecklist)}
            onToggleTodo={(itemId, isChecklist) => toggleTodoItem(selectedPerson.id, itemId, isChecklist)}
            onDeleteTodo={(itemId, isChecklist) => deleteTodoItem(selectedPerson.id, itemId, isChecklist)}
          />
        )}
      </div>

      {/* Add Person Dialog */}
      <AddPersonDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addPerson}
      />
    </div>
  );
};

// Person Card Component
const PersonCard = ({ person, isSelected, onSelect, onDragStart, onDragEnd, isDragging }) => {
  const typeInfo = PERSON_TYPES[person.type];
  const availInfo = AVAILABILITY[person.availability];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, person)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`
        group p-3 bg-[#0a1628] rounded-lg border transition-all cursor-pointer
        ${isSelected ? 'border-cyan-400 ring-1 ring-cyan-400/50' : 'border-cyan-500/20 hover:border-cyan-500/40'}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}
      `}
      data-testid={`person-card-${person.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>

        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
            {person.name.charAt(0)}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${availInfo.color} border-2 border-[#0a1628]`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">{person.name}</h4>
          <p className="text-xs text-gray-400 truncate">{person.role}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            <Badge className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
            {person.skills?.slice(0, 2).map(skill => (
              <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0 text-gray-400 border-gray-600">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Person Detail Panel
const PersonDetailPanel = ({ 
  person, 
  onClose, 
  onUpdate, 
  onDelete,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo
}) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const typeInfo = PERSON_TYPES[person.type];
  const availInfo = AVAILABILITY[person.availability];
  const isTeamMember = person.type === 'team';

  const handleAddTodo = (isChecklist) => {
    const text = isChecklist ? newChecklistText : newTodoText;
    if (text.trim()) {
      onAddTodo(text.trim(), isChecklist);
      isChecklist ? setNewChecklistText('') : setNewTodoText('');
    }
  };

  return (
    <div className="w-1/2 bg-[#0f1d35] rounded-lg border border-cyan-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                {person.name.charAt(0)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${availInfo.color} border-2 border-[#0f1d35]`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{person.name}</h3>
              <p className="text-sm text-gray-400">{person.role}</p>
              <Badge className={`mt-1 text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-400 hover:text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Kontakt</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{person.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{person.phone}</span>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Dovednosti</h4>
            <div className="flex flex-wrap gap-1">
              {person.skills?.map(skill => (
                <Badge key={skill} variant="outline" className="text-xs text-gray-300 border-gray-600">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Dostupnost</h4>
            <select
              value={person.availability}
              onChange={(e) => onUpdate({ availability: e.target.value })}
              className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-sm text-white"
            >
              {Object.entries(AVAILABILITY).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          {/* Todo List (for team) or Checklist (for others) */}
          {isTeamMember ? (
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Osobní úkoly
              </h4>
              <div className="space-y-2">
                {person.todos?.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => onToggleTodo(todo.id, false)}
                      className="border-cyan-500/50"
                    />
                    <span className={`flex-1 text-sm ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {todo.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400"
                      onClick={() => onDeleteTodo(todo.id, false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Nový úkol..."
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo(false)}
                    className="bg-[#0a1628] border-cyan-500/30 text-white text-sm"
                  />
                  <Button size="sm" onClick={() => handleAddTodo(false)} className="bg-cyan-500/20 text-cyan-400">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Checklist (úkoly vůči této osobě)
              </h4>
              <div className="space-y-2">
                {person.checklist?.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => onToggleTodo(item.id, true)}
                      className="border-cyan-500/50"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400"
                      onClick={() => onDeleteTodo(item.id, true)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Nový úkol vůči osobě..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo(true)}
                    className="bg-[#0a1628] border-cyan-500/30 text-white text-sm"
                  />
                  <Button size="sm" onClick={() => handleAddTodo(true)} className="bg-cyan-500/20 text-cyan-400">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Calendar preview for team members */}
          {isTeamMember && (
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Kalendář
              </h4>
              <div className="p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20 text-center">
                <p className="text-xs text-gray-500">Náhled kalendáře bude dostupný brzy</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drag hint */}
      <div className="p-3 border-t border-cyan-500/20 bg-[#0a1628]/50">
        <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
          <GripVertical className="h-3 w-3" />
          Přetáhněte osobu do projektu nebo procesu
        </p>
      </div>
    </div>
  );
};

// Add Person Dialog
const AddPersonDialog = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'team',
    role: '',
    skills: '',
    availability: 'available',
    email: '',
    phone: ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte jméno a roli', variant: 'destructive' });
      return;
    }
    onAdd({
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
    });
    setFormData({ name: '', type: 'team', role: '', skills: '', availability: 'available', email: '', phone: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1d35] border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-white">Přidat osobu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Jméno *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Jan Novák"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Typ</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-white"
            >
              {Object.entries(PERSON_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Role *</label>
            <Input
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder="Frontend Developer"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Dovednosti (oddělené čárkou)</label>
            <Input
              value={formData.skills}
              onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
              placeholder="React, TypeScript, UI/UX"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className="bg-[#0a1628] border-cyan-500/30 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Telefon</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+420 777 123 456"
                className="bg-[#0a1628] border-cyan-500/30 text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Dostupnost</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
              className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-white"
            >
              {Object.entries(AVAILABILITY).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Zrušit</Button>
            <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Přidat osobu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeopleModule;
