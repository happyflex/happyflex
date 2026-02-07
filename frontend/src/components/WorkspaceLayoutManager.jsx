import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { toast } from '../hooks/use-toast';

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
      const saved = localStorage.getItem('workspace_layouts');
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
    localStorage.setItem('workspace_layouts', JSON.stringify(updatedLayouts));
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
      // Nejdřív zavřeme všechny moduly
      workspace.modules.forEach(m => workspace.removeModule(m.id));
      
      // Načteme data
      workspace.notes.forEach(n => workspace.deleteNote(n.id));
      layout.data.notes.forEach(n => workspace.addNote(n));

      workspace.tasks.forEach(t => workspace.deleteTask(t.id));
      layout.data.tasks.forEach(t => workspace.addTask(t));

      // Obnovíme moduly
      layout.modules.forEach(m => {
        workspace.addModule(m.type, m.position);
        // Aktualizujeme velikost a zIndex
        setTimeout(() => {
          workspace.updateModuleSize(m.id, m.size);
          workspace.bringToFront(m.id);
        }, 50);
      });

      // Obnovíme odložené moduly
      layout.deferredModules.forEach(m => {
        const module = {
          id: m.id,
          type: m.type,
          position: m.position,
          size: m.size,
          zIndex: m.zIndex
        };
        workspace.deferredModules.push(module);
      });

      workspace.setTimerSeconds(layout.data.timerSeconds || 0);

      onClose();
      toast({
        title: 'Layout načten',
        description: `"${layout.name}" byl obnoven`
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
    localStorage.setItem('workspace_layouts', JSON.stringify(updatedLayouts));
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
                    {layouts.map((layout) => (
                      <div
                        key={layout.id}
                        className="group p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{layout.name}</h4>
                            <p className="text-xs text-gray-500">
                              {new Date(layout.timestamp).toLocaleString('cs-CZ')}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                {layout.modules.length} modulů
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                {layout.data.notes.length} poznámek
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30">
                                {layout.data.tasks.length} úkolů
                              </span>
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
                    ))}
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
