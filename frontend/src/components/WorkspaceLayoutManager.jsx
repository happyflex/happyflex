import React, { useState, useEffect } from 'react';
import { 
  Save, FolderOpen, Trash2, X,
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

  const saveLayout = () => {
    if (!layoutName.trim()) {
      toast({
        title: 'Chybí název',
        description: 'Zadejte název pro layout',
        variant: 'destructive'
      });
      return;
    }

    const newLayout = {
      id: Date.now().toString(),
      name: layoutName.trim(),
      timestamp: new Date().toISOString(),
      modules: workspace.modules.map(m => ({
        id: m.id,
        type: m.type,
        position: m.position,
        size: m.size,
        zIndex: m.zIndex
      })),
      deferredModules: workspace.deferredModules.map(m => ({
        id: m.id,
        type: m.type,
        position: m.position,
        size: m.size,
        zIndex: m.zIndex
      })),
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
      // Zavřeme všechny současné moduly
      const currentModules = [...workspace.modules];
      currentModules.forEach(m => workspace.removeModule(m.id));
      
      // Vymažeme současná data
      const currentNotes = [...workspace.notes];
      currentNotes.forEach(n => workspace.deleteNote(n.id));

      const currentTasks = [...workspace.tasks];
      currentTasks.forEach(t => workspace.deleteTask(t.id));

      // Načteme data z layoutu - postupně přidáme
      setTimeout(() => {
        layout.data.notes.forEach(note => {
          workspace.addNote({
            title: note.title,
            content: note.content,
            color: note.color
          });
        });

        layout.data.tasks.forEach(task => {
          workspace.addTask({
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
            completed: task.completed
          });
        });

        // Obnovíme moduly s jejich původní pozicí a velikostí
        layout.modules.forEach((moduleData, index) => {
          setTimeout(() => {
            const newModule = {
              id: `module-${Date.now()}-${index}`,
              type: moduleData.type,
              position: moduleData.position,
              size: moduleData.size,
              zIndex: moduleData.zIndex
            };
            workspace.addModule(moduleData.type, moduleData.position);
            // Aktualizujeme velikost po přidání
            setTimeout(() => {
              workspace.updateModuleSize(newModule.id, moduleData.size);
            }, 100);
          }, index * 100);
        });

        workspace.setTimerSeconds(layout.data.timerSeconds || 0);
      }, 300);

      onClose();
      toast({
        title: 'Layout načten',
        description: `"${layout.name}" byl obnoven s ${layout.modules.length} moduly`
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

  return (
    <>
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
                          className="group/card p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{layout.name}</h4>
                              <p className="text-xs text-gray-500">
                                {new Date(layout.timestamp).toLocaleString('cs-CZ')}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {/* Module count badge */}
                                <span className="text-xs px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 transition-all duration-200 group-hover/card:shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                                  {layout.modules.length} modulů
                                </span>
                                
                                {/* Module type chips with scan animation */}
                                {visibleModules.map(({ type, info }, index) => {
                                  const IconComponent = info.icon;
                                  return (
                                    <span 
                                      key={type}
                                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${info.bgColor} ${info.color} border ${info.borderColor} transition-all duration-200 group-hover/card:animate-chip-scan`}
                                      style={{ 
                                        animationDelay: `${(index + 1) * 60}ms`,
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
                                    className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 border border-gray-500/30 transition-all duration-200 group-hover/card:animate-chip-scan"
                                    style={{ 
                                      animationDelay: `${(visibleModules.length + 1) * 60}ms`,
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
