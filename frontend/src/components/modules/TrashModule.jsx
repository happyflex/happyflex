import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  X, 
  Filter,
  Layout,
  Edit3,
  Users,
  ListChecks,
  Clock,
  AlertTriangle,
  AppWindow,
  Target,
  GitBranch,
  Music,
  BarChart3,
  Timer,
  Calendar,
  GripVertical,
  Folder,
  Box
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTrash, TRASH_TYPES } from '../../context/TrashContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { toast } from '../../hooks/use-toast';

// Type configuration for content items
const TYPE_CONFIG = {
  [TRASH_TYPES.WINDOW]: { 
    icon: Layout, 
    label: 'Okna', 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  },
  [TRASH_TYPES.NOTE]: { 
    icon: Edit3, 
    label: 'Poznámky', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  [TRASH_TYPES.PROJECT]: { 
    icon: Layout, 
    label: 'Projekty', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  [TRASH_TYPES.PERSON]: { 
    icon: Users, 
    label: 'Lidi', 
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20'
  },
  [TRASH_TYPES.TASK]: { 
    icon: ListChecks, 
    label: 'Úkoly', 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20'
  },
  [TRASH_TYPES.GOAL]: { 
    icon: Target, 
    label: 'Cíle', 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20'
  },
  [TRASH_TYPES.PROCESS]: { 
    icon: GitBranch, 
    label: 'Procesy', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20'
  },
  [TRASH_TYPES.CHART]: { 
    icon: BarChart3, 
    label: 'Grafy', 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20'
  },
  [TRASH_TYPES.TIMER]: { 
    icon: Timer, 
    label: 'Časy', 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20'
  },
  [TRASH_TYPES.MUSIC]: { 
    icon: Music, 
    label: 'Hudba', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  [TRASH_TYPES.OTHER]: { 
    icon: Trash2, 
    label: 'Ostatní', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20'
  }
};

// Module icons for window items (by moduleType)
const MODULE_ICONS = {
  notes: { icon: Edit3, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  tasks: { icon: ListChecks, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  people: { icon: Users, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  projects: { icon: Layout, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  goals: { icon: Target, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  processes: { icon: GitBranch, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  music: { icon: Music, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  chart: { icon: BarChart3, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  timer: { icon: Timer, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  calendar: { icon: Calendar, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  files: { icon: Folder, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  trash: { icon: Trash2, color: 'text-red-400', bgColor: 'bg-red-500/20' }
};

const TrashModule = () => {
  const { 
    trashItems, 
    removeFromTrash, 
    restoreFromTrash, 
    emptyTrash,
    getTrashStats 
  } = useTrash();
  const { addModule, setNotes, setProjects, setTasks } = useWorkspace();
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmHardEmpty, setConfirmHardEmpty] = useState(false);
  const [viewMode, setViewMode] = useState('content'); // 'content' = smazaný obsah, 'windows' = zavřená okna
  
  // Double click detection for empty button
  const emptyClickCountRef = useRef(0);
  const emptyClickTimerRef = useRef(null);

  const stats = useMemo(() => getTrashStats(), [getTrashStats, trashItems]);

  // Separate counts for content and windows
  const contentCount = useMemo(() => {
    return trashItems.filter(item => item.type !== TRASH_TYPES.WINDOW).length;
  }, [trashItems]);

  const windowsCount = useMemo(() => {
    return trashItems.filter(item => item.type === TRASH_TYPES.WINDOW).length;
  }, [trashItems]);

  // Filter items based on view mode and active filter
  const filteredItems = useMemo(() => {
    let items = trashItems;
    
    // First filter by view mode
    if (viewMode === 'content') {
      items = items.filter(item => item.type !== TRASH_TYPES.WINDOW);
    } else {
      items = items.filter(item => item.type === TRASH_TYPES.WINDOW);
    }
    
    // Then apply content filter (only in content mode)
    if (viewMode === 'content' && activeFilter !== 'all') {
      items = items.filter(item => item.type === activeFilter);
    }
    
    return items;
  }, [trashItems, activeFilter, viewMode]);

  // Handle restore
  const handleRestore = (trashId) => {
    const item = restoreFromTrash(trashId);
    if (!item) return;

    switch (item.type) {
      case TRASH_TYPES.WINDOW:
        // Restore window to workspace
        addModule(item.originalData.type, item.metadata.position);
        toast({
          title: 'Okno obnoveno',
          description: `${item.name} byl obnoven`
        });
        break;
      case TRASH_TYPES.NOTE:
        // Restore note
        setNotes(prev => [...prev, item.originalData]);
        toast({
          title: 'Poznámka obnovena',
          description: `${item.name} byla obnovena`
        });
        break;
      case TRASH_TYPES.PROJECT:
        // Restore project
        setProjects(prev => [...prev, item.originalData]);
        toast({
          title: 'Projekt obnoven',
          description: `${item.name} byl obnoven`
        });
        break;
      case TRASH_TYPES.PERSON:
        // Restore person - use localStorage directly since PeopleModule uses its own state
        try {
          const storedPeople = localStorage.getItem('steward_contacts');
          const people = storedPeople ? JSON.parse(storedPeople) : [];
          // Check for duplicates by ID before adding
          const personExists = people.some(p => p.id === item.originalData.id);
          if (!personExists) {
            people.push(item.originalData);
            localStorage.setItem('steward_contacts', JSON.stringify(people));
            // Dispatch custom event to notify PeopleModule to reload
            window.dispatchEvent(new CustomEvent('steward-people-updated'));
            toast({
              title: 'Osoba obnovena',
              description: `${item.name} byl/a obnoven/a`
            });
          } else {
            toast({
              title: 'Osoba již existuje',
              description: `${item.name} je již v seznamu`,
              variant: 'destructive'
            });
          }
        } catch (e) {
          console.error('Error restoring person:', e);
          toast({
            title: 'Chyba',
            description: 'Nepodařilo se obnovit osobu',
            variant: 'destructive'
          });
        }
        break;
      case TRASH_TYPES.TASK:
        // Restore task
        setTasks(prev => [...prev, item.originalData]);
        toast({
          title: 'Úkol obnoven',
          description: `${item.name} byl obnoven`
        });
        break;
      case TRASH_TYPES.GOAL:
        // Restore goal - use localStorage directly since GoalsModule uses its own state
        try {
          const storedGoals = localStorage.getItem('steward_goals');
          const goals = storedGoals ? JSON.parse(storedGoals) : [];
          const goalExists = goals.some(g => g.id === item.originalData.id);
          if (!goalExists) {
            goals.push(item.originalData);
            localStorage.setItem('steward_goals', JSON.stringify(goals));
            window.dispatchEvent(new CustomEvent('steward-goals-updated'));
            toast({
              title: 'Cíl obnoven',
              description: `${item.name} byl obnoven`
            });
          } else {
            toast({
              title: 'Cíl již existuje',
              description: `${item.name} je již v seznamu`,
              variant: 'destructive'
            });
          }
        } catch (e) {
          console.error('Error restoring goal:', e);
          toast({
            title: 'Chyba',
            description: 'Nepodařilo se obnovit cíl',
            variant: 'destructive'
          });
        }
        break;
      case TRASH_TYPES.PROCESS:
        // Restore process - use localStorage directly since ProcessesModule uses its own state
        try {
          const storedProcesses = localStorage.getItem('steward_processes');
          const processes = storedProcesses ? JSON.parse(storedProcesses) : [];
          const processExists = processes.some(p => p.id === item.originalData.id);
          if (!processExists) {
            processes.push(item.originalData);
            localStorage.setItem('steward_processes', JSON.stringify(processes));
            window.dispatchEvent(new CustomEvent('steward-processes-updated'));
            toast({
              title: 'Proces obnoven',
              description: `${item.name} byl obnoven`
            });
          } else {
            toast({
              title: 'Proces již existuje',
              description: `${item.name} je již v seznamu`,
              variant: 'destructive'
            });
          }
        } catch (e) {
          console.error('Error restoring process:', e);
          toast({
            title: 'Chyba',
            description: 'Nepodařilo se obnovit proces',
            variant: 'destructive'
          });
        }
        break;
      default:
        break;
    }
  };

  // Handle permanent delete
  const handleDelete = (trashId) => {
    removeFromTrash(trashId);
  };

  // Handle drag start for trash items
  const handleDragStart = useCallback((e, item) => {
    // Set drag data
    const dragData = {
      type: 'trash-restore',
      trashId: item.id,
      itemType: item.type,
      itemName: item.name,
      originalData: item.originalData,
      metadata: item.metadata,
      sourceModule: item.sourceModule
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image
    const dragGhost = document.createElement('div');
    dragGhost.className = 'fixed pointer-events-none z-[9999] px-3 py-2 rounded-lg bg-cyan-500/90 text-white text-sm font-medium shadow-lg shadow-cyan-500/50 flex items-center gap-2';
    dragGhost.innerHTML = `<span>↩</span><span>${item.name}</span>`;
    dragGhost.style.top = '-1000px';
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 20, 20);
    
    // Cleanup ghost after drag
    setTimeout(() => dragGhost.remove(), 0);
  }, []);

  // Empty only current mode items
  const emptyCurrentMode = useCallback(() => {
    const itemsToDelete = trashItems.filter(item => 
      viewMode === 'content' 
        ? item.type !== TRASH_TYPES.WINDOW 
        : item.type === TRASH_TYPES.WINDOW
    );
    
    itemsToDelete.forEach(item => removeFromTrash(item.id));
    
    toast({
      title: viewMode === 'content' ? 'Smazaný obsah vyprázdněn' : 'Zavřená okna vyprázdněna',
      description: `${itemsToDelete.length} položek trvale smazáno`
    });
  }, [trashItems, viewMode, removeFromTrash]);

  // Empty all items (HARD CLEAR)
  const emptyAllItems = useCallback(() => {
    emptyTrash();
    toast({
      title: 'Koš kompletně vyprázdněn',
      description: 'Všechny položky byly trvale smazány'
    });
  }, [emptyTrash]);

  // Handle empty trash with single/double click detection
  const handleEmptyTrashClick = useCallback(() => {
    // If already in confirmation state, just confirm the action
    if (confirmHardEmpty) {
      emptyAllItems();
      setConfirmHardEmpty(false);
      setConfirmEmpty(false);
      emptyClickCountRef.current = 0;
      if (emptyClickTimerRef.current) {
        clearTimeout(emptyClickTimerRef.current);
      }
      return;
    }
    
    if (confirmEmpty) {
      emptyCurrentMode();
      setConfirmEmpty(false);
      setConfirmHardEmpty(false);
      emptyClickCountRef.current = 0;
      if (emptyClickTimerRef.current) {
        clearTimeout(emptyClickTimerRef.current);
      }
      return;
    }
    
    // Not in confirmation state - detect single/double click
    emptyClickCountRef.current += 1;
    
    if (emptyClickTimerRef.current) {
      clearTimeout(emptyClickTimerRef.current);
    }
    
    emptyClickTimerRef.current = setTimeout(() => {
      const clicks = emptyClickCountRef.current;
      emptyClickCountRef.current = 0;
      
      if (clicks >= 2) {
        // Double click - show HARD CLEAR confirmation
        setConfirmHardEmpty(true);
        setConfirmEmpty(false);
        setTimeout(() => setConfirmHardEmpty(false), 4000);
      } else {
        // Single click - show current mode confirmation
        setConfirmEmpty(true);
        setConfirmHardEmpty(false);
        setTimeout(() => setConfirmEmpty(false), 3000);
      }
    }, 250);
  }, [confirmEmpty, confirmHardEmpty, emptyCurrentMode, emptyAllItems]);

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'právě teď';
    if (diff < 3600) return `před ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `před ${Math.floor(diff / 3600)} hod`;
    return `před ${Math.floor(diff / 86400)} dny`;
  };

  // Content filters with icons (without Windows)
  const filters = [
    { key: 'all', label: 'Vše', icon: Filter, count: contentCount },
    { key: TRASH_TYPES.NOTE, label: 'Poznámky', icon: Edit3, count: stats.notes },
    { key: TRASH_TYPES.PROJECT, label: 'Projekty', icon: Layout, count: stats.projects },
    { key: TRASH_TYPES.PERSON, label: 'Lidi', icon: Users, count: stats.people },
    { key: TRASH_TYPES.TASK, label: 'Úkoly', icon: ListChecks, count: stats.tasks },
    { key: TRASH_TYPES.GOAL, label: 'Cíle', icon: Target, count: stats.goals },
    { key: TRASH_TYPES.PROCESS, label: 'Procesy', icon: GitBranch, count: stats.processes },
    { key: TRASH_TYPES.CHART, label: 'Grafy', icon: BarChart3, count: stats.charts },
    { key: TRASH_TYPES.TIMER, label: 'Časy', icon: Timer, count: stats.timers },
    { key: TRASH_TYPES.MUSIC, label: 'Hudba', icon: Music, count: stats.music }
  ];

  // Get icon config for window item based on moduleType
  const getWindowIconConfig = (item) => {
    const moduleType = item.metadata?.moduleType || item.originalData?.type;
    return MODULE_ICONS[moduleType] || { icon: AppWindow, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' };
  };

  return (
    <div className="h-full flex flex-col bg-[#0f1d35]">
      {/* Header */}
      <div className="p-4 border-b border-red-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            <span className="text-sm font-medium text-white">
              {viewMode === 'content' ? contentCount : windowsCount} {
                (viewMode === 'content' ? contentCount : windowsCount) === 1 ? 'položka' : 
                (viewMode === 'content' ? contentCount : windowsCount) < 5 ? 'položky' : 'položek'
              }
            </span>
          </div>
          
          {(viewMode === 'content' ? contentCount : windowsCount) > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEmptyTrashClick}
              className={`text-xs ${
                confirmHardEmpty 
                  ? 'bg-red-600/40 text-red-200 animate-pulse' 
                  : confirmEmpty 
                    ? 'bg-red-500/30 text-red-300' 
                    : 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
              }`}
              title="1x = smazat aktuální režim, 2x = smazat vše"
            >
              {confirmHardEmpty ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  HARD CLEAR - vše?
                </>
              ) : confirmEmpty ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {viewMode === 'content' ? 'Smazat obsah?' : 'Smazat okna?'}
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Vyprázdnit
                </>
              )}
            </Button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => {
              setViewMode('content');
              setActiveFilter('all');
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${viewMode === 'content'
                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                : 'bg-[#0a1628] text-gray-400 hover:text-gray-300 border border-cyan-500/20 hover:border-cyan-500/40'
              }
            `}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Smazaný obsah
            {contentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-[10px]">
                {contentCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => {
              setViewMode('windows');
              setActiveFilter('all');
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${viewMode === 'windows'
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                : 'bg-[#0a1628] text-gray-400 hover:text-gray-300 border border-cyan-500/20 hover:border-cyan-500/40'
              }
            `}
          >
            <AppWindow className="h-3.5 w-3.5" />
            Zavřená okna
            {windowsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px]">
                {windowsCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Filters - only show in content mode */}
        {viewMode === 'content' && (
          <div className="flex flex-wrap gap-1">
            {filters.map(filter => {
              const FilterIcon = filter.icon;
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded text-xs transition-all
                    ${activeFilter === filter.key 
                      ? 'bg-red-500/30 text-red-300 border border-red-500/40' 
                      : 'bg-red-500/10 text-gray-400 hover:text-gray-300 border border-transparent'
                    }
                    ${filter.count === 0 ? 'opacity-50' : ''}
                  `}
                  disabled={filter.count === 0 && filter.key !== 'all'}
                >
                  <FilterIcon className="h-3 w-3" />
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">({filter.count})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {viewMode === 'content' ? (
              <>
                <Trash2 className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Koš je prázdný</p>
                <p className="text-xs mt-1 opacity-70">Smazané položky se zobrazí zde</p>
              </>
            ) : (
              <>
                <AppWindow className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Žádná zavřená okna</p>
                <p className="text-xs mt-1 opacity-70">Zavřená okna se zobrazí zde</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredItems.map(item => {
              // Use module-specific icon for windows, type config for content
              let IconComponent, iconColor, iconBgColor, labelText;
              
              if (item.type === TRASH_TYPES.WINDOW) {
                const windowConfig = getWindowIconConfig(item);
                IconComponent = windowConfig.icon;
                iconColor = windowConfig.color;
                iconBgColor = windowConfig.bgColor;
                labelText = 'Okno';
              } else {
                const config = TYPE_CONFIG[item.type] || TYPE_CONFIG[TRASH_TYPES.OTHER];
                IconComponent = config.icon;
                iconColor = config.color;
                iconBgColor = config.bgColor;
                labelText = config.label;
              }

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`group flex items-center gap-2 p-2 rounded-lg ${
                    item.type === TRASH_TYPES.WINDOW 
                      ? 'bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/20' 
                      : 'bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/20'
                  } border border-transparent transition-all cursor-grab active:cursor-grabbing`}
                >
                  {/* Drag Handle */}
                  <div className="opacity-30 group-hover:opacity-60 transition-opacity cursor-grab">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>

                  {/* Type/Module Icon */}
                  <div className={`p-2 rounded-lg ${iconBgColor}`}>
                    <IconComponent className={`h-4 w-4 ${iconColor}`} />
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium whitespace-nowrap">
                        {item.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${iconBgColor} ${iconColor}`}>
                        {labelText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(item.deletedAt)}</span>
                      {item.sourceModule && (
                        <>
                          <span>•</span>
                          <span>z {item.sourceModule}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Drag hint */}
                  <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                    Táhni do workspace
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRestore(item.id)}
                      className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                      title="Obnovit"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      title="Smazat trvale"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashModule;
