import React, { createContext, useContext, useState, useCallback } from 'react';
import { mockNotes, mockTasks, mockContacts, mockProjects } from '../data/mockData';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const [modules, setModules] = useState([]);
  const [deferredModules, setDeferredModules] = useState([]);
  const [notes, setNotes] = useState(mockNotes);
  const [tasks, setTasks] = useState(mockTasks);
  const [contacts, setContacts] = useState(mockContacts);
  const [projects, setProjects] = useState(mockProjects);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [activeWorkzone, setActiveWorkzone] = useState(null); // Start with no workzone (basic mode)
  const [focusedModuleId, setFocusedModuleId] = useState(null); // For focus mode
  const [snapPreview, setSnapPreview] = useState(null); // For snap preview visualization
  const [isDraggingWindow, setIsDraggingWindow] = useState(false); // For cursor HUD

  const addModule = useCallback((type, position = null, snapLayout = null) => {
    // Pro modul Projekty použít maximalizovanou velikost
    const isProjectsModule = type === 'projects';
    
    const padding = 16;
    const rightSidebarWidth = 320;
    const bottomToolbarHeight = 80;
    const availableWidth = window.innerWidth - rightSidebarWidth - (padding * 2);
    const availableHeight = window.innerHeight - bottomToolbarHeight - (padding * 2);

    let defaultSize, defaultPosition;

    // If snap layout is provided, calculate based on layout
    if (snapLayout) {
      const snapLayouts = getSnapLayouts(availableWidth, availableHeight, padding);
      const layout = snapLayouts[snapLayout];
      if (layout) {
        defaultPosition = layout.position;
        defaultSize = layout.size;
      }
    } else if (isProjectsModule) {
      const headerHeight = 64;
      defaultSize = {
        width: availableWidth,
        height: availableHeight - headerHeight
      };
      defaultPosition = { x: padding, y: padding };
    } else {
      defaultSize = { width: 400, height: 300 };
      defaultPosition = {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      };
    }
    
    const newModule = {
      id: `module-${Date.now()}`,
      type,
      position: position || defaultPosition,
      size: defaultSize,
      zIndex: modules.length
    };
    setModules(prev => [...prev, newModule]);
  }, [modules.length]);

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
    contacts,
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
