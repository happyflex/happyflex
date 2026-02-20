import React, { createContext, useContext, useCallback, useRef } from 'react';
import { toast } from '../hooks/use-toast';

/**
 * ItemActionContext - Centrální adapter pro Mouse Ring item mode
 * 
 * Architektura:
 * - Mouse Ring nevolá moduly přímo
 * - Každý modul registruje handlery pro své item typy
 * - Ring volá executeItemAction s command objektem
 * - Context routuje command na správný handler
 */

const ItemActionContext = createContext();

export const useItemActions = () => {
  const context = useContext(ItemActionContext);
  if (!context) {
    throw new Error('useItemActions must be used within ItemActionProvider');
  }
  return context;
};

// Standard item actions
export const ITEM_ACTIONS = {
  DELETE: 'delete',
  DUPLICATE: 'duplicate',
  CONVERT_TO_TASK: 'convert_to_task',
  CREATE_SUBPROJECT: 'create_subproject',
  OPEN_PLANNING: 'open_planning',
  OPEN_PROFILE: 'open_profile',
  EDIT: 'edit',
  TOGGLE_COMPLETE: 'toggle_complete'
};

// Item types
export const ITEM_TYPES = {
  NOTE: 'note',
  GOAL: 'goal',
  PERSON: 'person',
  TASK: 'task',
  PROCESS: 'process',
  PROJECT: 'project',
  SUBPROJECT: 'subproject',
  PLAN: 'plan',
  CALENDAR_EVENT: 'calendar_event'
};

// Get available actions for item type
export const getItemActions = (itemType) => {
  const commonActions = [
    { id: ITEM_ACTIONS.DUPLICATE, label: 'Duplikovat', icon: 'Copy' },
    { id: ITEM_ACTIONS.DELETE, label: 'Odstranit', icon: 'Trash2', danger: true }
  ];
  
  switch (itemType) {
    case ITEM_TYPES.NOTE:
      return [
        { id: ITEM_ACTIONS.CONVERT_TO_TASK, label: 'Převést na úkol', icon: 'ListChecks' },
        ...commonActions
      ];
    
    case ITEM_TYPES.PROJECT:
    case ITEM_TYPES.SUBPROJECT:
      return [
        { id: ITEM_ACTIONS.CREATE_SUBPROJECT, label: 'Nový podprojekt', icon: 'FolderPlus' },
        ...commonActions
      ];
    
    case ITEM_TYPES.GOAL:
      return [
        { id: ITEM_ACTIONS.OPEN_PLANNING, label: 'Otevřít plánování', icon: 'Map' },
        ...commonActions
      ];
    
    case ITEM_TYPES.PERSON:
      return [
        { id: ITEM_ACTIONS.OPEN_PROFILE, label: 'Otevřít profil', icon: 'User' },
        ...commonActions
      ];
    
    case ITEM_TYPES.TASK:
      return [
        { id: ITEM_ACTIONS.TOGGLE_COMPLETE, label: 'Dokončit/Obnovit', icon: 'CheckCircle2' },
        ...commonActions
      ];
    
    case ITEM_TYPES.PROCESS:
      return [
        { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' },
        ...commonActions
      ];
    
    default:
      return commonActions;
  }
};

export const ItemActionProvider = ({ children }) => {
  // Registry of handlers per module
  const handlersRef = useRef(new Map());
  
  /**
   * Register handlers for a module
   * @param {string} moduleType - e.g., 'notes', 'goals', 'people'
   * @param {Object} handlers - Map of action handlers { delete: fn, duplicate: fn, ... }
   */
  const registerHandlers = useCallback((moduleType, handlers) => {
    handlersRef.current.set(moduleType, handlers);
    return () => {
      handlersRef.current.delete(moduleType);
    };
  }, []);
  
  /**
   * Execute an action on an item
   * @param {Object} command - { scope, itemType, itemId, parentContext, moduleType, action, source }
   * @returns {boolean} - Whether action was executed
   */
  const executeItemAction = useCallback((command) => {
    const {
      scope = 'item',
      itemType,
      itemId,
      parentContext,
      moduleType,
      action,
      source = 'mouseRing'
    } = command;
    
    // Validate command
    if (!itemType || !itemId || !action) {
      console.error('ItemActionContext: Invalid command', command);
      toast({
        title: 'Chyba',
        description: 'Neplatný příkaz pro položku',
        variant: 'destructive'
      });
      return false;
    }
    
    // Find handler
    const handlers = handlersRef.current.get(moduleType);
    
    if (!handlers) {
      console.warn(`ItemActionContext: No handlers registered for module "${moduleType}"`);
      toast({
        title: 'Akce nedostupná',
        description: 'Modul nepodporuje tuto akci',
        variant: 'destructive'
      });
      return false;
    }
    
    const handler = handlers[action];
    
    if (!handler) {
      console.warn(`ItemActionContext: No handler for action "${action}" in module "${moduleType}"`);
      toast({
        title: 'Akce nedostupná',
        description: `Akce "${action}" není podporována`,
        variant: 'destructive'
      });
      return false;
    }
    
    // Execute handler with full payload
    try {
      const payload = {
        itemType,
        itemId,
        parentContext,
        moduleType,
        source
      };
      
      handler(payload);
      return true;
    } catch (error) {
      console.error('ItemActionContext: Handler error', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se provést akci',
        variant: 'destructive'
      });
      return false;
    }
  }, []);
  
  /**
   * Check if a handler exists for given module and action
   */
  const hasHandler = useCallback((moduleType, action) => {
    const handlers = handlersRef.current.get(moduleType);
    return handlers && typeof handlers[action] === 'function';
  }, []);
  
  const value = {
    registerHandlers,
    executeItemAction,
    hasHandler,
    ITEM_ACTIONS,
    ITEM_TYPES
  };
  
  return (
    <ItemActionContext.Provider value={value}>
      {children}
    </ItemActionContext.Provider>
  );
};

export default ItemActionContext;
