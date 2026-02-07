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

  const addModule = useCallback((type, position = null) => {
    const newModule = {
      id: `module-${Date.now()}`,
      type,
      position: position || {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      size: { width: 400, height: 300 },
      zIndex: modules.length
    };
    setModules(prev => [...prev, newModule]);
  }, [modules.length]);

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
    addModule,
    removeModule,
    updateModulePosition,
    updateModuleSize,
    bringToFront,
    deferModule,
    restoreModule,
    addNote,
    updateNote,
    deleteNote,
    addTask,
    toggleTask,
    deleteTask,
    setTimerActive,
    setTimerSeconds
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
