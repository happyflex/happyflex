import React, { useState, useCallback } from 'react';
import { 
  BarChart3, 
  Timer, 
  Edit3, 
  Target,
  GitBranch,
  Layout,
  ListChecks,
  Calendar,
  Music,
  Users,
  GripVertical,
  X,
  Focus
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

// Module type to icon and label mapping
const MODULE_CONFIG = {
  chart: { icon: BarChart3, label: 'Graf', color: 'text-cyan-400' },
  timer: { icon: Timer, label: 'Časovač', color: 'text-orange-400' },
  notes: { icon: Edit3, label: 'Poznámky', color: 'text-yellow-400' },
  goals: { icon: Target, label: 'Cíle', color: 'text-green-400' },
  processes: { icon: GitBranch, label: 'Procesy', color: 'text-purple-400' },
  projects: { icon: Layout, label: 'Projekty', color: 'text-blue-400' },
  tasks: { icon: ListChecks, label: 'Úkoly', color: 'text-pink-400' },
  calendar: { icon: Calendar, label: 'Kalendář', color: 'text-red-400' },
  music: { icon: Music, label: 'Hudba', color: 'text-emerald-400' },
  people: { icon: Users, label: 'Lidi', color: 'text-indigo-400' },
};

const WindowManager = ({ isOpen, onClose }) => {
  const { 
    modules, 
    bringToFront, 
    removeModule,
    reorderModulesZIndex,
    getModulesSortedByZIndex,
    focusedModuleId,
    clearFocusMode
  } = useWorkspace();
  
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Get sorted modules (highest z-index first)
  const sortedModules = getModulesSortedByZIndex();

  const handleDragStart = useCallback((e, moduleId) => {
    setDraggedId(moduleId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', moduleId);
  }, []);

  const handleDragOver = useCallback((e, moduleId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (moduleId !== draggedId) {
      setDragOverId(moduleId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Get current order
    const currentOrder = sortedModules.map(m => m.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    // Remove dragged item and insert at new position
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    // Reverse order for z-index (first in list = highest z-index)
    const zIndexOrder = [...newOrder].reverse();
    reorderModulesZIndex(zIndexOrder);

    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, sortedModules, reorderModulesZIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const handleItemClick = useCallback((moduleId) => {
    bringToFront(moduleId);
  }, [bringToFront]);

  const handleCloseModule = useCallback((e, moduleId) => {
    // Stop propagation to prevent triggering item click or drag
    e.stopPropagation();
    e.preventDefault();
    
    // If closing a focused module, clear focus mode first
    if (focusedModuleId === moduleId) {
      clearFocusMode();
    }
    
    // Remove the module
    removeModule(moduleId);
  }, [focusedModuleId, clearFocusMode, removeModule]);

  if (!isOpen) return null;

  return (
    <div className="window-manager-popover absolute bottom-16 left-0 bg-[#0f1d35] border border-cyan-500/30 rounded-lg shadow-2xl min-w-[260px] max-w-[300px] z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-[#0a1628]">
        <span className="text-xs font-medium text-cyan-400">Otevřená okna</span>
        <span className="text-xs text-gray-500">{modules.length} oken</span>
      </div>

      {/* Window List */}
      <div className="max-h-[320px] overflow-y-auto p-1">
        {sortedModules.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8 px-4">
            Žádná otevřená okna
          </div>
        ) : (
          <div className="space-y-0.5">
            {sortedModules.map((module, index) => {
              const config = MODULE_CONFIG[module.type] || { 
                icon: Layout, 
                label: module.type, 
                color: 'text-gray-400' 
              };
              const Icon = config.icon;
              const isTop = index === 0;
              const isDragging = draggedId === module.id;
              const isDragOver = dragOverId === module.id;
              const isFocused = focusedModuleId === module.id;

              return (
                <div
                  key={module.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, module.id)}
                  onDragOver={(e) => handleDragOver(e, module.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, module.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleItemClick(module.id)}
                  className={`
                    group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer
                    transition-all duration-150 select-none
                    ${isFocused 
                      ? 'bg-purple-500/20 border border-purple-500/40' 
                      : isTop 
                        ? 'bg-cyan-500/15 border border-cyan-500/30' 
                        : 'hover:bg-cyan-500/10 border border-transparent'
                    }
                    ${isDragging ? 'opacity-50 scale-95' : ''}
                    ${isDragOver ? 'bg-cyan-500/20 border-cyan-400/50 border-dashed' : ''}
                  `}
                >
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Module Icon */}
                  <div className={`flex-shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Module Name */}
                  <span className={`flex-1 text-sm truncate ${isFocused ? 'text-purple-200 font-medium' : isTop ? 'text-white font-medium' : 'text-gray-300'}`}>
                    {config.label}
                  </span>

                  {/* Focus Indicator */}
                  {isFocused && (
                    <div className="flex items-center gap-1">
                      <Focus className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-[9px] text-purple-400 bg-purple-500/20 px-1 py-0.5 rounded font-medium">
                        FOCUS
                      </span>
                    </div>
                  )}

                  {/* Top Indicator (only show if not focused) */}
                  {isTop && !isFocused && (
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                      TOP
                    </span>
                  )}

                  {/* Z-Index indicator */}
                  <span className="text-[10px] text-gray-600 font-mono">
                    z{module.zIndex}
                  </span>

                  {/* Close Button - visible on hover */}
                  <button
                    onClick={(e) => handleCloseModule(e, module.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="
                      opacity-0 group-hover:opacity-100
                      p-1 rounded
                      text-gray-500 hover:text-red-400 hover:bg-red-500/20
                      transition-all duration-150
                      flex-shrink-0
                    "
                    title="Zavřít okno"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {sortedModules.length > 0 && (
        <div className="px-3 py-2 border-t border-cyan-500/20 bg-[#0a1628]">
          <p className="text-[10px] text-gray-500 text-center">
            Přetáhněte pro změnu pořadí • Klikněte pro přenesení nahoru
          </p>
        </div>
      )}
    </div>
  );
};

export default WindowManager;
