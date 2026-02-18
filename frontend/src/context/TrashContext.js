import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/persistence';

const TrashContext = createContext();

export const useTrash = () => {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error('useTrash must be used within TrashProvider');
  }
  return context;
};

// Trash item types
export const TRASH_TYPES = {
  WINDOW: 'window',
  NOTE: 'note',
  PROJECT: 'project',
  PROJECT_ELEMENT: 'project_element', // Elements inside projects (notes, tasks, milestones etc.)
  PERSON: 'person',
  TASK: 'task',
  GOAL: 'goal',
  PROCESS: 'process',
  MUSIC: 'music',
  CHART: 'chart',
  TIMER: 'timer',
  OTHER: 'other'
};

export const TrashProvider = ({ children }) => {
  const isInitialized = useRef(false);
  
  // Initialize from localStorage
  const [trashItems, setTrashItems] = useState(() => {
    const stored = loadFromStorage(STORAGE_KEYS.TRASH_ITEMS);
    return stored !== null ? stored : [];
  });

  // Mark as initialized after first render
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Listen for trash-remove events from Canvas (drag and drop restore)
  useEffect(() => {
    const handleTrashRemove = (e) => {
      const { trashId } = e.detail;
      if (trashId) {
        setTrashItems(prev => prev.filter(item => item.id !== trashId));
      }
    };

    window.addEventListener('steward-trash-remove', handleTrashRemove);
    return () => {
      window.removeEventListener('steward-trash-remove', handleTrashRemove);
    };
  }, []);

  // Auto-save trash items
  useEffect(() => {
    if (isInitialized.current) {
      saveToStorage(STORAGE_KEYS.TRASH_ITEMS, trashItems);
    }
  }, [trashItems]);

  // Add item to trash
  const addToTrash = useCallback((item) => {
    const trashEntry = {
      id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: item.type || TRASH_TYPES.OTHER,
      name: item.name || 'Unnamed',
      originalData: item.data,
      sourceModule: item.sourceModule || 'unknown',
      deletedAt: new Date().toISOString(),
      metadata: item.metadata || {}
    };
    setTrashItems(prev => [trashEntry, ...prev]);
    return trashEntry.id;
  }, []);

  // Add window to trash (special helper) - with deduplication for windows
  const addWindowToTrash = useCallback((module) => {
    // NEVER add trash module to trash
    if (module.type === 'trash') {
      return null;
    }
    
    // Check for existing window of same type (deduplication for temporary closed windows)
    const existingWindow = trashItems.find(
      item => item.type === TRASH_TYPES.WINDOW && 
              item.metadata?.moduleType === module.type
    );
    
    if (existingWindow) {
      // Update timestamp of existing entry instead of creating new one
      setTrashItems(prev => prev.map(item => 
        item.id === existingWindow.id 
          ? { ...item, deletedAt: new Date().toISOString() }
          : item
      ));
      return existingWindow.id;
    }
    
    // Create new trash entry
    return addToTrash({
      type: TRASH_TYPES.WINDOW,
      name: getModuleLabel(module.type),
      data: module,
      sourceModule: 'workspace',
      metadata: {
        moduleType: module.type,
        position: module.position,
        size: module.size,
        zIndex: module.zIndex,
        pinMode: module.pinMode
      }
    });
  }, [addToTrash, trashItems]);

  // Add note to trash
  const addNoteToTrash = useCallback((note) => {
    return addToTrash({
      type: TRASH_TYPES.NOTE,
      name: note.title || 'Poznámka bez názvu',
      data: note,
      sourceModule: 'notes',
      metadata: {
        content: note.content?.substring(0, 100) + '...'
      }
    });
  }, [addToTrash]);

  // Add project to trash
  const addProjectToTrash = useCallback((project) => {
    return addToTrash({
      type: TRASH_TYPES.PROJECT,
      name: project.name || 'Projekt bez názvu',
      data: project,
      sourceModule: 'projects',
      metadata: {
        status: project.status,
        tasksCount: project.tasks?.length || 0
      }
    });
  }, [addToTrash]);

  // Add person to trash
  const addPersonToTrash = useCallback((person) => {
    return addToTrash({
      type: TRASH_TYPES.PERSON,
      name: person.name || 'Osoba bez jména',
      data: person,
      sourceModule: 'people',
      metadata: {
        email: person.email,
        company: person.company
      }
    });
  }, [addToTrash]);

  // Add task to trash
  const addTaskToTrash = useCallback((task) => {
    return addToTrash({
      type: TRASH_TYPES.TASK,
      name: task.title || 'Úkol bez názvu',
      data: task,
      sourceModule: 'tasks',
      metadata: {
        completed: task.completed,
        priority: task.priority
      }
    });
  }, [addToTrash]);

  // Remove item from trash permanently
  const removeFromTrash = useCallback((trashId) => {
    setTrashItems(prev => prev.filter(item => item.id !== trashId));
  }, []);

  // Get item from trash (for restore)
  const getTrashItem = useCallback((trashId) => {
    return trashItems.find(item => item.id === trashId);
  }, [trashItems]);

  // Restore item and remove from trash
  const restoreFromTrash = useCallback((trashId) => {
    const item = getTrashItem(trashId);
    if (item) {
      removeFromTrash(trashId);
      return item;
    }
    return null;
  }, [getTrashItem, removeFromTrash]);

  // Clear all trash
  const emptyTrash = useCallback(() => {
    setTrashItems([]);
  }, []);

  // Get items by type
  const getItemsByType = useCallback((type) => {
    return trashItems.filter(item => item.type === type);
  }, [trashItems]);

  // Get trash stats
  const getTrashStats = useCallback(() => {
    return {
      total: trashItems.length,
      windows: trashItems.filter(i => i.type === TRASH_TYPES.WINDOW).length,
      notes: trashItems.filter(i => i.type === TRASH_TYPES.NOTE).length,
      projects: trashItems.filter(i => i.type === TRASH_TYPES.PROJECT).length,
      projectElements: trashItems.filter(i => i.type === TRASH_TYPES.PROJECT_ELEMENT).length,
      people: trashItems.filter(i => i.type === TRASH_TYPES.PERSON).length,
      tasks: trashItems.filter(i => i.type === TRASH_TYPES.TASK).length,
      goals: trashItems.filter(i => i.type === TRASH_TYPES.GOAL).length,
      processes: trashItems.filter(i => i.type === TRASH_TYPES.PROCESS).length,
      charts: trashItems.filter(i => i.type === TRASH_TYPES.CHART).length,
      timers: trashItems.filter(i => i.type === TRASH_TYPES.TIMER).length,
      music: trashItems.filter(i => i.type === TRASH_TYPES.MUSIC).length,
      other: trashItems.filter(i => i.type === TRASH_TYPES.OTHER).length
    };
  }, [trashItems]);

  const value = {
    trashItems,
    addToTrash,
    addWindowToTrash,
    addNoteToTrash,
    addProjectToTrash,
    addPersonToTrash,
    addTaskToTrash,
    removeFromTrash,
    getTrashItem,
    restoreFromTrash,
    emptyTrash,
    getItemsByType,
    getTrashStats,
    TRASH_TYPES
  };

  return (
    <TrashContext.Provider value={value}>
      {children}
    </TrashContext.Provider>
  );
};

// Helper function for module labels
function getModuleLabel(type) {
  const labels = {
    chart: 'Graf',
    timer: 'Časovač',
    notes: 'Poznámky',
    goals: 'Cíle',
    processes: 'Procesy',
    projects: 'Projekty',
    tasks: 'Úkoly',
    calendar: 'Kalendář',
    music: 'Hudba',
    people: 'Lidi',
    trash: 'Koš'
  };
  return labels[type] || type;
}

export default TrashContext;
