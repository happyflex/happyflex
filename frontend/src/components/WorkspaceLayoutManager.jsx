import React, { useState, useEffect } from 'react';
import { 
  Save, FolderOpen, Trash2, X, Clock,
  FileText, ListChecks, Users, Layout, Target, GitBranch, 
  BarChart3, Timer, Calendar, Music, Trash2 as TrashIcon, Files
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from '../hooks/use-toast';
import { STORAGE_KEYS } from '../utils/persistence';

// Module type to icon and label mapping
const MODULE_INFO = {
  notes: { icon: FileText, label: 'Poznámky', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  tasks: { icon: ListChecks, label: 'Úkoly', color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30' },
  people: { icon: Users, label: 'Lidi', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  projects: { icon: Layout, label: 'Projekty', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  goals: { icon: Target, label: 'Cíle', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  processes: { icon: GitBranch, label: 'Procesy', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  chart: { icon: BarChart3, label: 'Statistiky', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  timer: { icon: Timer, label: 'Časovač', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  calendar: { icon: Calendar, label: 'Kalendář', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  music: { icon: Music, label: 'Hudba', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  trash: { icon: TrashIcon, label: 'Koš', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  files: { icon: Files, label: 'Soubory', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' }
};

// Get unique module types from layout
const getUniqueModules = (layout) => {
  const moduleTypes = layout.modules.map(m => m.type);
  const uniqueTypes = [...new Set(moduleTypes)];
  return uniqueTypes.map(type => ({
    type,
    info: MODULE_INFO[type] || { icon: FileText, label: type, color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' }
  }));
};

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return null;
  }
};

const WorkspaceLayoutManager = ({ isOpen, onClose }) => {
  const workspace = useWorkspace();
  const [layouts, setLayouts] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_LAYOUTS);
      if (saved) {
        setLayouts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst uložené layouty',
        variant: 'destructive'
      });
    }
  };

  // Collect view state for each module based on its type
  const collectModuleViewState = (moduleType, moduleId) => {
    const viewState = {};
    
    // Try to get view state from localStorage based on module type
    // Each module stores its own view preferences
    try {
      switch (moduleType) {
        case 'music': {
          const musicState = localStorage.getItem('steward_music_view_state');
          if (musicState) {
            const parsed = JSON.parse(musicState);
            viewState.activeTab = parsed.activeTab || 'player';
            viewState.miniMode = parsed.miniMode || false;
            viewState.selectedPlaylist = parsed.selectedPlaylist || null;
          }
          break;
        }
        case 'goals': {
          const goalsState = localStorage.getItem('steward_goals_view_state');
          if (goalsState) {
            const parsed = JSON.parse(goalsState);
            viewState.openGoalId = parsed.openGoalId || null;
            viewState.activeSection = parsed.activeSection || 'overview';
          }
          break;
        }
        case 'projects': {
          const projectsState = localStorage.getItem('steward_projects_view_state');
          if (projectsState) {
            const parsed = JSON.parse(projectsState);
            viewState.openProjectPath = parsed.openProjectPath || [];
            viewState.selectedElementId = parsed.selectedElementId || null;
          }
          break;
        }
        case 'calendar': {
          const calendarState = localStorage.getItem('steward_calendar_view_state');
          if (calendarState) {
            const parsed = JSON.parse(calendarState);
            viewState.view = parsed.view || 'month';
            viewState.selectedDate = parsed.selectedDate || null;
          }
          break;
        }
        case 'notes': {
          const notesState = localStorage.getItem('steward_notes_view_state');
          if (notesState) {
            const parsed = JSON.parse(notesState);
            viewState.selectedNoteId = parsed.selectedNoteId || null;
            viewState.filter = parsed.filter || 'all';
          }
          break;
        }
        case 'tasks': {
          const tasksState = localStorage.getItem('steward_tasks_view_state');
          if (tasksState) {
            const parsed = JSON.parse(tasksState);
            viewState.filter = parsed.filter || 'all';
            viewState.selectedTaskId = parsed.selectedTaskId || null;
          }
          break;
        }
        case 'people': {
          const peopleState = localStorage.getItem('steward_people_view_state');
          if (peopleState) {
            const parsed = JSON.parse(peopleState);
            viewState.selectedContactId = parsed.selectedContactId || null;
            viewState.filter = parsed.filter || 'all';
          }
          break;
        }
        default:
          // No specific view state for this module type
          break;
      }
    } catch (e) {
      console.warn(`Could not collect view state for ${moduleType}:`, e);
    }
    
    return viewState;
  };

  const saveLayout = () => {
    if (!layoutName.trim()) {
      toast({
        title: 'Chybí název',
        description: 'Zadejte název pro layout',
        variant: 'destructive'
      });
      return;
    }

    const now = new Date().toISOString();
    
    // Build complete window state for each module
    const moduleSnapshots = workspace.modules.map(m => ({
      // Core identity
      id: m.id,
      type: m.type,
      
      // Position and size
      position: { ...m.position },
      size: { ...m.size },
      zIndex: m.zIndex || 0,
      
      // Window state flags
      pinMode: m.pinMode || 'none', // 'none' | 'pin' | 'lock' | 'top'
      isMaximized: m.isMaximized || false,
      snappedState: m.snappedState || null, // 'left-half', 'right-half', etc.
      
      // Module-specific view state (lightweight snapshot)
      viewState: collectModuleViewState(m.type, m.id)
    }));

    // Build CANVAS (deferred modules) state
    const canvasSnapshots = workspace.deferredModules.map((m, index) => ({
      id: m.id,
      type: m.type,
      position: m.position ? { ...m.position } : null,
      size: m.size ? { ...m.size } : null,
      zIndex: m.zIndex || 0,
      order: index, // Preserve order in canvas
      viewState: collectModuleViewState(m.type, m.id)
    }));

    const newLayout = {
      id: Date.now().toString(),
      name: layoutName.trim(),
      
      // Timestamps
      createdAt: now,
      lastUsedAt: now,
      
      // Legacy field for backward compatibility
      timestamp: now,
      
      // Complete module snapshots (workspace)
      modules: moduleSnapshots,
      
      // CANVAS items
      canvasModules: canvasSnapshots,
      
      // Legacy deferred modules format (backward compatibility)
      deferredModules: workspace.deferredModules.map(m => ({
        id: m.id,
        type: m.type,
        position: m.position,
        size: m.size,
        zIndex: m.zIndex
      })),
      
      // Focus mode state
      focusedModuleId: workspace.focusedModuleId,
      
      // Application data
      data: {
        notes: workspace.notes,
        tasks: workspace.tasks,
        contacts: workspace.contacts,
        projects: workspace.projects,
        timerSeconds: workspace.timerSeconds
      },
      
      // Layout version for future migrations
      version: 2
    };

    const updatedLayouts = [...layouts, newLayout];
    localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
    setLayouts(updatedLayouts);
    setLayoutName('');
    setSaveDialogOpen(false);

    toast({
      title: 'Layout uložen',
      description: `"${newLayout.name}" byl úspěšně uložen s kompletním stavem`
    });
  };

  const loadLayout = async (layout) => {
    try {
      // Update lastUsedAt timestamp
      const now = new Date().toISOString();
      const updatedLayouts = layouts.map(l => 
        l.id === layout.id ? { ...l, lastUsedAt: now } : l
      );
      localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
      setLayouts(updatedLayouts);
      
      // ===== STEP 1: Restore view state FIRST (before modules mount) =====
      // This way when modules mount, they will read the correct view state
      if (layout.modules && layout.modules.length > 0) {
        for (const moduleData of layout.modules) {
          if (moduleData.viewState && Object.keys(moduleData.viewState).length > 0) {
            restoreModuleViewState(moduleData.type, moduleData.viewState);
          }
        }
      }
      
      // Also restore CANVAS items view state
      const canvasItems = layout.canvasModules || layout.deferredModules || [];
      for (const canvasItem of canvasItems) {
        if (canvasItem?.viewState && Object.keys(canvasItem.viewState).length > 0) {
          restoreModuleViewState(canvasItem.type, canvasItem.viewState);
        }
      }
      
      // ===== STEP 2: Clear ALL current state =====
      workspace.clearAllModules();
      
      // Wait for state to settle
      await new Promise(resolve => setTimeout(resolve, 50));

      // ===== STEP 3: Restore application data =====
      if (layout.data) {
        if (layout.data.notes) {
          workspace.setNotes(layout.data.notes);
        }
        if (layout.data.tasks) {
          workspace.setTasks(layout.data.tasks);
        }
        if (layout.data.timerSeconds !== undefined) {
          workspace.setTimerSeconds(layout.data.timerSeconds);
        }
      }

      // ===== STEP 4: Restore modules with COMPLETE state =====
      let restoredModuleIds = [];
      if (layout.modules && layout.modules.length > 0) {
        const validModules = layout.modules.filter(m => m && m.type);
        
        // Use direct restore function - returns array of created modules
        const restoredModules = workspace.restoreModules(validModules);
        restoredModuleIds = restoredModules.map(m => m.id);
        
        // Wait for React state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // ===== STEP 5: Restore CANVAS items =====
      if (canvasItems.length > 0) {
        const sortedCanvasItems = [...canvasItems]
          .filter(item => item && item.type)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        workspace.restoreDeferredModules(sortedCanvasItems);
      }

      // ===== STEP 6: Restore focus mode =====
      if (layout.focusedModuleId) {
        // Find which index in original layout had focus
        const focusedIndex = layout.modules.findIndex(m => m.id === layout.focusedModuleId);
        
        if (focusedIndex >= 0 && restoredModuleIds[focusedIndex]) {
          // Wait for DOM to settle before setting focus
          await new Promise(resolve => setTimeout(resolve, 100));
          workspace.setFocusMode(restoredModuleIds[focusedIndex]);
        }
      }
      
      // ===== STEP 7: Dispatch event to trigger view state reload in modules =====
      // This tells modules to re-read their view state from localStorage
      window.dispatchEvent(new CustomEvent('steward-layout-restored'));

      onClose();
      
      const canvasCount = canvasItems.filter(i => i && i.type).length;
      toast({
        title: 'Layout načten',
        description: `"${layout.name}" obnoven: ${layout.modules.length} modulů${canvasCount > 0 ? `, ${canvasCount} v CANVAS` : ''}${layout.focusedModuleId ? ', Focus mode' : ''}`
      });
    } catch (error) {
      console.error('Error loading layout:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst layout: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  // Restore module-specific view state to localStorage
  const restoreModuleViewState = (moduleType, viewState) => {
    if (!viewState || Object.keys(viewState).length === 0) return;
    
    try {
      switch (moduleType) {
        case 'music':
          localStorage.setItem('steward_music_view_state', JSON.stringify(viewState));
          break;
        case 'goals':
          localStorage.setItem('steward_goals_view_state', JSON.stringify(viewState));
          break;
        case 'projects':
          localStorage.setItem('steward_projects_view_state', JSON.stringify(viewState));
          break;
        case 'calendar':
          localStorage.setItem('steward_calendar_view_state', JSON.stringify(viewState));
          break;
        case 'notes':
          localStorage.setItem('steward_notes_view_state', JSON.stringify(viewState));
          break;
        case 'tasks':
          localStorage.setItem('steward_tasks_view_state', JSON.stringify(viewState));
          break;
        case 'people':
          localStorage.setItem('steward_people_view_state', JSON.stringify(viewState));
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn(`Could not restore view state for ${moduleType}:`, e);
    }
  };

  const deleteLayout = (id) => {
    const layout = layouts.find(l => l.id === id);
    const updatedLayouts = layouts.filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
    setLayouts(updatedLayouts);

    toast({
      title: 'Layout smazán',
      description: `"${layout.name}" byl odstraněn`
    });
  };

  return (
    <>
      {/* Holographic scan animation styles */}
      <style>{`
        @keyframes chip-scan {
          0% {
            filter: brightness(1);
            transform: scale(1);
            box-shadow: none;
          }
          50% {
            filter: brightness(1.2);
            transform: scale(1.03);
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.4), inset 0 0 4px rgba(6, 182, 212, 0.1);
          }
          100% {
            filter: brightness(1);
            transform: scale(1);
            box-shadow: none;
          }
        }
        .layout-card:hover .chip-scannable {
          animation: chip-scan 400ms ease-out forwards;
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-[#0f1d35] border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Správa Workspace Layoutů</DialogTitle>
            <DialogDescription className="text-gray-400">
              Uložte nebo načtěte rozložení workspace s kompletním stavem modulů
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              onClick={() => setSaveDialogOpen(true)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Uložit aktuální layout
            </Button>

            <div>
              <h3 className="text-sm font-medium text-cyan-400 mb-3">
                Uložené layouty ({layouts.length})
              </h3>
              <ScrollArea className="h-96">
                {layouts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Zatím nemáte žádné uložené layouty</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layouts.map((layout) => {
                      const uniqueModules = getUniqueModules(layout);
                      const maxVisibleChips = 5;
                      const visibleModules = uniqueModules.slice(0, maxVisibleChips);
                      const hiddenCount = uniqueModules.length - maxVisibleChips;
                      const canvasCount = (layout.canvasModules || layout.deferredModules || []).length;
                      
                      // Get timestamps with fallbacks
                      const createdAt = formatDate(layout.createdAt || layout.timestamp);
                      const lastUsedAt = formatDate(layout.lastUsedAt);
                      
                      return (
                        <div
                          key={layout.id}
                          className="layout-card p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{layout.name}</h4>
                              
                              {/* Timestamps */}
                              <div className="text-xs text-gray-500 space-y-0.5 mb-2">
                                <p>Vytvořeno: {createdAt}</p>
                                {lastUsedAt && lastUsedAt !== createdAt && (
                                  <p className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Naposledy použito: {lastUsedAt}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-1.5">
                                {/* Module count badge */}
                                <span 
                                  className="chip-scannable text-xs px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                  style={{ animationDelay: '0ms', animationFillMode: 'both' }}
                                >
                                  {layout.modules.length} modulů
                                </span>
                                
                                {/* Canvas count badge */}
                                {canvasCount > 0 && (
                                  <span 
                                    className="chip-scannable text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                    style={{ animationDelay: '50ms', animationFillMode: 'both' }}
                                  >
                                    {canvasCount} v CANVAS
                                  </span>
                                )}
                                
                                {/* Focus mode indicator */}
                                {layout.focusedModuleId && (
                                  <span 
                                    className="chip-scannable text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    style={{ animationDelay: '75ms', animationFillMode: 'both' }}
                                  >
                                    Focus mode
                                  </span>
                                )}
                                
                                {/* Module type chips with scan animation */}
                                {visibleModules.map(({ type, info }, index) => {
                                  const IconComponent = info.icon;
                                  return (
                                    <span 
                                      key={type}
                                      className={`chip-scannable inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${info.bgColor} ${info.color} border ${info.borderColor}`}
                                      style={{ 
                                        animationDelay: `${(index + 2) * 100}ms`,
                                        animationFillMode: 'both'
                                      }}
                                    >
                                      <IconComponent className="h-3 w-3" />
                                      {info.label}
                                    </span>
                                  );
                                })}
                                
                                {/* Hidden modules count */}
                                {hiddenCount > 0 && (
                                  <span 
                                    className="chip-scannable text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                    style={{ 
                                      animationDelay: `${(visibleModules.length + 2) * 100}ms`,
                                      animationFillMode: 'both'
                                    }}
                                  >
                                    +{hiddenCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <Button
                                size="sm"
                                onClick={() => loadLayout(layout)}
                                className="bg-cyan-500 hover:bg-cyan-400 text-white"
                              >
                                <FolderOpen className="h-4 w-4 mr-1" />
                                Načíst
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteLayout(layout.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Layout Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-[#0f1d35] border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Uložit Layout</DialogTitle>
            <DialogDescription className="text-gray-400">
              Zadejte název pro aktuální rozložení workspace. Uloží se kompletní stav včetně pozic, velikostí, pin/focus režimů a vnitřního stavu modulů.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="např. Design Meeting, Sprint Planning..."
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveLayout()}
              className="bg-[#0a1628] border-cyan-500/30 text-white"
              autoFocus
            />
            <div className="text-xs text-gray-500">
              Aktuální stav: {workspace.modules.length} modulů, {workspace.deferredModules.length} v CANVAS
              {workspace.focusedModuleId && ', Focus mode aktivní'}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setSaveDialogOpen(false);
                  setLayoutName('');
                }}
                className="text-gray-400"
              >
                Zrušit
              </Button>
              <Button
                onClick={saveLayout}
                className="bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkspaceLayoutManager;
