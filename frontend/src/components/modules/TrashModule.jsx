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
  Layers,
  AlertTriangle,
  AppWindow,
  Target,
  GitBranch,
  Music,
  BarChart3,
  Timer,
  Calendar
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
    icon: Layers, 
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
          const storedPeople = localStorage.getItem('steward_people');
          const people = storedPeople ? JSON.parse(storedPeople) : [];
          people.push(item.originalData);
          localStorage.setItem('steward_people', JSON.stringify(people));
          toast({
            title: 'Osoba obnovena',
            description: `${item.name} byl/a obnoven/a. Znovu otevřete modul Lidi pro zobrazení.`
          });
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
      default:
        break;
    }
  };

  // Handle permanent delete
  const handleDelete = (trashId) => {
    removeFromTrash(trashId);
  };

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
    emptyClickCountRef.current += 1;
    
    if (emptyClickTimerRef.current) {
      clearTimeout(emptyClickTimerRef.current);
    }
    
    emptyClickTimerRef.current = setTimeout(() => {
      const clicks = emptyClickCountRef.current;
      emptyClickCountRef.current = 0;
      
      if (clicks >= 2) {
        // Double click - HARD CLEAR (all items)
        if (confirmHardEmpty) {
          emptyAllItems();
          setConfirmHardEmpty(false);
          setConfirmEmpty(false);
        } else {
          setConfirmHardEmpty(true);
          setConfirmEmpty(false);
          setTimeout(() => setConfirmHardEmpty(false), 4000);
        }
      } else {
        // Single click - empty current mode only
        if (confirmEmpty) {
          emptyCurrentMode();
          setConfirmEmpty(false);
          setConfirmHardEmpty(false);
        } else {
          setConfirmEmpty(true);
          setConfirmHardEmpty(false);
          setTimeout(() => setConfirmEmpty(false), 3000);
        }
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
    { key: TRASH_TYPES.PROJECT, label: 'Projekty', icon: Layers, count: stats.projects },
    { key: TRASH_TYPES.PERSON, label: 'Lidi', icon: Users, count: stats.people },
    { key: TRASH_TYPES.TASK, label: 'Úkoly', icon: ListChecks, count: stats.tasks }
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
              <span className="ml-1 px-1.5 py-0.5 rounded bg-red-600/80 text-white text-[10px] font-semibold">
                {windowsCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Filters - only show in content mode */}
        {viewMode === 'content' && (
          <div className="flex flex-wrap gap-1">
            {filters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`
                  px-2 py-1 rounded text-xs transition-all
                  ${activeFilter === filter.key 
                    ? 'bg-red-500/30 text-red-300 border border-red-500/40' 
                    : 'bg-red-500/10 text-gray-400 hover:text-gray-300 border border-transparent'
                  }
                  ${filter.count === 0 ? 'opacity-50' : ''}
                `}
                disabled={filter.count === 0 && filter.key !== 'all'}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">({filter.count})</span>
                )}
              </button>
            ))}
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
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG[TRASH_TYPES.OTHER];
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                >
                  {/* Type Icon */}
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate font-medium">
                        {item.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                        {config.label}
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
