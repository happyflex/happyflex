import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, Plus, Users, FileText, Target,
  ChevronRight, Edit2, Trash2, X, Layers
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import * as DialogPrimitive from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from '../../hooks/use-toast';
import { useTrash } from '../../context/TrashContext';
import { useItemActions, ITEM_ACTIONS, ITEM_TYPES } from '../../context/ItemActionContext';
import ProcessCanvas from './ProcessCanvas';

const Dialog = DialogPrimitive.Dialog;
const DialogContent = DialogPrimitive.DialogContent;
const DialogHeader = DialogPrimitive.DialogHeader;
const DialogTitle = DialogPrimitive.DialogTitle;

const ProcessesModule = ({ initialViewState, onViewStateChange }) => {
  const { addToTrash, TRASH_TYPES } = useTrash();
  const { register } = useItemActions();
  const [processes, setProcesses] = useState(null); // null = not loaded yet
  const [goals, setGoals] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showAddProcessDialog, setShowAddProcessDialog] = useState(false);
  const [showProcessCanvas, setShowProcessCanvas] = useState(null); // processId
  
  // VIEW STATE GUARDS: Prevent infinite loops
  const didApplyInitialViewState = useRef(false);
  const lastEmittedViewState = useRef(null);
  const isInitialized = useRef(false);

  // VIEW STATE: Apply initial viewState (once on mount or layout load)
  useEffect(() => {
    if (!initialViewState || didApplyInitialViewState.current) return;
    
    // Apply viewState from layout
    if (initialViewState.selectedProcessId) setSelectedProcess(initialViewState.selectedProcessId);
    if (initialViewState.showProcessCanvasId) setShowProcessCanvas(initialViewState.showProcessCanvasId);
    
    didApplyInitialViewState.current = true;
  }, [initialViewState]);

  // VIEW STATE: Emit changes (with deep-equal guard)
  useEffect(() => {
    if (!onViewStateChange || !isInitialized.current) return;
    
    const nextViewState = {
      selectedProcessId: selectedProcess,
      showProcessCanvasId: showProcessCanvas || undefined
    };
    
    // Deep-equal guard: only emit if changed
    const nextJson = JSON.stringify(nextViewState);
    if (lastEmittedViewState.current === nextJson) return;
    
    lastEmittedViewState.current = nextJson;
    onViewStateChange(nextViewState);
  }, [selectedProcess, showProcessCanvas, onViewStateChange]);

  // Load processes from localStorage
  useEffect(() => {
    isInitialized.current = true;
    const loadProcesses = () => {
      const saved = localStorage.getItem('steward_processes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProcesses(parsed);
        } catch (e) {
          console.error('Error loading processes:', e);
          initializeDefaultProcesses();
        }
      } else {
        initializeDefaultProcesses();
      }
    };

    loadProcesses();

    // Listen for external updates (e.g., from trash restore)
    const handleExternalUpdate = () => {
      const saved = localStorage.getItem('steward_processes');
      if (saved) {
        try {
          setProcesses(JSON.parse(saved));
        } catch (e) {
          console.error('Error reloading processes:', e);
        }
      }
    };
    window.addEventListener('steward-processes-updated', handleExternalUpdate);
    
    return () => {
      window.removeEventListener('steward-processes-updated', handleExternalUpdate);
    };
  }, []);

  // Load goals with plans
  useEffect(() => {
    const savedGoals = localStorage.getItem('steward_goals');
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch (e) {
        console.error('Error loading goals:', e);
      }
    }
  }, []);

  // Auto-save processes - only when processes is not null (initialized)
  useEffect(() => {
    if (processes !== null) {
      localStorage.setItem('steward_processes', JSON.stringify(processes));
    }
  }, [processes]);

  // Sync selectedProcess with processes changes
  useEffect(() => {
    if (selectedProcess) {
      const updatedProcess = processes.find(p => p.id === selectedProcess.id);
      if (updatedProcess && JSON.stringify(updatedProcess) !== JSON.stringify(selectedProcess)) {
        setSelectedProcess(updatedProcess);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processes]);

  const initializeDefaultProcesses = () => {
    const defaults = [
      {
        id: 'process-1',
        name: 'Onboarding nového zákazníka',
        description: 'Proces pro získání a zapracování nového zákazníka',
        planId: 'plan-1',
        goalId: 'goal-1',
        people: [],
        steps: [
          { 
            id: 'step-1', 
            name: 'Úvodní schůzka', 
            description: 'První kontakt a zjištění potřeb',
            position: { x: 100, y: 100 },
            type: 'start'
          },
          { 
            id: 'step-2', 
            name: 'Připravit nabídku', 
            description: 'Vytvoření cenové nabídky',
            position: { x: 300, y: 100 },
            type: 'task'
          },
          { 
            id: 'step-3', 
            name: 'Schválení', 
            description: 'Klient schvaluje nabídku',
            position: { x: 500, y: 100 },
            type: 'decision'
          }
        ],
        connections: [
          { from: 'step-1', to: 'step-2' },
          { from: 'step-2', to: 'step-3' }
        ]
      }
    ];
    setProcesses(defaults);
  };

  const addProcess = (processData) => {
    const newProcess = {
      id: `process-${Date.now()}`,
      ...processData,
      people: [],
      steps: [],
      connections: []
    };
    setProcesses(prev => prev ? [...prev, newProcess] : [newProcess]);
    toast({ title: 'Proces vytvořen', description: processData.name });
  };

  const updateProcess = (id, updates) => {
    setProcesses(prev => prev ? prev.map(p => p.id === id ? { ...p, ...updates } : p) : prev);
  };

  const deleteProcess = (id) => {
    // Find process and add to trash before deleting
    const process = processes?.find(p => p.id === id);
    if (process) {
      addToTrash({
        type: TRASH_TYPES.PROCESS,
        name: process.name,
        data: process,
        sourceModule: 'processes',
        metadata: { 
          stepsCount: process.steps?.length || 0,
          goalId: process.goalId,
          planId: process.planId
        }
      });
    }
    setProcesses(prev => prev ? prev.filter(p => p.id !== id) : prev);
    if (selectedProcess?.id === id) setSelectedProcess(null);
    toast({ title: 'Proces přesunut do koše' });
  };

  // === ITEM MODE: Register in central registry ===
  useEffect(() => {
    if (processes === null) return;
    
    const unregister = register({
      itemType: ITEM_TYPES.PROCESS,
      moduleType: 'processes',
      handlers: {
        [ITEM_ACTIONS.DELETE]: (payload) => {
          const process = processes.find(p => p.id === payload.itemId);
          if (process) {
            addToTrash({
              type: TRASH_TYPES.PROCESS,
              name: process.name,
              data: process,
              sourceModule: 'processes',
              metadata: { stepsCount: process.steps?.length || 0 }
            });
            setProcesses(prev => prev ? prev.filter(p => p.id !== payload.itemId) : prev);
            if (selectedProcess?.id === payload.itemId) setSelectedProcess(null);
            toast({ title: 'Proces smazán', description: process.name });
          }
        },
        [ITEM_ACTIONS.DUPLICATE]: (payload) => {
          const process = processes.find(p => p.id === payload.itemId);
          if (process) {
            const duplicated = {
              ...process,
              id: `process-${Date.now()}`,
              name: `${process.name} (kopie)`,
              createdAt: new Date().toISOString()
            };
            setProcesses(prev => prev ? [...prev, duplicated] : [duplicated]);
            toast({ title: 'Proces duplikován', description: duplicated.name });
          }
        },
        [ITEM_ACTIONS.OPEN_DETAIL]: (payload) => {
          setShowProcessCanvas(payload.itemId);
        },
        [ITEM_ACTIONS.EDIT]: (payload) => {
          const process = processes.find(p => p.id === payload.itemId);
          if (process) {
            setSelectedProcess(process);
          }
        }
      }
    });
    
    return unregister;
  }, [processes, selectedProcess, addToTrash, TRASH_TYPES, register]);

  // Get plan and goal info for a process
  const getProcessContext = (process) => {
    const goal = goals.find(g => g.id === process.goalId);
    const plan = goal?.plans?.find(p => p.id === process.planId);
    return { goal, plan };
  };

  // If Process Canvas is open
  if (showProcessCanvas && processes) {
    const process = processes.find(p => p.id === showProcessCanvas);
    const { goal, plan } = getProcessContext(process);
    
    return (
      <ProcessCanvas
        process={process}
        plan={plan}
        goal={goal}
        onClose={() => setShowProcessCanvas(null)}
        onUpdate={(updates) => updateProcess(showProcessCanvas, updates)}
      />
    );
  }

  // Loading state
  if (processes === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <GitBranch className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Načítání procesů...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-transparent"
      // === SCOPE ROOT CONTRACT: Processes module ===
      data-module-scope-root={selectedProcess ? "true" : undefined}
      data-module-type="processes"
      data-scope-id={selectedProcess?.id || ''}
      data-scope-type="process"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-400" />
              Procesy
            </h3>
            <p className="text-xs text-gray-400">{processes.length} procesů | Most mezi plánem a prací</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddProcessDialog(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nový proces
          </Button>
        </div>
      </div>

      {/* Processes List & Detail */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* List */}
        <ScrollArea className={`${selectedProcess ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="space-y-3 pr-2">
            {processes.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <GitBranch className="h-8 w-8 text-purple-400/50" />
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">Žádné procesy</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Vytvořte proces, který popíše tok práce od plánu k výsledku.
                  </p>
                  <Button
                    onClick={() => setShowAddProcessDialog(true)}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Vytvořit první proces
                  </Button>
                </div>
              </div>
            ) : (
              processes.map(process => {
                const { goal, plan } = getProcessContext(process);
                return (
                  <ProcessCard
                    key={process.id}
                    process={process}
                    goal={goal}
                    plan={plan}
                    isSelected={selectedProcess?.id === process.id}
                    onSelect={() => setSelectedProcess(process)}
                    onDelete={() => deleteProcess(process.id)}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Detail Panel */}
        {selectedProcess && (
          <ProcessDetailPanel
            process={selectedProcess}
            context={getProcessContext(selectedProcess)}
            onClose={() => setSelectedProcess(null)}
            onUpdate={(updates) => updateProcess(selectedProcess.id, updates)}
            onDelete={() => deleteProcess(selectedProcess.id)}
            onOpenCanvas={() => setShowProcessCanvas(selectedProcess.id)}
          />
        )}
      </div>

      {/* Add Process Dialog */}
      <AddProcessDialog
        isOpen={showAddProcessDialog}
        onClose={() => setShowAddProcessDialog(false)}
        onAdd={addProcess}
        goals={goals}
      />
    </div>
  );
};

// Process Card Component
const ProcessCard = ({ process, goal, plan, isSelected, onSelect, onDelete }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onSelect}
      // === ITEM MODE: Data attributes for Mouse Ring ===
      data-steward-item="process"
      data-item-id={process.id}
      data-module-type="processes"
      className={`
        group p-4 bg-[#0a1628] rounded-lg border transition-all cursor-pointer
        ${isSelected ? 'border-cyan-400 ring-1 ring-cyan-400/50' : 'border-cyan-500/20 hover:border-cyan-500/40'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <GitBranch className="h-5 w-5 text-cyan-400" />
          <h4 className="font-semibold text-white">{process.name}</h4>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{process.description}</p>
      
      {/* Context */}
      <div className="space-y-1 mb-3">
        {goal && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Target className="h-3 w-3" />
            <span>{goal.name}</span>
          </div>
        )}
        {plan && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileText className="h-3 w-3" />
            <span>{plan.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-500">
          <Layers className="h-3 w-3" />
          {process.steps?.length || 0} kroků
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <Users className="h-3 w-3" />
          {process.people?.length || 0} lidí
        </span>
      </div>
    </div>
  );
};

// Process Detail Panel
const ProcessDetailPanel = ({ process, context, onClose, onUpdate, onDelete, onOpenCanvas }) => {
  const { goal, plan } = context;

  return (
    <div className="w-1/2 bg-[#0f1d35] rounded-lg border border-cyan-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold text-white">{process.name}</h3>
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
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Popis</h4>
            <p className="text-sm text-gray-300">{process.description}</p>
          </div>

          {/* Context */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Kontext</h4>
            <div className="space-y-2">
              {goal && (
                <div className="p-2 bg-[#0a1628] rounded border border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <Target className="h-3 w-3" />
                    Cíl
                  </div>
                  <p className="text-sm text-white">{goal.name}</p>
                </div>
              )}
              {plan && (
                <div className="p-2 bg-[#0a1628] rounded border border-cyan-500/20">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <FileText className="h-3 w-3" />
                    Plán
                  </div>
                  <p className="text-sm text-white">{plan.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Steps Overview */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Kroky procesu</h4>
            <div className="p-3 bg-[#0a1628] rounded border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {process.steps?.length || 0} kroků definováno
                </span>
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                  {process.connections?.length || 0} propojení
                </Badge>
              </div>
            </div>
          </div>

          {/* People */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lidé zapojení do procesu
            </h4>
            {process.people?.length === 0 || !process.people ? (
              <div className="text-center py-6 px-4 bg-[#0a1628] rounded border border-cyan-500/20">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-500">Zatím nejsou zapojeni žádní lidé</p>
                <p className="text-xs text-gray-600 mt-1">Přetáhněte osoby z modulu Lidi do procesu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {process.people?.map(person => (
                  <div key={person.id} className="p-2 bg-[#0a1628] rounded border border-cyan-500/20 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      {person.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{person.name}</p>
                      <p className="text-xs text-gray-400">{person.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open Canvas Button */}
          <Button
            onClick={onOpenCanvas}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Otevřít procesní canvas
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};

// Add Process Dialog
const AddProcessDialog = ({ isOpen, onClose, onAdd, goals }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    planId: ''
  });

  const [selectedGoal, setSelectedGoal] = useState(null);

  useEffect(() => {
    if (formData.goalId) {
      const goal = goals.find(g => g.id === formData.goalId);
      setSelectedGoal(goal);
    } else {
      setSelectedGoal(null);
    }
  }, [formData.goalId, goals]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.planId) {
      toast({ title: 'Chyba', description: 'Vyplňte název a vyberte plán', variant: 'destructive' });
      return;
    }
    onAdd(formData);
    setFormData({ name: '', description: '', goalId: '', planId: '' });
    setSelectedGoal(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1d35] border-cyan-500/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-cyan-400" />
            Nový proces
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Název procesu *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Např. Onboarding nového zákazníka"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Popis</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Stručně popište, co tento proces dělá..."
              className="bg-[#0a1628] border-cyan-500/30 text-white min-h-20"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Cíl *</label>
            <select
              value={formData.goalId}
              onChange={(e) => setFormData(prev => ({ ...prev, goalId: e.target.value, planId: '' }))}
              className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-white"
            >
              <option value="">Vyberte cíl...</option>
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </select>
          </div>

          {selectedGoal && (
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Plán *</label>
              <select
                value={formData.planId}
                onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
                className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-white"
              >
                <option value="">Vyberte plán...</option>
                {selectedGoal.plans?.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-gray-300">
              💡 Proces popisuje tok práce. Není automaticky generován, ale vědomě připojen k plánu.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Zrušit</Button>
            <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Vytvořit proces
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessesModule;
