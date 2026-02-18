import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { mockNotes, mockTasks, mockContacts, mockProjects } from '../data/mockData';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/persistence';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

// Initialize state from localStorage or fallback to defaults
const initializeState = (key, defaultValue) => {
  const stored = loadFromStorage(key);
  return stored !== null ? stored : defaultValue;
};

// Normalize array data - remove null/undefined/invalid items
const normalizeArrayData = (data, requiredField = 'id') => {
  if (!Array.isArray(data)) return [];
  return data.filter(item => item && typeof item === 'object' && item[requiredField]);
};

// ==================== SAFE ZONE CONSTANTS ====================
// Single source of truth for workspace margins
const WORKSPACE_SAFE_MARGIN = 30; // px - uniform margin from all edges
const WORKSPACE_WINDOW_GAP = WORKSPACE_SAFE_MARGIN; // 30px gap between windows

// Workspace layout constants
const WORKSPACE_LAYOUT = {
  rightSidebarWidth: 320,
  bottomToolbarHeight: 80,
  headerHeight: 64
};

// Helper: Calculate SAFE ZONE rect (available area for windows)
const getSafeZone = () => {
  const { rightSidebarWidth, bottomToolbarHeight, headerHeight } = WORKSPACE_LAYOUT;
  
  // Raw workspace bounds (Canvas area)
  const boundsLeft = 0;
  const boundsTop = 0; // Canvas starts after header, so 0 is relative to Canvas
  const boundsRight = window.innerWidth - rightSidebarWidth;
  const boundsBottom = window.innerHeight - headerHeight - bottomToolbarHeight;
  
  // Apply SAFE ZONE margin
  const safeLeft = boundsLeft + WORKSPACE_SAFE_MARGIN;
  const safeTop = boundsTop + WORKSPACE_SAFE_MARGIN;
  const safeRight = boundsRight - WORKSPACE_SAFE_MARGIN;
  const safeBottom = boundsBottom - WORKSPACE_SAFE_MARGIN;
  const safeWidth = safeRight - safeLeft;
  const safeHeight = safeBottom - safeTop;
  
  // Guard: if safe dimensions are invalid, fallback to original bounds
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

export const WorkspaceProvider = ({ children }) => {
  // Track if initial load is complete
  const isInitialized = useRef(false);
  
  // Initialize state from localStorage with normalization
  const [modules, setModules] = useState(() => 
    initializeState(STORAGE_KEYS.WORKSPACE_MODULES, [])
  );
  const [deferredModules, setDeferredModules] = useState(() => 
    initializeState(STORAGE_KEYS.DEFERRED_MODULES, [])
  );
  const [notes, setNotes] = useState(() => 
    normalizeArrayData(initializeState(STORAGE_KEYS.NOTES, mockNotes))
  );
  const [tasks, setTasks] = useState(() => 
    normalizeArrayData(initializeState(STORAGE_KEYS.TASKS, mockTasks))
  );
  // contacts state kept for backward compatibility with ContactsModule,
  // but NOT auto-saved. PeopleModule manages contacts independently.
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState(() => 
    normalizeArrayData(initializeState(STORAGE_KEYS.PROJECTS, mockProjects))
  );
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const stored = initializeState(STORAGE_KEYS.TIMER_STATE, null);
    return stored?.seconds || 0;
  });
  const [activeWorkzone, setActiveWorkzone] = useState(() => 
    initializeState(STORAGE_KEYS.ACTIVE_WORKZONE, null)
  );
  const [focusedModuleId, setFocusedModuleId] = useState(() => 
    initializeState(STORAGE_KEYS.FOCUSED_MODULE, null)
  );
  const [snapPreview, setSnapPreview] = useState(null);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);

  // Mark as initialized after first render
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Auto-save workspace modules
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.WORKSPACE_MODULES, modules);
    }
  }, [modules]);

  // Auto-save deferred modules (CANVAS)
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.DEFERRED_MODULES, deferredModules);
    }
  }, [deferredModules]);

  // Auto-save notes
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.NOTES, normalizeArrayData(notes));
    }
  }, [notes]);

  // Auto-save tasks
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.TASKS, normalizeArrayData(tasks));
    }
  }, [tasks]);

  // Note: contacts auto-save removed - managed by PeopleModule independently

  // Auto-save projects
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.PROJECTS, normalizeArrayData(projects));
    }
  }, [projects]);

  // Auto-save focused module
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.FOCUSED_MODULE, focusedModuleId);
    }
  }, [focusedModuleId]);

  // Auto-save active workzone
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.ACTIVE_WORKZONE, activeWorkzone);
    }
  }, [activeWorkzone]);

  // Auto-save timer state (only seconds, not active state)
  useEffect(() => {
    if (isInitialized.current && timerSeconds > 0) {
      saveToStorage(STORAGE_KEYS.TIMER_STATE, { seconds: timerSeconds });
    }
  }, [timerSeconds]);

  // Find free space for a new window using SAFE ZONE
  const findFreeSpace = useCallback((windowSize, existingModules) => {
    const safeZone = getSafeZone();
    if (!safeZone.isValid) return null;
    
    // Grid-based search for free space within SAFE ZONE
    const gridStep = 50; // Check every 50px
    const windowWidth = windowSize.width;
    const windowHeight = windowSize.height;
    
    // Maximum bounds for window placement (must fit entirely within SAFE ZONE)
    const maxX = safeZone.right - windowWidth;
    const maxY = safeZone.bottom - windowHeight;
    
    // Try different positions starting from top-left of SAFE ZONE
    for (let y = safeZone.top; y <= maxY; y += gridStep) {
      for (let x = safeZone.left; x <= maxX; x += gridStep) {
        const testRect = { x, y, width: windowWidth, height: windowHeight };
        
        // Check if this position overlaps with any existing module
        let overlaps = false;
        for (const module of existingModules) {
          if (rectsOverlap(testRect, {
            x: module.position.x,
            y: module.position.y,
            width: module.size.width,
            height: module.size.height
          }, WORKSPACE_WINDOW_GAP)) {
            overlaps = true;
            break;
          }
        }
        
        if (!overlaps) {
          return { x, y };
        }
      }
    }
    
    return null; // No free space found
  }, []);

  // Check if two rectangles overlap (with configurable gap)
  const rectsOverlap = (rect1, rect2, gap = WORKSPACE_WINDOW_GAP) => {
    return !(
      rect1.x + rect1.width + gap < rect2.x ||
      rect2.x + rect2.width + gap < rect1.x ||
      rect1.y + rect1.height + gap < rect2.y ||
      rect2.y + rect2.height + gap < rect1.y
    );
  };

  // Get cascade position based on top-most window (using SAFE ZONE)
  const getCascadePosition = useCallback((existingModules) => {
    const safeZone = getSafeZone();
    if (!safeZone.isValid) return { x: WORKSPACE_SAFE_MARGIN, y: WORKSPACE_SAFE_MARGIN };
    
    const cascadeOffset = WORKSPACE_WINDOW_GAP;
    
    if (existingModules.length === 0) {
      return { x: safeZone.left, y: safeZone.top };
    }
    
    // Find the top-most window (highest z-index)
    const topModule = existingModules.reduce((top, m) => 
      m.zIndex > top.zIndex ? m : top, existingModules[0]
    );
    
    // Cascade from top-most window
    return {
      x: topModule.position.x + cascadeOffset,
      y: topModule.position.y + cascadeOffset
    };
  }, []);

  // Calculate proper z-index for new window
  const getNewWindowZIndex = useCallback((existingModules) => {
    if (existingModules.length === 0) return 0;
    
    // Find max z-index among non-always-on-top windows
    const regularModules = existingModules.filter(m => m.pinMode !== 'top');
    const alwaysOnTopModules = existingModules.filter(m => m.pinMode === 'top');
    
    if (regularModules.length === 0 && alwaysOnTopModules.length === 0) return 0;
    
    // New window should be above all regular windows but below always-on-top
    const maxRegularZ = regularModules.length > 0 
      ? Math.max(...regularModules.map(m => m.zIndex)) 
      : -1;
    
    return maxRegularZ + 1;
  }, []);

  const addModule = useCallback((type, position = null, snapLayout = null) => {
    // Pro modul Projekty použít maximalizovanou velikost
    const isProjectsModule = type === 'projects';
    const isTrashModule = type === 'trash';
    
    const padding = 16;
    const headerHeight = 64;
    const rightSidebarWidth = 320;
    const bottomToolbarHeight = 80;
    const availableWidth = window.innerWidth - rightSidebarWidth - (padding * 2);
    const availableHeight = window.innerHeight - headerHeight - bottomToolbarHeight - (padding * 2);

    let defaultSize, defaultPosition;

    // Determine window size based on type
    if (snapLayout) {
      const snapLayouts = getSnapLayouts(availableWidth, availableHeight, padding);
      const layout = snapLayouts[snapLayout];
      if (layout) {
        defaultPosition = layout.position;
        defaultSize = layout.size;
      }
    } else if (isProjectsModule) {
      defaultSize = {
        width: availableWidth,
        height: availableHeight
      };
      defaultPosition = { x: 26, y: 44 }; // Balanced top and left offset
    } else if (isTrashModule) {
      defaultSize = { width: 380, height: 450 };
    } else {
      defaultSize = { width: 400, height: 300 };
    }

    // If position is explicitly provided, use it
    if (position) {
      defaultPosition = position;
    }
    // Otherwise, find intelligent placement
    else if (!defaultPosition) {
      // First, try to find free space
      const freePosition = findFreeSpace(defaultSize, modules);
      
      if (freePosition) {
        defaultPosition = freePosition;
      } else {
        // No free space - use cascade from top-most window
        defaultPosition = getCascadePosition(modules);
        
        // Make sure cascade doesn't go off-screen
        const maxX = window.innerWidth - rightSidebarWidth - defaultSize.width - padding;
        const maxY = window.innerHeight - bottomToolbarHeight - defaultSize.height - padding;
        
        if (defaultPosition.x > maxX) {
          defaultPosition.x = padding + 50;
        }
        if (defaultPosition.y > maxY) {
          defaultPosition.y = headerHeight + padding + 50;
        }
      }
    }

    // Calculate z-index - new window should be on top (respecting always-on-top)
    const newZIndex = getNewWindowZIndex(modules);
    
    // Bump always-on-top windows to stay on top
    if (modules.some(m => m.pinMode === 'top')) {
      setModules(prev => prev.map(m => 
        m.pinMode === 'top' ? { ...m, zIndex: newZIndex + 100 } : m
      ));
    }
    
    const newModule = {
      id: `module-${Date.now()}`,
      type,
      position: defaultPosition,
      size: defaultSize,
      zIndex: newZIndex
    };
    
    setModules(prev => [...prev, newModule]);
  }, [modules, findFreeSpace, getCascadePosition, getNewWindowZIndex]);

  // Helper function for snap layouts
  const getSnapLayouts = useCallback((availableWidth, availableHeight, padding) => {
    return {
      'top-left': {
        position: { x: padding, y: padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight / 2 - padding }
      },
      'top-right': {
        position: { x: availableWidth / 2 + padding, y: padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight / 2 - padding }
      },
      'bottom-left': {
        position: { x: padding, y: availableHeight / 2 + padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight / 2 - padding }
      },
      'bottom-right': {
        position: { x: availableWidth / 2 + padding, y: availableHeight / 2 + padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight / 2 - padding }
      },
      'left-half': {
        position: { x: padding, y: padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight }
      },
      'right-half': {
        position: { x: availableWidth / 2 + padding, y: padding },
        size: { width: availableWidth / 2 - padding, height: availableHeight }
      },
      'top-half': {
        position: { x: padding, y: padding },
        size: { width: availableWidth, height: availableHeight / 2 - padding }
      },
      'bottom-half': {
        position: { x: padding, y: availableHeight / 2 + padding },
        size: { width: availableWidth, height: availableHeight / 2 - padding }
      },
      'maximized': {
        position: { x: padding, y: padding },
        size: { width: availableWidth, height: availableHeight }
      }
    };
  }, []);

  const removeModule = useCallback((id) => {
    setModules(prev => prev.filter(m => m.id !== id));
  }, []);

  const updateModulePosition = useCallback((id, position) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, position } : m
    ));
  }, []);

  const updateModuleSize = useCallback((id, size) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, size } : m
    ));
  }, []);

  const bringToFront = useCallback((id) => {
    setModules(prev => {
      const maxZ = Math.max(...prev.map(m => m.zIndex));
      return prev.map(m => 
        m.id === id ? { ...m, zIndex: maxZ + 1 } : m
      );
    });
  }, []);

  // Reorder modules z-index based on array order (first = bottom, last = top)
  const reorderModulesZIndex = useCallback((orderedIds) => {
    setModules(prev => {
      return prev.map(m => {
        const newZIndex = orderedIds.indexOf(m.id);
        return newZIndex !== -1 ? { ...m, zIndex: newZIndex } : m;
      });
    });
  }, []);

  // Get modules sorted by z-index (highest first for display in panel)
  const getModulesSortedByZIndex = useCallback(() => {
    return [...modules].sort((a, b) => b.zIndex - a.zIndex);
  }, [modules]);

  const deferModule = useCallback((id) => {
    const module = modules.find(m => m.id === id);
    if (module) {
      setDeferredModules(prev => [...prev, module]);
      removeModule(id);
    }
  }, [modules, removeModule]);

  const restoreModule = useCallback((id) => {
    const module = deferredModules.find(m => m.id === id);
    if (module) {
      setModules(prev => [...prev, module]);
      setDeferredModules(prev => prev.filter(m => m.id !== id));
    }
  }, [deferredModules]);

  const removeFromCanvas = useCallback((id) => {
    setDeferredModules(prev => prev.filter(m => m.id !== id));
  }, []);

  const reorderCanvasModule = useCallback((fromIndex, toIndex) => {
    setDeferredModules(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return newOrder;
    });
  }, []);

  // Toggle pin mode for a module
  const togglePinMode = useCallback((id) => {
    setModules(prev => prev.map(m => {
      if (m.id === id) {
        const currentMode = m.pinMode || 'none';
        const nextMode = currentMode === 'none' ? 'lock' : currentMode === 'lock' ? 'top' : 'none';
        return { ...m, pinMode: nextMode };
      }
      return m;
    }));
  }, []);

  // Set focus mode
  const setFocusMode = useCallback((id) => {
    setFocusedModuleId(id);
  }, []);

  // Clear focus mode
  const clearFocusMode = useCallback(() => {
    setFocusedModuleId(null);
  }, []);

  // Snap module to layout
  const snapToLayout = useCallback((id, layoutKey) => {
    const padding = 16;
    const rightSidebarWidth = 320;
    const bottomToolbarHeight = 80;
    const headerHeight = 64;
    const availableWidth = window.innerWidth - rightSidebarWidth - (padding * 2);
    const availableHeight = window.innerHeight - headerHeight - bottomToolbarHeight - (padding * 2);
    
    const snapLayouts = getSnapLayouts(availableWidth, availableHeight, padding);
    const layout = snapLayouts[layoutKey];
    
    if (layout) {
      setModules(prev => prev.map(m => 
        m.id === id ? { ...m, position: layout.position, size: layout.size } : m
      ));
    }
  }, []);

  // Duplicate a module
  const duplicateModule = useCallback((id) => {
    const module = modules.find(m => m.id === id);
    if (module) {
      const newModule = {
        ...module,
        id: `module-${Date.now()}`,
        position: {
          x: module.position.x + 30,
          y: module.position.y + 30
        },
        zIndex: modules.length
      };
      setModules(prev => [...prev, newModule]);
      return newModule.id;
    }
    return null;
  }, [modules]);

  // Set specific pin mode for a module
  const setPinMode = useCallback((id, mode) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, pinMode: mode } : m
    ));
  }, []);

  // Snap module to left half
  const snapToLeft = useCallback((id) => {
    snapToLayout(id, 'left-half');
  }, [snapToLayout]);

  // Snap module to right half
  const snapToRight = useCallback((id) => {
    snapToLayout(id, 'right-half');
  }, [snapToLayout]);

  // Move canvas module up in order
  const moveCanvasModuleUp = useCallback((id) => {
    const index = deferredModules.findIndex(m => m.id === id);
    if (index > 0) {
      reorderCanvasModule(index, index - 1);
    }
  }, [deferredModules, reorderCanvasModule]);

  // Move canvas module down in order
  const moveCanvasModuleDown = useCallback((id) => {
    const index = deferredModules.findIndex(m => m.id === id);
    if (index < deferredModules.length - 1) {
      reorderCanvasModule(index, index + 1);
    }
  }, [deferredModules, reorderCanvasModule]);

  const addNote = useCallback((note) => {
    setNotes(prev => [...prev, { ...note, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
  }, []);

  const updateNote = useCallback((id, updates) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const addTask = useCallback((task) => {
    setTasks(prev => [...prev, { ...task, id: Date.now().toString(), completed: false }]);
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = {
    modules,
    deferredModules,
    notes,
    tasks,
    contacts, // Empty array for backward compatibility
    projects,
    timerActive,
    timerSeconds,
    activeWorkzone,
    focusedModuleId,
    snapPreview,
    isDraggingWindow,
    addModule,
    removeModule,
    updateModulePosition,
    updateModuleSize,
    bringToFront,
    reorderModulesZIndex,
    getModulesSortedByZIndex,
    deferModule,
    restoreModule,
    removeFromCanvas,
    reorderCanvasModule,
    getSnapLayouts,
    togglePinMode,
    setFocusMode,
    clearFocusMode,
    snapToLayout,
    setSnapPreview,
    setIsDraggingWindow,
    addNote,
    updateNote,
    deleteNote,
    addTask,
    toggleTask,
    deleteTask,
    setTimerActive,
    setTimerSeconds,
    setActiveWorkzone,
    // Setters for trash restore
    setNotes,
    setTasks,
    setContacts,
    setProjects,
    // Command Wheel actions
    duplicateModule,
    setPinMode,
    snapToLeft,
    snapToRight,
    moveCanvasModuleUp,
    moveCanvasModuleDown
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
