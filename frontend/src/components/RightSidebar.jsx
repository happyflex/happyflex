import React, { useState } from 'react';
import { X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

// Centrální mapování názvů modulů
const MODULE_LABELS = {
  notes: 'Poznámky',
  tasks: 'Úkoly',
  people: 'Lidi',
  contacts: 'Kontakty',
  projects: 'Projekty',
  goals: 'Cíle',
  processes: 'Procesy',
  chart: 'Graf',
  timer: 'Časovač'
};

const RightSidebar = () => {
  const { deferredModules, restoreModule, removeFromCanvas, reorderCanvasModule, deferModule, modules } = useWorkspace();
  const [draggedModule, setDraggedModule] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e, module, index) => {
    setDraggedModule({ module, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'canvas-to-workspace',
      moduleId: module.id
    }));
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    if (draggedModule && draggedModule.index !== targetIndex) {
      reorderCanvasModule(draggedModule.index, targetIndex);
      setDraggedModule({ ...draggedModule, index: targetIndex });
    }
  };

  const handleRemoveFromCanvas = (e, moduleId) => {
    e.stopPropagation();
    removeFromCanvas(moduleId);
  };

  const handleMoveUp = (e, index) => {
    e.stopPropagation();
    if (index > 0) {
      reorderCanvasModule(index, index - 1);
    }
  };

  const handleMoveDown = (e, index) => {
    e.stopPropagation();
    if (index < deferredModules.length - 1) {
      reorderCanvasModule(index, index + 1);
    }
  };

  // Handle drop from workspace
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      // Only handle workspace-to-canvas drops, let others propagate
      if (data.type === 'workspace-to-canvas' && data.moduleId) {
        deferModule(data.moduleId);
      }
      // If it's canvas-to-workspace, don't handle it here (let it drop to Canvas/Workspace)
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const handleSidebarDragOver = (e) => {
    // Check if this is a workspace-to-canvas drag
    try {
      const types = e.dataTransfer.types;
      if (types.includes('application/json')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }
    } catch (error) {
      // Can't read data during dragover, just allow it
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    // Only set false if leaving the sidebar entirely
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  return (
    <div 
      className={`w-80 bg-[#0a1628]/80 backdrop-blur-lg border-l flex flex-col transition-all ${
        isDragOver ? 'border-cyan-400 border-l-4 bg-cyan-500/10' : 'border-cyan-500/20'
      }`}
      onDrop={handleDrop}
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-6 border-b border-cyan-500/20">
        <h2 className="text-lg font-semibold text-white mb-1">CANVAS</h2>
        <p className="text-sm text-gray-400">
          {deferredModules.length > 0 
            ? `${deferredModules.length} ${deferredModules.length === 1 ? 'modul v bufferu' : 'modulů v bufferu'}` 
            : 'Pracovní buffer – přetáhni moduly sem'
          }
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {deferredModules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <GripVertical className="h-8 w-8 text-cyan-400/50" />
              </div>
              <p className="text-sm text-gray-400">CANVAS je prázdný</p>
              <p className="text-xs text-gray-600 mt-1">Přetáhni okno sem pro odložení</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deferredModules.map((module, index) => (
                <div
                  key={module.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, module, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDoubleClick={(e) => {
                    // Double click to restore (instead of single click to avoid drag conflicts)
                    if (!e.target.closest('button')) {
                      restoreModule(module.id);
                    }
                  }}
                  className={`
                    group p-3 bg-[#0f1d35] rounded-lg border border-cyan-500/20 
                    hover:border-cyan-400/40 transition-all cursor-grab active:cursor-grabbing
                    ${draggedModule?.index === index ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 pointer-events-none">
                    {/* Drag handle */}
                    <div className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Module name */}
                    <span className="flex-1 text-sm text-white">
                      {MODULE_LABELS[module.type] || module.type}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Move up */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-cyan-400 pointer-events-auto"
                        onClick={(e) => handleMoveUp(e, index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>

                      {/* Move down */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-cyan-400 pointer-events-auto"
                        onClick={(e) => handleMoveDown(e, index)}
                        disabled={index === deferredModules.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>

                      {/* Close */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-400 pointer-events-auto"
                        onClick={(e) => handleRemoveFromCanvas(e, module.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drop zone hint */}
      <div className="p-4 border-t border-cyan-500/20 bg-[#0f1d35]/50">
        <p className="text-xs text-gray-500 text-center">
          💡 Přetáhni moduly sem nebo zpět do workspace
        </p>
      </div>
    </div>
  );
};

export default RightSidebar;
