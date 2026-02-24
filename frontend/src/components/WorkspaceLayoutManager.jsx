import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, FolderOpen, Trash2, X, Edit2, Check,
  FileText, ListChecks, Users, Layout, Target, GitBranch, 
  BarChart3, Timer, Calendar, Music, Trash2 as TrashIcon
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
  trash: { icon: TrashIcon, label: 'Koš', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' }
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

const WorkspaceLayoutManager = ({ isOpen, onClose }) => {
  const workspace = useWorkspace();
  const [layouts, setLayouts] = useState([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  
  // Rename state
  const [editingLayoutId, setEditingLayoutId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState('');
  const renameInputRef = useRef(null);

  useEffect(() => {
    loadLayouts();
  }, []);
  
  // Focus and select text when entering edit mode
  useEffect(() => {
    if (editingLayoutId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingLayoutId]);

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
    
    const newLayout = {
      id: Date.now().toString(),
      name: layoutName.trim(),
      createdAt: now,
      lastUsedAt: now,
      // Full window state for each module (including viewState)
      modules: workspace.modules.map(m => ({
        id: m.id,
        type: m.type,
        position: { x: m.position.x, y: m.position.y },
        size: { width: m.size.width, height: m.size.height },
        zIndex: m.zIndex,
        pinMode: m.pinMode || 'none',
        isAlwaysOnTop: m.isAlwaysOnTop || false,
        snappedState: m.snappedState || null,
        // ViewState per window instance (module's internal UI state)
        viewState: m.viewState || undefined
      })),
      // CANVAS (deferred modules) with full state
      deferredModules: workspace.deferredModules.map(m => ({
        id: m.id,
        type: m.type,
        position: { x: m.position.x, y: m.position.y },
        size: { width: m.size.width, height: m.size.height },
        zIndex: m.zIndex,
        pinMode: m.pinMode || 'none',
        viewState: m.viewState || undefined
      })),
      // Focus mode state
      focusedModuleId: workspace.focusedModuleId,
      // Legacy data for backward compatibility
      data: {
        notes: workspace.notes,
        tasks: workspace.tasks,
        contacts: workspace.contacts,
        projects: workspace.projects,
        timerSeconds: workspace.timerSeconds
      }
    };

    const updatedLayouts = [...layouts, newLayout];
    localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
    setLayouts(updatedLayouts);
    setLayoutName('');
    setSaveDialogOpen(false);

    toast({
      title: 'Layout uložen',
      description: `"${newLayout.name}" byl úspěšně uložen`
    });
  };

  const loadLayout = (layout) => {
    try {
      // A) Clear all modules and CANVAS - direct state replacement
      workspace.setModules([]);
      workspace.setDeferredModules([]);
      workspace.clearFocusMode();
      
      // B) Restore modules DIRECTLY with their snapshot values (including viewState)
      // No addModule + update - create complete module objects directly
      const restoredModules = (layout.modules || []).map((moduleData, index) => ({
        // Use stored ID or generate new one (for backward compatibility)
        id: moduleData.id || `module-${Date.now()}-${index}`,
        type: moduleData.type,
        // Position with fallback
        position: {
          x: moduleData.position?.x ?? 100 + index * 30,
          y: moduleData.position?.y ?? 100 + index * 30
        },
        // Size with fallback
        size: {
          width: moduleData.size?.width ?? 400,
          height: moduleData.size?.height ?? 300
        },
        // zIndex with fallback
        zIndex: moduleData.zIndex ?? index,
        // pinMode with fallback (backward compatibility)
        pinMode: moduleData.pinMode || 'none',
        // Optional properties with fallback
        isAlwaysOnTop: moduleData.isAlwaysOnTop || false,
        snappedState: moduleData.snappedState || null,
        // ViewState per window instance (backward compatible - undefined if not present)
        viewState: moduleData.viewState || undefined
      }));
      
      // Set modules directly
      workspace.setModules(restoredModules);
      
      // C) Restore CANVAS (deferred modules) in correct order (including viewState)
      const restoredDeferredModules = (layout.deferredModules || []).map((moduleData, index) => ({
        id: moduleData.id || `deferred-${Date.now()}-${index}`,
        type: moduleData.type,
        position: {
          x: moduleData.position?.x ?? 100,
          y: moduleData.position?.y ?? 100
        },
        size: {
          width: moduleData.size?.width ?? 400,
          height: moduleData.size?.height ?? 300
        },
        zIndex: moduleData.zIndex ?? index,
        pinMode: moduleData.pinMode || 'none',
        viewState: moduleData.viewState || undefined
      }));
      
      workspace.setDeferredModules(restoredDeferredModules);
      
      // D) Restore focus mode AFTER modules are created
      if (layout.focusedModuleId) {
        // Verify the focused module exists in restored modules
        const focusedExists = restoredModules.some(m => m.id === layout.focusedModuleId);
        if (focusedExists) {
          workspace.setFocusMode(layout.focusedModuleId);
        }
      }
      
      // Restore data (notes, tasks, etc.) with backward compatibility
      if (layout.data) {
        if (layout.data.notes && Array.isArray(layout.data.notes)) {
          workspace.setNotes(layout.data.notes);
        }
        if (layout.data.tasks && Array.isArray(layout.data.tasks)) {
          workspace.setTasks(layout.data.tasks);
        }
        if (typeof layout.data.timerSeconds === 'number') {
          workspace.setTimerSeconds(layout.data.timerSeconds);
        }
      }
      
      // Update lastUsedAt
      const updatedLayouts = layouts.map(l => 
        l.id === layout.id 
          ? { ...l, lastUsedAt: new Date().toISOString() }
          : l
      );
      localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
      setLayouts(updatedLayouts);

      onClose();
      
      const moduleCount = restoredModules.length;
      const canvasCount = restoredDeferredModules.length;
      
      toast({
        title: 'Layout načten',
        description: `"${layout.name}" obnoven: ${moduleCount} oken${canvasCount > 0 ? `, ${canvasCount} v CANVAS` : ''}`
      });
    } catch (error) {
      console.error('Error loading layout:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst layout',
        variant: 'destructive'
      });
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

  // === RENAME FUNCTIONALITY ===
  
  const startRename = (layout) => {
    setEditingLayoutId(layout.id);
    setEditingName(layout.name);
    setRenameError('');
  };
  
  const cancelRename = () => {
    setEditingLayoutId(null);
    setEditingName('');
    setRenameError('');
  };
  
  const generateUniqueName = (baseName, currentLayoutId) => {
    // Check for duplicates (case-insensitive)
    const normalizedBase = baseName.toLowerCase().trim();
    const existingNames = layouts
      .filter(l => l.id !== currentLayoutId)
      .map(l => l.name.toLowerCase());
    
    if (!existingNames.includes(normalizedBase)) {
      return baseName.trim();
    }
    
    // Generate unique suffix
    let suffix = 2;
    let uniqueName = `${baseName.trim()} (${suffix})`;
    while (existingNames.includes(uniqueName.toLowerCase())) {
      suffix++;
      uniqueName = `${baseName.trim()} (${suffix})`;
    }
    return uniqueName;
  };
  
  const saveRename = () => {
    // Defensive guard: check if layout exists
    const layoutIndex = layouts.findIndex(l => l.id === editingLayoutId);
    if (layoutIndex === -1) {
      toast({
        title: 'Chyba',
        description: 'Layout nebyl nalezen',
        variant: 'destructive'
      });
      cancelRename();
      return;
    }
    
    // Trim and validate
    const trimmedName = editingName.trim();
    
    // Empty name validation
    if (!trimmedName) {
      setRenameError('Název nesmí být prázdný');
      return;
    }
    
    // Max length validation (40 chars)
    if (trimmedName.length > 40) {
      setRenameError('Název může mít max. 40 znaků');
      return;
    }
    
    // Generate unique name if duplicate
    const finalName = generateUniqueName(trimmedName, editingLayoutId);
    
    // Update layout (preserve all other fields)
    const updatedLayouts = layouts.map(l => 
      l.id === editingLayoutId 
        ? { ...l, name: finalName }
        : l
    );
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LAYOUTS, JSON.stringify(updatedLayouts));
      setLayouts(updatedLayouts);
      
      // Show toast if name was auto-modified for uniqueness
      if (finalName !== trimmedName) {
        toast({
          title: 'Layout přejmenován',
          description: `Název změněn na "${finalName}" (duplicitní název upraven)`
        });
      } else {
        toast({
          title: 'Layout přejmenován',
          description: `Layout byl přejmenován na "${finalName}"`
        });
      }
    } catch (error) {
      console.error('Error saving renamed layout:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se uložit nový název',
        variant: 'destructive'
      });
    }
    
    cancelRename();
  };
  
  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
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
              Uložte nebo načtěte rozložení workspace s daty modulů
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
                      
                      return (
                        <div
                          key={layout.id}
                          className="layout-card p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{layout.name}</h4>
                              <p className="text-xs text-gray-500">
                                Vytvořeno: {new Date(layout.createdAt || layout.timestamp).toLocaleString('cs-CZ')}
                              </p>
                              {layout.lastUsedAt && layout.lastUsedAt !== layout.createdAt && (
                                <p className="text-xs text-gray-500">
                                  Naposledy: {new Date(layout.lastUsedAt).toLocaleString('cs-CZ')}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {/* Module count badge */}
                                <span 
                                  className="chip-scannable text-xs px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                  style={{ animationDelay: '0ms', animationFillMode: 'both' }}
                                >
                                  {layout.modules.length} modulů
                                </span>
                                
                                {/* Module type chips with scan animation */}
                                {visibleModules.map(({ type, info }, index) => {
                                  const IconComponent = info.icon;
                                  return (
                                    <span 
                                      key={type}
                                      className={`chip-scannable inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${info.bgColor} ${info.color} border ${info.borderColor}`}
                                      style={{ 
                                        animationDelay: `${(index + 1) * 100}ms`,
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
                                      animationDelay: `${(visibleModules.length + 1) * 100}ms`,
                                      animationFillMode: 'both'
                                    }}
                                  >
                                    +{hiddenCount}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
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
              Zadejte název pro aktuální rozložení workspace
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
