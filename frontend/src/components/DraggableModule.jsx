import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Pin, Trash2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTrash } from '../context/TrashContext';
import { Button } from './ui/button';
import NotesModule from './modules/NotesModule';
import TasksModule from './modules/TasksModule';
import PeopleModule from './modules/PeopleModule';
import ProjectsModule from './modules/ProjectsModule';
import GoalsModule from './modules/GoalsModule';
import ProcessesModule from './modules/ProcessesModule';
import ChartModule from './modules/ChartModule';
import TimerModule from './modules/TimerModule';
import CalendarModule from './modules/CalendarModule';
import MusicModule from './modules/MusicModule';
import TrashModule from './modules/TrashModule';
import FilesModule from './modules/FilesModule';

const moduleComponents = {
  notes: NotesModule,
  tasks: TasksModule,
  people: PeopleModule,
  projects: ProjectsModule,
  goals: GoalsModule,
  processes: ProcessesModule,
  chart: ChartModule,
  timer: TimerModule,
  calendar: CalendarModule,
  music: MusicModule,
  trash: TrashModule,
  files: FilesModule
};

// Snap zone detection threshold in pixels
const SNAP_THRESHOLD = 50;
// Magnetism threshold - how close modules need to be to snap together
const MAGNET_THRESHOLD = 15;

// SAFE ZONE constants (must match WorkspaceContext.js)
const WORKSPACE_SAFE_MARGIN = 30;
const WORKSPACE_LAYOUT = {
  rightSidebarWidth: 320,
  bottomToolbarHeight: 80,
  headerHeight: 64
};

// Helper: Calculate SAFE ZONE rect
const getSafeZone = () => {
  const { rightSidebarWidth, bottomToolbarHeight, headerHeight } = WORKSPACE_LAYOUT;
  
  const boundsLeft = 0;
  const boundsTop = 0;
  const boundsRight = window.innerWidth - rightSidebarWidth;
  const boundsBottom = window.innerHeight - headerHeight - bottomToolbarHeight;
  
  const safeLeft = boundsLeft + WORKSPACE_SAFE_MARGIN;
  const safeTop = boundsTop + WORKSPACE_SAFE_MARGIN;
  const safeRight = boundsRight - WORKSPACE_SAFE_MARGIN;
  const safeBottom = boundsBottom - WORKSPACE_SAFE_MARGIN;
  const safeWidth = safeRight - safeLeft;
  const safeHeight = safeBottom - safeTop;
  
  if (safeWidth <= 0 || safeHeight <= 0) {
    return {
      left: boundsLeft,
      top: boundsTop,
      right: boundsRight,
      bottom: boundsBottom,
      width: boundsRight - boundsLeft,
      height: boundsBottom - boundsTop,
      isValid: false
    };
  }
  
  return {
    left: safeLeft,
    top: safeTop,
    right: safeRight,
    bottom: safeBottom,
    width: safeWidth,
    height: safeHeight,
    isValid: true
  };
};

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

// Calculate magnetic snapping to other modules
const getMagneticPosition = (currentModule, allModules, newX, newY) => {
  let magnetX = newX;
  let magnetY = newY;
  
  const currentRight = newX + currentModule.size.width;
  const currentBottom = newY + currentModule.size.height;
  
  for (const other of allModules) {
    if (other.id === currentModule.id) continue;
    
    const otherRight = other.position.x + other.size.width;
    const otherBottom = other.position.y + other.size.height;
    
    // Horizontal alignment (left-to-left, right-to-right, left-to-right, right-to-left)
    if (Math.abs(newX - other.position.x) < MAGNET_THRESHOLD) {
      magnetX = other.position.x; // Align left edges
    } else if (Math.abs(currentRight - otherRight) < MAGNET_THRESHOLD) {
      magnetX = otherRight - currentModule.size.width; // Align right edges
    } else if (Math.abs(newX - otherRight) < MAGNET_THRESHOLD) {
      magnetX = otherRight; // Snap left to right
    } else if (Math.abs(currentRight - other.position.x) < MAGNET_THRESHOLD) {
      magnetX = other.position.x - currentModule.size.width; // Snap right to left
    }
    
    // Vertical alignment (top-to-top, bottom-to-bottom, top-to-bottom, bottom-to-top)
    if (Math.abs(newY - other.position.y) < MAGNET_THRESHOLD) {
      magnetY = other.position.y; // Align top edges
    } else if (Math.abs(currentBottom - otherBottom) < MAGNET_THRESHOLD) {
      magnetY = otherBottom - currentModule.size.height; // Align bottom edges
    } else if (Math.abs(newY - otherBottom) < MAGNET_THRESHOLD) {
      magnetY = otherBottom; // Snap top to bottom
    } else if (Math.abs(currentBottom - other.position.y) < MAGNET_THRESHOLD) {
      magnetY = other.position.y - currentModule.size.height; // Snap bottom to top
    }
  }
  
  return { x: magnetX, y: magnetY };
};

const DraggableModule = ({ module }) => {
  const { 
    modules,
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
    setSnapPreview,
    setIsDraggingWindow
  } = useWorkspace();
  const { addWindowToTrash } = useTrash();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [previousState, setPreviousState] = useState(null);
  const [currentSnapZone, setCurrentSnapZone] = useState(null);
  const moduleRef = useRef(null);
  
  // ANTI-JUMP: Drag start snapshot (prevents jump on mousedown)
  const dragStartSnapshot = useRef(null);
  
  // Use ref for modules to avoid effect re-runs when other modules change
  const modulesRef = useRef(modules);
  modulesRef.current = modules;
  
  // Store last valid rect for resize fallback
  const lastValidRect = useRef({ 
    x: module.position.x, 
    y: module.position.y, 
    width: module.size.width, 
    height: module.size.height 
  });
  
  // Workspace bounds constants
  const WORKSPACE_BOUNDS = {
    minWidth: 280,
    minHeight: 180,
    padding: 16,
    rightSidebarWidth: 320,
    bottomToolbarHeight: 80,
    headerHeight: 64,
    titlebarHeight: 40 // Minimum visible titlebar
  };

  const ModuleComponent = moduleComponents[module.type];
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  
  const pinMode = module.pinMode || 'none';
  const isFocused = focusedModuleId === module.id;
  const isDimmed = focusedModuleId && focusedModuleId !== module.id;
  
  // Get current workspace dimensions
  const getWorkspaceBounds = () => {
    const maxWidth = window.innerWidth - WORKSPACE_BOUNDS.rightSidebarWidth;
    const maxHeight = window.innerHeight - WORKSPACE_BOUNDS.bottomToolbarHeight - WORKSPACE_BOUNDS.headerHeight;
    return { maxWidth, maxHeight };
  };
  
  // Clamp position to keep titlebar visible
  const clampPosition = (x, y, width, height) => {
    const { maxWidth, maxHeight } = getWorkspaceBounds();
    
    // Ensure at least titlebar is visible (can drag window back)
    const minX = -width + 100; // At least 100px visible on left
    const maxX = maxWidth - 100; // At least 100px visible on right
    const minY = 0; // Can't go above workspace
    const maxY = maxHeight - WORKSPACE_BOUNDS.titlebarHeight; // Titlebar always visible
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  };
  
  // Validate and clamp size
  const clampSize = (width, height) => {
    const { maxWidth, maxHeight } = getWorkspaceBounds();
    
    return {
      width: Math.max(WORKSPACE_BOUNDS.minWidth, Math.min(maxWidth, width)),
      height: Math.max(WORKSPACE_BOUNDS.minHeight, Math.min(maxHeight, height))
    };
  };
  
  // Check if value is valid (not NaN, Infinity, or extremely large)
  const isValidNumber = (num) => {
    return typeof num === 'number' && isFinite(num) && Math.abs(num) < 10000;
  };

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
    e.stopPropagation();
    
    // ANTI-JUMP FIX: Store drag start snapshot, but DON'T activate drag yet
    // Drag activates only after threshold (2px movement) to prevent jump
    const rect = moduleRef.current.getBoundingClientRect();
    
    dragStartSnapshot.current = {
      pointerStart: { x: e.clientX, y: e.clientY },
      windowRectStart: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      grabOffset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      activatedDrag: false
    };
    
    // Store offset for later use (when drag activates)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // DON'T set isDragging=true here - wait for first mousemove with threshold
    // DON'T call bringToFront here - it can cause z-index jump
    // These will be called in mousemove after threshold is exceeded
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
    
    // Store current valid rect before resize
    lastValidRect.current = {
      x: module.position.x,
      y: module.position.y,
      width: module.size.width,
      height: module.size.height
    };
  };

  const handleMaximize = () => {
    const safeZone = getSafeZone();
    if (!safeZone.isValid) return; // Guard: no-op if invalid
    
    if (isMaximized) {
      // Restore to previous state
      if (previousState) {
        updateModulePosition(module.id, previousState.position);
        updateModuleSize(module.id, previousState.size);
      }
      setIsMaximized(false);
    } else {
      // Save current state before maximizing (only if not already saved)
      if (!previousState || !isMaximized) {
        setPreviousState({
          position: { ...module.position },
          size: { ...module.size }
        });
      }
      
      // Maximize to SAFE ZONE (same as UP SNAP)
      updateModulePosition(module.id, { 
        x: safeZone.left, 
        y: safeZone.top
      });
      updateModuleSize(module.id, {
        width: safeZone.width,
        height: safeZone.height
      });
      setIsMaximized(true);
    }
  };
  
  // Handle snap-maximize (called when snapping to top edge)
  const handleSnapMaximize = () => {
    // Save state before snap-maximize if not already maximized
    if (!isMaximized && !previousState) {
      setPreviousState({
        position: { ...module.position },
        size: { ...module.size }
      });
    }
    setIsMaximized(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        
        // Calculate new position based on stored offset
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;
        
        // Validate calculated position
        if (!isValidNumber(newX) || !isValidNumber(newY)) {
          return; // Skip invalid updates
        }
        
        // Detect snap zone during drag (for edge snapping)
        const zone = getSnapZone(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
        setCurrentSnapZone(zone);
        setSnapPreview(zone);
        
        // Apply magnetic snapping to other modules (only if not in edge snap zone)
        if (!zone) {
          const magneticPos = getMagneticPosition(module, modulesRef.current, newX, newY);
          newX = magneticPos.x;
          newY = magneticPos.y;
        }
        
        // Clamp position to keep window accessible
        const clamped = clampPosition(newX, newY, module.size.width, module.size.height);
        
        updateModulePosition(module.id, clamped);
      } else if (isResizing && resizeHandle) {
        e.preventDefault();
        
        const rect = moduleRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        let newWidth = module.size.width;
        let newHeight = module.size.height;
        let newX = module.position.x;
        let newY = module.position.y;
        
        // Calculate new dimensions based on resize handle
        if (resizeHandle.includes('e')) {
          newWidth = e.clientX - rect.left;
        }
        if (resizeHandle.includes('s')) {
          newHeight = e.clientY - rect.top;
        }
        if (resizeHandle.includes('w')) {
          const deltaX = e.clientX - rect.left;
          newWidth = module.size.width - deltaX;
          newX = module.position.x + deltaX;
        }
        if (resizeHandle.includes('n')) {
          const deltaY = e.clientY - rect.top;
          newHeight = module.size.height - deltaY;
          newY = module.position.y + deltaY;
        }
        
        // Validate all values before applying
        if (!isValidNumber(newWidth) || !isValidNumber(newHeight) || 
            !isValidNumber(newX) || !isValidNumber(newY)) {
          // Use last valid rect as fallback
          return;
        }
        
        // Clamp size to valid bounds
        const clampedSize = clampSize(newWidth, newHeight);
        
        // Adjust position if size was clamped (for west/north handles)
        if (resizeHandle.includes('w') && clampedSize.width !== newWidth) {
          newX = module.position.x + (module.size.width - clampedSize.width);
        }
        if (resizeHandle.includes('n') && clampedSize.height !== newHeight) {
          newY = module.position.y + (module.size.height - clampedSize.height);
        }
        
        // Clamp position
        const clampedPos = clampPosition(newX, newY, clampedSize.width, clampedSize.height);
        
        // Update last valid rect
        lastValidRect.current = {
          x: clampedPos.x,
          y: clampedPos.y,
          width: clampedSize.width,
          height: clampedSize.height
        };
        
        updateModuleSize(module.id, clampedSize);
        if (clampedPos.x !== module.position.x || clampedPos.y !== module.position.y) {
          updateModulePosition(module.id, clampedPos);
        }
      }
    };

    const handleMouseUp = () => {
      // Apply snap if preview is active
      if (isDragging && currentSnapZone) {
        // Save state before snap-maximize
        if (currentSnapZone === 'maximized' && !isMaximized) {
          setPreviousState({
            position: { ...module.position },
            size: { ...module.size }
          });
          setIsMaximized(true);
        }
        snapToLayout(module.id, currentSnapZone);
        setCurrentSnapZone(null);
        setSnapPreview(null);
      }
      setIsDragging(false);
      setIsDraggingWindow(false);
      setIsResizing(false);
      setResizeHandle(null);
      setSnapPreview(null);
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
  }, [isDragging, isResizing, resizeHandle, dragOffset, module.id, module.size, module.position, updateModulePosition, updateModuleSize, currentSnapZone, snapToLayout, setSnapPreview, setIsDraggingWindow, isMaximized]);

  if (!ModuleComponent) return null;

  return (
    <div
      ref={moduleRef}
      data-module-id={module.id}
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
      {/* Resize handles - invisible but functional */}
      <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
      <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="absolute top-0 left-3 right-3 h-2 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
      <div className="absolute bottom-0 left-3 right-3 h-2 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="absolute left-0 top-3 bottom-3 w-2 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
      <div className="absolute right-0 top-3 bottom-3 w-2 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />

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
            {module.type === 'calendar' && 'Kalendář'}
            {module.type === 'music' && 'Hudba'}
            {module.type === 'files' && 'Soubory'}
            {module.type === 'trash' && (
              <span className="flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-red-400" />
                Koš
              </span>
            )}
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
            onClick={() => deferModule(module.id)}
          >
            <Minus className="h-4 w-4" />
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
            onClick={() => {
              // Add to trash before removing
              addWindowToTrash(module);
              // Clear focus if this window is focused
              if (focusedModuleId === module.id) {
                clearFocusMode();
              }
              removeModule(module.id);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="module-content p-4 h-[calc(100%-3rem)] overflow-y-auto overflow-x-hidden">
        <ModuleComponent />
      </div>
    </div>
  );
};

export default DraggableModule;
