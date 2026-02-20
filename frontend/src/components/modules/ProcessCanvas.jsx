import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Save, GitBranch,
  Circle, Square, Diamond, Users, Target, FileText,
  Lightbulb, GripVertical, X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from '../../hooks/use-toast';

// Step types
const STEP_TYPES = {
  start: { label: 'Začátek', icon: Circle, color: 'bg-green-500/20 border-green-500/40 text-green-400' },
  task: { label: 'Činnost', icon: Square, color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  decision: { label: 'Rozhodnutí', icon: Diamond, color: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  end: { label: 'Konec', icon: Circle, color: 'bg-red-500/20 border-red-500/40 text-red-400' }
};

const ProcessCanvas = ({ process, plan, goal, onClose, onUpdate }) => {
  const [steps, setSteps] = useState(process?.steps || []);
  const [connections, setConnections] = useState(process?.connections || []);
  const [selectedStep, setSelectedStep] = useState(null);
  const [editingStep, setEditingStep] = useState(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draggedStep, setDraggedStep] = useState(null);
  const [connectionStart, setConnectionStart] = useState(null);
  const canvasRef = useRef(null);

  const handleSave = () => {
    onUpdate({ 
      steps,
      connections
    });
    setHasUnsavedChanges(false);
    toast({ title: 'Změny uloženy', description: 'Proces byl aktualizován' });
  };

  const addStep = (stepData) => {
    const newStep = {
      id: `step-${Date.now()}`,
      name: stepData.name,
      description: stepData.description || '',
      type: stepData.type || 'task',
      position: stepData.position || { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200 
      }
    };
    setSteps(prev => [...prev, newStep]);
    setShowAddStep(false);
    setHasUnsavedChanges(true);
    toast({ title: 'Krok přidán', description: stepData.name });
  };

  const updateStep = (stepId, updates) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
    setEditingStep(null);
    setHasUnsavedChanges(true);
  };

  const deleteStep = (stepId) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
    setConnections(prev => prev.filter(c => c.from !== stepId && c.to !== stepId));
    if (selectedStep?.id === stepId) setSelectedStep(null);
    setHasUnsavedChanges(true);
    toast({ title: 'Krok odstraněn' });
  };

  const startConnection = (stepId) => {
    setConnectionStart(stepId);
  };

  const completeConnection = (toStepId) => {
    if (connectionStart && connectionStart !== toStepId) {
      // Check if connection already exists
      const exists = connections.some(c => c.from === connectionStart && c.to === toStepId);
      if (!exists) {
        setConnections(prev => [...prev, { from: connectionStart, to: toStepId }]);
        setHasUnsavedChanges(true);
        toast({ title: 'Propojení vytvořeno' });
      }
    }
    setConnectionStart(null);
  };

  const deleteConnection = (from, to) => {
    setConnections(prev => prev.filter(c => !(c.from === from && c.to === to)));
    setHasUnsavedChanges(true);
    toast({ title: 'Propojení odstraněno' });
  };

  const handleStepDragStart = (e, step) => {
    setDraggedStep(step);
  };

  const handleStepDrag = (e, stepId) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore end event
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSteps(prev => prev.map(s => 
      s.id === stepId 
        ? { ...s, position: { x: Math.max(0, x - 75), y: Math.max(0, y - 30) } }
        : s
    ));
    setHasUnsavedChanges(true);
  };

  const handleStepDragEnd = () => {
    setDraggedStep(null);
  };

  const cancelConnection = () => {
    setConnectionStart(null);
  };

  // Add keyboard listener for ESC key to cancel connection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && connectionStart) {
        setConnectionStart(null);
        toast({ title: 'Propojení zrušeno' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionStart]);

  return (
    <div 
      className="h-full flex flex-col bg-transparent"
      // === SCOPE ROOT CONTRACT: Process canvas view ===
      data-module-scope-root="true"
      data-module-type="processes"
      data-scope-id={process?.id}
      data-scope-type="process"
    >
      {/* Top Bar */}
      <div className="bg-[#0f1d35] rounded-lg border border-cyan-500/30 p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Target className="h-3 w-3" />
                <span>{goal?.name}</span>
                <span className="text-gray-600">→</span>
                <FileText className="h-3 w-3" />
                <span>{plan?.name}</span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-cyan-400" />
                {process?.name}
              </h2>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`${hasUnsavedChanges ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-gray-600'} text-white`}
            >
              <Save className="h-4 w-4 mr-2" />
              {hasUnsavedChanges ? 'Uložit změny' : 'Uloženo'}
            </Button>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddStep(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Přidat krok
          </Button>
          {connectionStart && (
            <>
              <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/40 animate-pulse">
                Klikněte na cílový krok pro propojení
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelConnection}
                className="text-xs text-red-400 hover:text-red-300 h-7"
              >
                <X className="h-3 w-3 mr-1" />
                Zrušit (ESC)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-[#0a1628] rounded-lg border border-cyan-500/30 relative overflow-hidden">
        {/* Info Box */}
        {steps.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 max-w-md">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 text-blue-400" />
              <h4 className="text-sm font-medium text-blue-400 mb-2">Vytvořte tok práce</h4>
              <p className="text-xs text-gray-300 mb-4">
                Přidávejte kroky procesu a propojujte je do toku. Použijte rozhodovací body pro větvení.
              </p>
              <Button
                size="sm"
                onClick={() => setShowAddStep(true)}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
              >
                <Plus className="h-3 w-3 mr-1" />
                Přidat první krok
              </Button>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className="absolute inset-0 bg-grid-pattern"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Connections (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((conn, index) => {
              const fromStep = steps.find(s => s.id === conn.from);
              const toStep = steps.find(s => s.id === conn.to);
              if (!fromStep || !toStep) return null;

              const x1 = fromStep.position.x + 75;
              const y1 = fromStep.position.y + 30;
              const x2 = toStep.position.x + 75;
              const y2 = toStep.position.y + 30;

              return (
                <g key={index}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(6, 182, 212, 0.3)"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Delete button for connection */}
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="8"
                    fill="rgba(239, 68, 68, 0.8)"
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => deleteConnection(conn.from, conn.to)}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    className="pointer-events-none"
                  >
                    ×
                  </text>
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="rgba(6, 182, 212, 0.3)"
                />
              </marker>
            </defs>
          </svg>

          {/* Steps */}
          {steps.map(step => (
            <StepNode
              key={step.id}
              step={step}
              isSelected={selectedStep?.id === step.id}
              isEditing={editingStep === step.id}
              isConnectionStart={connectionStart === step.id}
              isConnectionMode={connectionStart !== null}
              onSelect={() => setSelectedStep(step)}
              onEdit={() => setEditingStep(step.id)}
              onSave={(updates) => updateStep(step.id, updates)}
              onCancel={() => setEditingStep(null)}
              onDelete={() => deleteStep(step.id)}
              onDragStart={(e) => handleStepDragStart(e, step)}
              onDrag={(e) => handleStepDrag(e, step.id)}
              onDragEnd={handleStepDragEnd}
              onConnectionStart={() => startConnection(step.id)}
              onConnectionEnd={() => completeConnection(step.id)}
            />
          ))}
        </div>
      </div>

      {/* Add Step Dialog */}
      {showAddStep && (
        <AddStepForm
          onAdd={addStep}
          onCancel={() => setShowAddStep(false)}
        />
      )}
    </div>
  );
};

// Step Node Component
const StepNode = ({ 
  step, 
  isSelected, 
  isEditing, 
  isConnectionStart,
  isConnectionMode,
  onSelect, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete,
  onDragStart,
  onDrag,
  onDragEnd,
  onConnectionStart,
  onConnectionEnd
}) => {
  const [editData, setEditData] = useState({ name: step.name, description: step.description, type: step.type });
  const typeInfo = STEP_TYPES[step.type];
  const TypeIcon = typeInfo.icon;

  // Handle click - if in connection mode, complete connection, otherwise select
  const handleClick = () => {
    if (isConnectionMode && !isConnectionStart) {
      onConnectionEnd();
    } else if (!isConnectionMode) {
      onSelect();
    }
  };

  if (isEditing) {
    return (
      <div
        className="absolute bg-[#0f1d35] rounded-lg border-2 border-cyan-500/40 p-3 shadow-lg"
        style={{ 
          left: step.position.x, 
          top: step.position.y,
          width: '250px',
          zIndex: 1000
        }}
      >
        <div className="space-y-2">
          <Input
            value={editData.name}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Název kroku"
            className="bg-[#0a1628] border-cyan-500/30 text-white text-sm h-8"
          />
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Popis..."
            className="bg-[#0a1628] border-cyan-500/30 text-white text-xs min-h-16"
          />
          <select
            value={editData.type}
            onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-2 py-1 text-xs text-white"
          >
            {Object.entries(STEP_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-400 h-6 text-xs">
              Zrušit
            </Button>
            <Button size="sm" onClick={() => onSave(editData)} className="bg-cyan-500 hover:bg-cyan-400 text-white h-6 text-xs">
              Uložit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={!isConnectionMode}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={`
        absolute group
        ${isConnectionMode ? 'cursor-pointer' : 'cursor-move'}
        ${isSelected ? 'z-10' : 'z-0'}
        ${isConnectionStart ? 'ring-2 ring-orange-400 animate-pulse' : ''}
        ${isConnectionMode && !isConnectionStart ? 'ring-2 ring-green-400 hover:ring-4' : ''}
      `}
      style={{ 
        left: step.position.x, 
        top: step.position.y,
        width: '150px'
      }}
    >
      <div className={`
        p-3 rounded-lg border-2 transition-all
        ${typeInfo.color}
        ${isSelected ? 'ring-2 ring-cyan-400 scale-105' : 'hover:scale-102'}
      `}>
        <div className="flex items-start gap-2 mb-1">
          <TypeIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{step.name}</h4>
            {step.description && (
              <p className="text-xs opacity-80 line-clamp-2 mt-1">{step.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isConnectionMode && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onConnectionStart(); }}
                title="Vytvořit propojení"
              >
                <GitBranch className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-400"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>

        {/* Connection mode hint */}
        {isConnectionMode && !isConnectionStart && (
          <div className="mt-2 text-center">
            <p className="text-xs text-green-400 font-semibold animate-pulse">
              Klikněte pro propojení
            </p>
          </div>
        )}

        {/* Connection target */}
        {isConnectionStart && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full border-2 border-orange-400 rounded-lg animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

// Add Step Form
const AddStepForm = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'task'
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Chyba', description: 'Vyplňte název kroku', variant: 'destructive' });
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0f1d35] rounded-lg border-2 border-cyan-500/40 p-4 shadow-2xl" style={{ width: '350px' }}>
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-cyan-400" />
        Nový krok procesu
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Název kroku *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Např. Schůzka se zákazníkem"
            className="bg-[#0a1628] border-cyan-500/30 text-white"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Popis</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Co se v tomto kroku děje..."
            className="bg-[#0a1628] border-cyan-500/30 text-white min-h-20"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Typ kroku</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full bg-[#0a1628] border border-cyan-500/30 rounded-md px-3 py-2 text-sm text-white"
          >
            {Object.entries(STEP_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-400">
            Zrušit
          </Button>
          <Button size="sm" onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-white">
            Přidat krok
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessCanvas;
