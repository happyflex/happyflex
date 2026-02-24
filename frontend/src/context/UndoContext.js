/**
 * UndoContext
 * 
 * Global Undo/Redo system for STEWARD workspace.
 * Manages undo stack across all modules and actions.
 * 
 * Features:
 * - Single undo stack (max 50 entries)
 * - Redo stack prepared but not keyboard-bound
 * - Defensive guards for missing entities, null storage
 * - Uses existing CRUD pipelines for undo operations
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '../hooks/use-toast';

const UndoContext = createContext(null);

// Configuration
const MAX_UNDO_STACK_SIZE = 50;

/**
 * UndoEntry structure:
 * {
 *   id: string;
 *   label: string;           // Human-readable action description
 *   ts: number;              // Timestamp
 *   undo: () => void | Promise<void>;
 *   redo?: () => void | Promise<void>;
 * }
 */

export const UndoProvider = ({ children }) => {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const isUndoingRef = useRef(false); // Lock to prevent spam
  
  /**
   * Push a new undo entry to the stack
   * Clears redo stack on new action
   */
  const push = useCallback((entry) => {
    if (!entry || typeof entry.undo !== 'function') {
      console.warn('UndoManager: Invalid undo entry', entry);
      return;
    }
    
    const fullEntry = {
      id: entry.id || `undo-${Date.now()}`,
      label: entry.label || 'Akce',
      ts: Date.now(),
      undo: entry.undo,
      redo: entry.redo
    };
    
    setUndoStack(prev => {
      const newStack = [...prev, fullEntry];
      // FIFO drop oldest if exceeding max size
      if (newStack.length > MAX_UNDO_STACK_SIZE) {
        return newStack.slice(-MAX_UNDO_STACK_SIZE);
      }
      return newStack;
    });
    
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);
  
  /**
   * Check if undo is possible
   */
  const canUndo = useCallback(() => {
    return undoStack.length > 0 && !isUndoingRef.current;
  }, [undoStack.length]);
  
  /**
   * Check if redo is possible
   */
  const canRedo = useCallback(() => {
    return redoStack.length > 0 && !isUndoingRef.current;
  }, [redoStack.length]);
  
  /**
   * Execute the last undo action
   */
  const undoLast = useCallback(async () => {
    if (!canUndo()) return false;
    
    // Lock to prevent spam
    if (isUndoingRef.current) return false;
    isUndoingRef.current = true;
    
    try {
      // Pop last entry
      const lastEntry = undoStack[undoStack.length - 1];
      
      if (!lastEntry) {
        isUndoingRef.current = false;
        return false;
      }
      
      // Remove from undo stack
      setUndoStack(prev => prev.slice(0, -1));
      
      // Execute undo
      try {
        await lastEntry.undo();
        
        // Move to redo stack if redo function exists
        if (lastEntry.redo) {
          setRedoStack(prev => [...prev, lastEntry]);
        }
        
        // Show feedback toast
        toast({
          title: 'Vráceno',
          description: lastEntry.label,
          duration: 2000
        });
        
        return true;
      } catch (undoError) {
        console.error('UndoManager: Undo execution failed', undoError);
        toast({
          title: 'Chyba při vracení',
          description: 'Akci se nepodařilo vrátit',
          variant: 'destructive',
          duration: 3000
        });
        return false;
      }
    } finally {
      // Release lock after short delay (debounce)
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 100);
    }
  }, [canUndo, undoStack]);
  
  /**
   * Execute redo (prepared but not keyboard-bound)
   */
  const redoLast = useCallback(async () => {
    if (!canRedo()) return false;
    
    if (isUndoingRef.current) return false;
    isUndoingRef.current = true;
    
    try {
      const lastEntry = redoStack[redoStack.length - 1];
      
      if (!lastEntry || !lastEntry.redo) {
        isUndoingRef.current = false;
        return false;
      }
      
      // Remove from redo stack
      setRedoStack(prev => prev.slice(0, -1));
      
      try {
        await lastEntry.redo();
        
        // Move back to undo stack
        setUndoStack(prev => [...prev, lastEntry]);
        
        toast({
          title: 'Obnoveno',
          description: lastEntry.label,
          duration: 2000
        });
        
        return true;
      } catch (redoError) {
        console.error('UndoManager: Redo execution failed', redoError);
        return false;
      }
    } finally {
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 100);
    }
  }, [canRedo, redoStack]);
  
  /**
   * Clear all stacks
   */
  const clearAll = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);
  
  /**
   * Get current stack sizes (for debugging)
   */
  const getStackInfo = useCallback(() => ({
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    lastUndoLabel: undoStack.length > 0 ? undoStack[undoStack.length - 1].label : null
  }), [undoStack, redoStack]);

  const value = {
    push,
    canUndo,
    canRedo,
    undoLast,
    redoLast,
    clearAll,
    getStackInfo,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
};

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
};

// ============================================================================
// HELPER HOOKS FOR COMMON UNDO PATTERNS
// ============================================================================

/**
 * Helper to create undo entry for entity update (rename, edit)
 */
export const createUpdateUndoEntry = ({
  entityType,
  entityId,
  prevData,
  newData,
  label,
  updateFn,
  getEntityFn
}) => ({
  id: `update-${entityType}-${entityId}-${Date.now()}`,
  label: label || `Upravit ${entityType}`,
  undo: () => {
    // Guard: check if entity still exists
    const entity = getEntityFn ? getEntityFn(entityId) : null;
    if (getEntityFn && !entity) {
      console.warn(`UndoManager: Entity ${entityType}:${entityId} not found, skipping undo`);
      return;
    }
    updateFn(entityId, prevData);
  },
  redo: () => {
    updateFn(entityId, newData);
  }
});

/**
 * Helper to create undo entry for entity creation
 */
export const createCreateUndoEntry = ({
  entityType,
  entityId,
  label,
  deleteFn
}) => ({
  id: `create-${entityType}-${entityId}-${Date.now()}`,
  label: label || `Vytvořit ${entityType}`,
  undo: () => {
    // Undo creation = delete
    deleteFn(entityId);
  }
});

/**
 * Helper to create undo entry for entity deletion
 */
export const createDeleteUndoEntry = ({
  entityType,
  entityId,
  deletedData,
  label,
  restoreFn
}) => ({
  id: `delete-${entityType}-${entityId}-${Date.now()}`,
  label: label || `Smazat ${entityType}`,
  undo: () => {
    // Undo deletion = restore
    if (!deletedData) {
      console.warn(`UndoManager: No data to restore for ${entityType}:${entityId}`);
      return;
    }
    restoreFn(deletedData);
  }
});

export default UndoContext;
