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
import SkillTreeModule from './modules/SkillTreeModule';

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
  files: FilesModule,
  skilltree: SkillTreeModule
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
    updateModuleViewState,
    updateModuleMaximizeState,
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
  // Initialize isMaximized from module state (persisted for CANVAS transfer)
  const [isMaximized, setIsMaximized] = useState(module.isMaximized || false);
  // Initialize restoreRect from module state (persisted for CANVAS transfer)
  const [previousState, setPreviousState] = useState(module.restoreRect || null);
  const [currentSnapZone, setCurrentSnapZone] = useState(null);
  const moduleRef = useRef(null);
  
  // ANTI-JUMP FIX: State to trigger re-render and attach listeners
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  // ANTI-JUMP: Refs for drag start snapshot (no position changes on mousedown)
  const startPointerRef = useRef({ x: 0, y: 0 });
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const initialRectRef = useRef(null);
  const draggingArmedRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  // RESIZE STABILITY: Refs for resize start snapshot
  const resizeStartMouseRef = useRef({ x: 0, y: 0 });
  const resizeStartRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const resizeRAFRef = useRef(null);
  
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
  
  // Sync maximize state to module object (for CANVAS transfer persistence)
  useEffect(() => {
    // Only update if values actually changed to avoid infinite loops
    if (module.isMaximized !== isMaximized || 
        JSON.stringify(module.restoreRect) !== JSON.stringify(previousState)) {
      updateModuleMaximizeState(module.id, isMaximized, previousState);
    }
  }, [isMaximized, previousState, module.id, module.isMaximized, module.restoreRect, updateModuleMaximizeState]);
  
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
    
    // ANTI-JUMP FIX: Get rect from WRAPPER (moduleRef)
    const wrapperRect = moduleRef.current.getBoundingClientRect();
    
    // Get Canvas rect (parent container where modules are positioned)
    const canvas = moduleRef.current.closest('[data-workspace="main"]');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    
    // Store initial rect exactly once
    initialRectRef.current = wrapperRect;
    
    // Store pointer start position
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    
    // Calculate grab offset relative to CANVAS coordinate system
    // grabOffset = pointer position in canvas - module position in canvas
    // pointer in canvas = e.clientX - canvasRect.left
    // module in canvas = module.position.x (which equals wrapperRect.left - canvasRect.left)
    grabOffsetRef.current = {
      x: (e.clientX - canvasRect.left) - module.position.x,
      y: (e.clientY - canvasRect.top) - module.position.y
    };
    
    // Arm the drag (but don't activate yet - wait for threshold)
    draggingArmedRef.current = true;
    isDraggingRef.current = false;
    
    // IMPORTANT: Set state to trigger re-render and attach mousemove/mouseup listeners
    setIsMouseDown(true);
    
    // DO NOT: call updateModulePosition, setIsDragging, bringToFront here
    // These happen in mousemove after threshold is exceeded
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
    
    // RESIZE STABILITY: Store start snapshot for delta-based calculation
    resizeStartMouseRef.current = { x: e.clientX, y: e.clientY };
    resizeStartRectRef.current = {
      x: module.position.x,
      y: module.position.y,
      width: module.size.width,
      height: module.size.height
    };
    
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
    // Get Canvas reference for coordinate conversion
    const canvas = moduleRef.current?.closest('[data-workspace="main"]');
    
    const handleMouseMove = (e) => {
      // ANTI-JUMP: Check if drag is armed but not yet activated (threshold check)
      if (draggingArmedRef.current && !isDraggingRef.current) {
        const dx = Math.abs(e.clientX - startPointerRef.current.x);
        const dy = Math.abs(e.clientY - startPointerRef.current.y);
        
        // Threshold: Activate drag only after 3px movement
        if (dx + dy < 3) {
          return; // Don't activate drag yet - prevents jump
        }
        
        // Threshold exceeded - activate drag NOW
        isDraggingRef.current = true;
        setIsDragging(true);
        setIsDraggingWindow(true);
        bringToFront(module.id);
        
        // First position calculation using STORED grab offset (no jump)
        // Convert viewport coords to canvas-relative coords
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const pointerInCanvas = {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top
        };
        
        const newX = pointerInCanvas.x - grabOffsetRef.current.x;
        const newY = pointerInCanvas.y - grabOffsetRef.current.y;
        
        // Validate
        if (!isValidNumber(newX) || !isValidNumber(newY)) {
          return;
        }
        
        // DON'T apply snap/magnetic on first move - just clamp
        const clamped = clampPosition(newX, newY, module.size.width, module.size.height);
        updateModulePosition(module.id, clamped);
        return;
      }
      
      // During active drag: use STORED grabOffset, never recalculate
      if (isDraggingRef.current) {
        e.preventDefault();
        
        // Convert viewport coords to canvas-relative coords
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        const pointerInCanvas = {
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top
        };
        
        // Calculate new position using STORED grab offset
        let newX = pointerInCanvas.x - grabOffsetRef.current.x;
        let newY = pointerInCanvas.y - grabOffsetRef.current.y;
        
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
        
        // RESIZE STABILITY: Use delta-based calculation from start snapshot
        // This prevents race conditions when mouse moves faster than render
        const startRect = resizeStartRectRef.current;
        const startMouse = resizeStartMouseRef.current;
        
        // Calculate mouse delta from resize start
        const dx = e.clientX - startMouse.x;
        const dy = e.clientY - startMouse.y;
        
        // Start with initial values from snapshot
        let newWidth = startRect.width;
        let newHeight = startRect.height;
        let newX = startRect.x;
        let newY = startRect.y;
        
        // Calculate fixed edges (edges that should NOT move during resize)
        const fixedBottom = startRect.y + startRect.height;
        const fixedRight = startRect.x + startRect.width;
        
        // EAST edge: width increases with positive dx, left edge fixed
        if (resizeHandle.includes('e')) {
          newWidth = startRect.width + dx;
        }
        
        // SOUTH edge: height increases with positive dy, top edge fixed
        if (resizeHandle.includes('s')) {
          newHeight = startRect.height + dy;
        }
        
        // WEST edge: right edge fixed, width decreases with positive dx
        if (resizeHandle.includes('w')) {
          newWidth = startRect.width - dx;
          newX = startRect.x + dx;
        }
        
        // NORTH edge: bottom edge fixed, height decreases with positive dy
        if (resizeHandle.includes('n')) {
          newHeight = startRect.height - dy;
          newY = startRect.y + dy;
        }
        
        // Validate all values before applying
        if (!isValidNumber(newWidth) || !isValidNumber(newHeight) || 
            !isValidNumber(newX) || !isValidNumber(newY)) {
          return;
        }
        
        // Get workspace bounds
        const { maxWidth, maxHeight } = getWorkspaceBounds();
        const workspaceTopBound = 0;
        const workspaceBottomBound = maxHeight;
        
        // CLAMP SIZE first
        newWidth = Math.max(WORKSPACE_BOUNDS.minWidth, Math.min(maxWidth, newWidth));
        newHeight = Math.max(WORKSPACE_BOUNDS.minHeight, Math.min(maxHeight, newHeight));
        
        // CLAMP POSITION based on which edges are being resized
        // For NORTH edge: keep bottom fixed, adjust Y based on clamped height
        if (resizeHandle.includes('n')) {
          // Bottom edge should stay fixed
          newY = fixedBottom - newHeight;
          // Clamp Y to workspace top
          if (newY < workspaceTopBound) {
            newY = workspaceTopBound;
            newHeight = fixedBottom - newY;
          }
        }
        
        // For WEST edge: keep right fixed, adjust X based on clamped width
        if (resizeHandle.includes('w')) {
          newX = fixedRight - newWidth;
          // Clamp X to workspace left (allow some negative for accessibility)
          const minX = -newWidth + 100;
          if (newX < minX) {
            newX = minX;
            newWidth = fixedRight - newX;
          }
        }
        
        // For SOUTH edge: clamp bottom to workspace
        if (resizeHandle.includes('s')) {
          if (newY + newHeight > workspaceBottomBound) {
            newHeight = workspaceBottomBound - newY;
          }
        }
        
        // For EAST edge: clamp right to workspace
        if (resizeHandle.includes('e')) {
          if (newX + newWidth > maxWidth) {
            newWidth = maxWidth - newX;
          }
        }
        
        // Final safety clamp on size
        newWidth = Math.max(WORKSPACE_BOUNDS.minWidth, newWidth);
        newHeight = Math.max(WORKSPACE_BOUNDS.minHeight, newHeight);
        
        // Final safety clamp on position
        const minX = -newWidth + 100;
        const maxX = maxWidth - 100;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(workspaceTopBound, Math.min(workspaceBottomBound - WORKSPACE_BOUNDS.titlebarHeight, newY));
        
        // Update last valid rect
        lastValidRect.current = {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        };
        
        // Apply updates
        updateModuleSize(module.id, { width: newWidth, height: newHeight });
        if (newX !== module.position.x || newY !== module.position.y) {
          updateModulePosition(module.id, { x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      // ANTI-JUMP: Reset all drag refs
      draggingArmedRef.current = false;
      isDraggingRef.current = false;
      
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
      
      // Reset all states
      setIsMouseDown(false);
      setIsDragging(false);
      setIsDraggingWindow(false);
      setIsResizing(false);
      setResizeHandle(null);
      setSnapPreview(null);
    };

    // CRITICAL: Attach listeners when isMouseDown is true (state triggers re-render)
    if (isMouseDown || isDragging || isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.cursor = isResizing ? (resizeHandle || 'nwse-resize') + '-resize' : (isDragging ? 'grabbing' : 'grab');
      
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
  }, [isMouseDown, isDragging, isResizing, resizeHandle, module.id, module.size, module.position, updateModulePosition, updateModuleSize, currentSnapZone, snapToLayout, setSnapPreview, setIsDraggingWindow, isMaximized, bringToFront]);

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
        <ModuleComponent 
          initialViewState={module.viewState}
          onViewStateChange={(vs) => updateModuleViewState(module.id, vs)}
        />
      </div>
    </div>
  );
};

export default DraggableModule;
