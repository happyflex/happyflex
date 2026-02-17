import React, { useState, useEffect } from 'react';
import { 
  Target, Plus, Calendar, CheckCircle2, Circle, 
  TrendingUp, FileText, ChevronRight, Edit2, Trash2,
  X, MoreVertical, Map
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import * as DialogPrimitive from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from '../../hooks/use-toast';
import { useTrash } from '../../context/TrashContext';
import PlanCanvas from './PlanCanvas';

const Dialog = DialogPrimitive.Dialog;
const DialogContent = DialogPrimitive.DialogContent;
const DialogHeader = DialogPrimitive.DialogHeader;
const DialogTitle = DialogPrimitive.DialogTitle;

// Goal statuses
const GOAL_STATUS = {
  draft: { label: 'Koncept', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', icon: Circle },
  active: { label: 'Aktivní', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', icon: TrendingUp },
  achieved: { label: 'Dosaženo', color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: CheckCircle2 },
  archived: { label: 'Archivováno', color: 'bg-gray-500/20 text-gray-500 border-gray-500/40', icon: Circle }
};

const GoalsModule = () => {
  const { addToTrash, TRASH_TYPES } = useTrash();
  const [goals, setGoals] = useState(null); // null = not loaded yet
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [showPlanCanvas, setShowPlanCanvas] = useState(null); // { goalId, planId }
  const [filterStatus, setFilterStatus] = useState('all');

  // Load from localStorage
  useEffect(() => {
    const loadGoals = () => {
      const saved = localStorage.getItem('steward_goals');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setGoals(parsed);
        } catch (e) {
          console.error('Error loading goals:', e);
          initializeDefaultGoals();
        }
      } else {
        initializeDefaultGoals();
      }
    };

    loadGoals();

    // Listen for external updates (e.g., from trash restore)
    const handleExternalUpdate = () => {
      const saved = localStorage.getItem('steward_goals');
      if (saved) {
        try {
          setGoals(JSON.parse(saved));
        } catch (e) {
          console.error('Error reloading goals:', e);
        }
      }
    };
    window.addEventListener('steward-goals-updated', handleExternalUpdate);
    
    return () => {
      window.removeEventListener('steward-goals-updated', handleExternalUpdate);
    };
  }, []);

  // Auto-save - only when goals is not null (initialized)
  useEffect(() => {
    if (goals !== null) {
      localStorage.setItem('steward_goals', JSON.stringify(goals));
    }
  }, [goals]);

  // Sync selectedGoal with goals changes
  useEffect(() => {
    if (selectedGoal) {
      const updatedGoal = goals.find(g => g.id === selectedGoal.id);
      if (updatedGoal && JSON.stringify(updatedGoal) !== JSON.stringify(selectedGoal)) {
        setSelectedGoal(updatedGoal);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  const initializeDefaultGoals = () => {
    const defaults = [
      {
        id: 'goal-1',
        name: 'Expandovat na nové trhy',
        description: 'Proč: Diverzifikace příjmů a snížení závislosti na jednom trhu',
        desiredOutcome: 'Úspěšné vstupy do 3 nových geografických trhů s alespoň 15% tržním podílem',
        deadline: '2025-12-31',
        status: 'active',
        createdAt: '2025-02-01',
        plans: [
          {
            id: 'plan-1',
            name: 'Plán vstupu do DACH regionu',
            description: 'Strategie pro vstup na německy mluvící trhy',
            areas: [
              { id: 'area-1', name: 'Průzkum trhu', notes: 'Analýza konkurence, identifikace příležitostí', color: 'bg-blue-500/20' },
              { id: 'area-2', name: 'Partnerství', notes: 'Vyhledání lokálních distributorů', color: 'bg-green-500/20' }
            ]
          }
        ]
      },
      {
        id: 'goal-2',
        name: 'Zvýšit customer retention',
        description: 'Proč: Získání nového zákazníka je 5x dražší než udržení stávajícího',
        desiredOutcome: 'Zvýšit retention rate z 65% na 85% během 6 měsíců',
        deadline: '2025-08-31',
        status: 'active',
        createdAt: '2025-01-15',
        plans: []
      }
    ];
    setGoals(defaults);
  };

  const addGoal = (goalData) => {
    const newGoal = {
      id: `goal-${Date.now()}`,
      ...goalData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      plans: []
    };
    setGoals(prev => prev ? [...prev, newGoal] : [newGoal]);
    toast({ title: 'Cíl vytvořen', description: `${goalData.name}` });
  };

  const updateGoal = (id, updates) => {
    setGoals(prev => prev ? prev.map(g => g.id === id ? { ...g, ...updates } : g) : prev);
  };

  const deleteGoal = (id) => {
    // Find goal and add to trash before deleting
    const goal = goals?.find(g => g.id === id);
    if (goal) {
      addToTrash({
        type: TRASH_TYPES.GOAL,
        name: goal.name,
        data: goal,
        sourceModule: 'goals',
        metadata: { status: goal.status, plansCount: goal.plans?.length || 0 }
      });
    }
    setGoals(prev => prev ? prev.filter(g => g.id !== id) : prev);
    if (selectedGoal?.id === id) setSelectedGoal(null);
    toast({ title: 'Cíl přesunut do koše' });
  };

  const addPlan = (goalId, planData) => {
    const newPlan = {
      id: `plan-${Date.now()}`,
      ...planData,
      areas: []
    };
    setGoals(prev => prev ? prev.map(g => 
      g.id === goalId 
        ? { ...g, plans: [...g.plans, newPlan] }
        : g
    ) : prev);
    toast({ title: 'Plán přidán', description: planData.name });
  };

  const updatePlan = (goalId, planId, updates) => {
    setGoals(prev => prev ? prev.map(g => 
      g.id === goalId 
        ? {
            ...g,
            plans: g.plans.map(p => p.id === planId ? { ...p, ...updates } : p)
          }
        : g
    ) : prev);
  };

  const deletePlan = (goalId, planId) => {
    // Find plan and add to trash before deleting
    const goal = goals?.find(g => g.id === goalId);
    const plan = goal?.plans?.find(p => p.id === planId);
    if (plan) {
      addToTrash({
        type: TRASH_TYPES.OTHER,
        name: `Plán: ${plan.name}`,
        data: plan,
        sourceModule: 'goals',
        metadata: { goalId, goalName: goal.name }
      });
    }
    setGoals(prev => prev ? prev.map(g => 
      g.id === goalId 
        ? { ...g, plans: g.plans.filter(p => p.id !== planId) }
        : g
    ) : prev);
    toast({ title: 'Plán přesunut do koše' });
  };

  // Filter goals - handle null state
  const filteredGoals = goals ? goals.filter(goal => 
    filterStatus === 'all' || goal.status === filterStatus
  ) : [];

  // If Plan Canvas is open
  if (showPlanCanvas && goals) {
    const goal = goals.find(g => g.id === showPlanCanvas.goalId);
    const plan = goal?.plans.find(p => p.id === showPlanCanvas.planId);
    
    return (
      <PlanCanvas
        goal={goal}
        plan={plan}
        onClose={() => setShowPlanCanvas(null)}
        onUpdate={(updates) => updatePlan(showPlanCanvas.goalId, showPlanCanvas.planId, updates)}
      />
    );
  }

  // Loading state
  if (goals === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Target className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Načítání cílů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              Strategické cíle
            </h3>
            <p className="text-xs text-gray-400">{goals.length} cílů | Strategie před exekucí</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddGoalDialog(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nový cíl
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="all">Všechny cíle</option>
            {Object.entries(GOAL_STATUS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Goals List & Detail */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* List */}
        <ScrollArea className={`${selectedGoal ? 'w-1/2' : 'w-full'} transition-all`}>
          <div className="space-y-3 pr-2">
            {filteredGoals.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Target className="h-8 w-8 text-emerald-400/50" />
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">Žádné cíle</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Začněte definováním strategických cílů pro váš projekt.
                  </p>
                  <Button
                    onClick={() => setShowAddGoalDialog(true)}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Vytvořit první cíl
                  </Button>
                </div>
              </div>
            ) : (
              filteredGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isSelected={selectedGoal?.id === goal.id}
                  onSelect={() => setSelectedGoal(goal)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Detail Panel */}
        {selectedGoal && (
          <GoalDetailPanel
            goal={selectedGoal}
            onClose={() => setSelectedGoal(null)}
            onUpdate={(updates) => updateGoal(selectedGoal.id, updates)}
            onDelete={() => deleteGoal(selectedGoal.id)}
            onAddPlan={(planData) => addPlan(selectedGoal.id, planData)}
            onOpenPlan={(planId) => setShowPlanCanvas({ goalId: selectedGoal.id, planId })}
            onDeletePlan={(planId) => deletePlan(selectedGoal.id, planId)}
          />
        )}
      </div>

      {/* Add Goal Dialog */}
      <AddGoalDialog
        isOpen={showAddGoalDialog}
        onClose={() => setShowAddGoalDialog(false)}
        onAdd={addGoal}
      />
    </div>
  );
};

// Goal Card Component
const GoalCard = ({ goal, isSelected, onSelect }) => {
  const statusInfo = GOAL_STATUS[goal.status];
  const StatusIcon = statusInfo.icon;
  const daysUntilDeadline = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 bg-[#0a1628] rounded-lg border transition-all cursor-pointer
        ${isSelected ? 'border-cyan-400 ring-1 ring-cyan-400/50' : 'border-cyan-500/20 hover:border-cyan-500/40'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-cyan-400" />
          <h4 className="font-semibold text-white">{goal.name}</h4>
        </div>
        <Badge className={`text-xs ${statusInfo.color}`}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusInfo.label}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{goal.description}</p>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            {new Date(goal.deadline).toLocaleDateString('cs-CZ')}
          </span>
          {daysUntilDeadline > 0 && (
            <span className={`${daysUntilDeadline < 30 ? 'text-orange-400' : 'text-gray-500'}`}>
              {daysUntilDeadline} dní
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-gray-500">
          <FileText className="h-3 w-3" />
          {goal.plans?.length || 0} plánů
        </span>
      </div>
    </div>
  );
};

// Goal Detail Panel
const GoalDetailPanel = ({ goal, onClose, onUpdate, onDelete, onAddPlan, onOpenPlan, onDeletePlan }) => {
  const [showAddPlanDialog, setShowAddPlanDialog] = useState(false);
  const statusInfo = GOAL_STATUS[goal.status];

  return (
    <div className="w-1/2 bg-[#0f1d35] rounded-lg border border-cyan-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-cyan-400" />
              <h3 className="font-semibold text-white">{goal.name}</h3>
            </div>
            <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
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

        {/* Status selector */}
        <select
          value={goal.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
          className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-sm text-white mb-3"
        >
          {Object.entries(GOAL_STATUS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Why (Description) */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Proč je důležitý</h4>
            <p className="text-sm text-gray-300">{goal.description}</p>
          </div>

          {/* Desired Outcome */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Cílový výsledek</h4>
            <p className="text-sm text-gray-300">{goal.desiredOutcome}</p>
          </div>

          {/* Deadline */}
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-2">Termín</h4>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{new Date(goal.deadline).toLocaleDateString('cs-CZ', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>

          {/* Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Plány realizace
              </h4>
              <Button
                size="sm"
                onClick={() => setShowAddPlanDialog(true)}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                Nový plán
              </Button>
            </div>

            {goal.plans?.length === 0 ? (
              <div className="text-center py-8 px-4 bg-[#0a1628] rounded-lg border border-cyan-500/20">
                <Map className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-500">Zatím nemáte žádný plán</p>
                <p className="text-xs text-gray-600 mt-1">Vytvořte plán, který popíše, jak dosáhnete tento cíl</p>
              </div>
            ) : (
              <div className="space-y-2">
                {goal.plans?.map(plan => (
                  <div 
                    key={plan.id}
                    className="p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-white text-sm mb-1">{plan.name}</h5>
                        <p className="text-xs text-gray-400 line-clamp-2">{plan.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                            {plan.areas?.length || 0} oblastí
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-cyan-400"
                          onClick={() => onOpenPlan(plan.id)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-400"
                          onClick={() => onDeletePlan(plan.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Add Plan Dialog */}
      <AddPlanDialog
        isOpen={showAddPlanDialog}
        onClose={() => setShowAddPlanDialog(false)}
        onAdd={onAddPlan}
      />
    </div>
  );
};

// Add Goal Dialog
const AddGoalDialog = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    desiredOutcome: '',
    deadline: ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.desiredOutcome.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte název a cílový výsledek', variant: 'destructive' });
      return;
    }
    onAdd(formData);
    setFormData({ name: '', description: '', desiredOutcome: '', deadline: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1d35] border-cyan-500/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-400" />
            Nový strategický cíl
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Název cíle *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Např. Expandovat na nové trhy"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Proč je důležitý</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Popište, proč je tento cíl strategicky důležitý..."
              className="bg-[#0a1628] border-cyan-500/30 text-white min-h-20"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Cílový výsledek *</label>
            <Textarea
              value={formData.desiredOutcome}
              onChange={(e) => setFormData(prev => ({ ...prev, desiredOutcome: e.target.value }))}
              placeholder="Co konkrétně chcete dosáhnout? Jak poznáte, že cíl byl splněn?"
              className="bg-[#0a1628] border-cyan-500/30 text-white min-h-20"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Termín</label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Zrušit</Button>
            <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Vytvořit cíl
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add Plan Dialog
const AddPlanDialog = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte název plánu', variant: 'destructive' });
      return;
    }
    onAdd(formData);
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f1d35] border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            Nový plán
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Název plánu *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Např. Plán vstupu do DACH regionu"
              className="bg-[#0a1628] border-cyan-500/30 text-white"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Popis</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Stručně popište, jak tento plán pomůže dosáhnout cíle..."
              className="bg-[#0a1628] border-cyan-500/30 text-white min-h-20"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Zrušit</Button>
            <Button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
              Vytvořit plán
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalsModule;
