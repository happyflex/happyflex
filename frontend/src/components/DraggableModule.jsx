import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Pin } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import NotesModule from './modules/NotesModule';
import TasksModule from './modules/TasksModule';
import PeopleModule from './modules/PeopleModule';
import ProjectsModule from './modules/ProjectsModule';
import GoalsModule from './modules/GoalsModule';
import ProcessesModule from './modules/ProcessesModule';
import ChartModule from './modules/ChartModule';
import TimerModule from './modules/TimerModule';

const moduleComponents = {
  notes: NotesModule,
  tasks: TasksModule,
  people: PeopleModule,
  projects: ProjectsModule,
  goals: GoalsModule,
  processes: ProcessesModule,
  chart: ChartModule,
  timer: TimerModule
};

// Snap zone detection threshold in pixels
const SNAP_THRESHOLD = 50;

// Calculate snap zones based on current window size
const getSnapZone = (x, y, windowWidth, windowHeight) => {
  const rightSidebarWidth = 320;
  const bottomToolbarHeight = 80;
  const headerHeight = 64;
  
  const workspaceWidth = windowWidth - rightSidebarWidth;
  const workspaceHeight = windowHeight - bottomToolbarHeight;
  
  // Corner detection (priority over edges)
  if (x < SNAP_THRESHOLD && y < SNAP_THRESHOLD + headerHeight) {
    return 'top-left';
  }
  if (x > workspaceWidth - SNAP_THRESHOLD && y < SNAP_THRESHOLD + headerHeight) {
    return 'top-right';
  }
  if (x < SNAP_THRESHOLD && y > workspaceHeight - SNAP_THRESHOLD) {
    return 'bottom-left';
  }
  if (x > workspaceWidth - SNAP_THRESHOLD && y > workspaceHeight - SNAP_THRESHOLD) {
    return 'bottom-right';
  }
  
  // Edge detection
  if (x < SNAP_THRESHOLD) {
    return 'left-half';
  }
  if (x > workspaceWidth - SNAP_THRESHOLD) {
    return 'right-half';
  }
  if (y < SNAP_THRESHOLD + headerHeight) {
    return 'maximized';
  }
  
  return null;
};

const DraggableModule = ({ module }) => {
  const { 
    removeModule, 
    updateModulePosition, 
    updateModuleSize, 
    bringToFront, 
    deferModule,
    togglePinMode,
    setFocusMode,
    clearFocusMode,
    focusedModuleId,
    snapToLayout,
    setSnapPreview
  } = useWorkspace();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [previousState, setPreviousState] = useState(null);
  const [currentSnapZone, setCurrentSnapZone] = useState(null);
  const moduleRef = useRef(null);

  const ModuleComponent = moduleComponents[module.type];
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  const pinMode = module.pinMode || 'none';
  const isFocused = focusedModuleId === module.id;
  const isDimmed = focusedModuleId && focusedModuleId !== module.id;

  // ESC key listener for clearing focus
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && focusedModuleId) {
        clearFocusMode();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focusedModuleId, clearFocusMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.module-content')) return;
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('button')) return;
    
    // If locked, don't allow dragging
    if (pinMode === 'lock') return;
    
    // If Shift is pressed, allow native drag - don't interfere
    if (isShiftPressed) {
      bringToFront(module.id);
      return;
    }
    
    // Prevent text selection during internal drag
    e.preventDefault();
    
    setIsDragging(true);
    bringToFront(module.id);
    
    const rect = moduleRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDragStart = (e) => {
    // This only fires when Shift is pressed (draggable is conditional)
    bringToFront(module.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'workspace-to-canvas',
      moduleId: module.id
    }));
  };

  const handleDragEnd = (e) => {
    // Clean up after drag
    if (isShiftPressed) {
      // Drag ended, reset any state if needed
    }
  };

  const handleResizeStart = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    bringToFront(module.id);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      // Restore to previous state
      if (previousState) {
        updateModulePosition(module.id, previousState.position);
        updateModuleSize(module.id, previousState.size);
      }
      setIsMaximized(false);
    } else {
      // Save current state and maximize to fit workspace
      setPreviousState({
        position: { ...module.position },
        size: { ...module.size }
      });
      
      // Workspace dimensions (modules are positioned relative to Canvas, not window):
      // - Canvas starts after Header (64px in window coordinates)
      // - Right sidebar: 320px (w-80)
      // - Bottom toolbar: 80px (h-20)
      // - Padding around: 16px each side for breathing room
      
      const padding = 16;
      const rightSidebarWidth = 320;
      const bottomToolbarHeight = 80;
      const headerHeight = 64;
      
      // Position is relative to Canvas (which starts after header)
      updateModulePosition(module.id, { 
        x: padding, 
        y: padding  // Just padding from top of Canvas
      });
      updateModuleSize(module.id, {
        width: window.innerWidth - rightSidebarWidth - (padding * 2),
        // Height: full Canvas height minus bottom toolbar and paddings
        height: window.innerHeight - headerHeight - bottomToolbarHeight - (padding * 2)
      });
      setIsMaximized(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Detect snap zone during drag
        const zone = getSnapZone(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
        setSnapPreview(zone);
        
        updateModulePosition(module.id, {
          x: Math.max(0, Math.min(newX, window.innerWidth - module.size.width)),
          y: Math.max(0, Math.min(newY, window.innerHeight - module.size.height - 80))
        });
      } else if (isResizing && resizeHandle) {
        e.preventDefault();
        
        const rect = moduleRef.current.getBoundingClientRect();
        let newWidth = module.size.width;
        let newHeight = module.size.height;
        let newX = module.position.x;
        let newY = module.position.y;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(300, e.clientX - rect.left);
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(200, e.clientY - rect.top);
        }
        if (resizeHandle.includes('w')) {
          const deltaX = e.clientX - rect.left;
          newWidth = Math.max(300, module.size.width - deltaX);
          newX = module.position.x + deltaX;
        }
        if (resizeHandle.includes('n')) {
          const deltaY = e.clientY - rect.top;
          newHeight = Math.max(200, module.size.height - deltaY);
          newY = module.position.y + deltaY;
        }

        updateModuleSize(module.id, { width: newWidth, height: newHeight });
        if (newX !== module.position.x || newY !== module.position.y) {
          updateModulePosition(module.id, { x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      // Apply snap if preview is active
      if (isDragging && snapPreview) {
        snapToLayout(module.id, snapPreview);
        setSnapPreview(null);
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.cursor = isResizing ? (resizeHandle || 'nwse-resize') + '-resize' : 'grabbing';
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, resizeHandle, dragOffset, module.id, module.size, module.position, updateModulePosition, updateModuleSize]);

  if (!ModuleComponent) return null;

  return (
    <div
      ref={moduleRef}
      className={`absolute bg-[#0f1d35]/95 backdrop-blur-lg rounded-xl border shadow-2xl overflow-hidden transition-all ${
        isDragging || isResizing ? 'shadow-cyan-500/50 select-none' : ''
      } ${isMaximized ? 'duration-300' : ''} ${
        pinMode === 'lock' ? 'border-orange-500/50' : pinMode === 'top' ? 'border-purple-500/50' : 'border-cyan-500/30'
      }`}
      style={{
        left: module.position.x,
        top: module.position.y,
        width: module.size.width,
        height: module.size.height,
        zIndex: pinMode === 'top' ? 9999 : module.zIndex,
        opacity: isDimmed ? 0.4 : 1,
        userSelect: isDragging || isResizing ? 'none' : 'auto'
      }}
    >
      {/* Resize handles */}
      <div className="resize-handle absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className="resize-handle absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className="resize-handle absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
      <div className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="resize-handle absolute top-0 left-3 right-3 h-1 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className="resize-handle absolute bottom-0 left-3 right-3 h-1 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="resize-handle absolute left-0 top-3 bottom-3 w-1 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
      <div className="resize-handle absolute right-0 top-3 bottom-3 w-1 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />

      <div
        className={`
          h-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 
          flex items-center justify-between px-4 select-none transition-all
          ${isShiftPressed ? 'cursor-grab active:cursor-grabbing ring-2 ring-cyan-400' : pinMode === 'lock' ? 'cursor-not-allowed' : 'cursor-move'}
        `}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => isFocused ? clearFocusMode() : setFocusMode(module.id)}
        draggable={isShiftPressed}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-sm font-medium text-white">
            {module.type === 'notes' && 'Poznámky'}
            {module.type === 'tasks' && 'Úkoly'}
            {module.type === 'people' && 'Lidi'}
            {module.type === 'projects' && 'Projekty'}
            {module.type === 'goals' && 'Cíle'}
            {module.type === 'processes' && 'Procesy'}
            {module.type === 'chart' && 'Statistiky'}
            {module.type === 'timer' && 'Časovač'}
          </span>
          {isShiftPressed && (
            <span className="text-xs text-cyan-400 animate-pulse ml-2">
              → Přesuň do CANVAS
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => deferModule(module.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 transition-colors ${
              pinMode === 'lock' 
                ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10' 
                : pinMode === 'top' 
                ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
            }`}
            onClick={() => togglePinMode(module.id)}
            title={pinMode === 'lock' ? 'Zamčeno (nelze přesunout)' : pinMode === 'top' ? 'Vždy nahoře' : 'Připnout'}
          >
            <Pin className={`h-4 w-4 ${pinMode !== 'none' ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
            onClick={handleMaximize}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => removeModule(module.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="module-content p-4 h-[calc(100%-3rem)] overflow-auto">
        <ModuleComponent />
      </div>
    </div>
  );
};

export default DraggableModule;
