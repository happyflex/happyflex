import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { toast } from '../hooks/use-toast';

/**
 * ItemActionContext - Centrální Item Registry pro Mouse Ring Item Mode
 * 
 * Architektura:
 * - Centrální ItemRegistry pro registraci itemTypes a jejich CRUD API
 * - Auto-enable: Každý modul s data-steward-item automaticky funguje
 * - Graceful degradation: Ring nikdy nespadne
 * - Mouse Ring nezná konkrétní moduly - pracuje pouze s registry
 * - Event delegation na globální úrovni
 */

const ItemActionContext = createContext();

export const useItemActions = () => {
  const context = useContext(ItemActionContext);
  if (!context) {
    throw new Error('useItemActions must be used within ItemActionProvider');
  }
  return context;
};

// ============================================================================
// STANDARD ITEM ACTIONS
// ============================================================================
export const ITEM_ACTIONS = {
  DELETE: 'delete',
  DUPLICATE: 'duplicate',
  EDIT: 'edit',
  CONVERT_TO_TASK: 'convert_to_task',
  CREATE_SUBPROJECT: 'create_subproject',
  OPEN_PLANNING: 'open_planning',
  OPEN_PROFILE: 'open_profile',
  OPEN_DETAIL: 'open_detail',
  TOGGLE_COMPLETE: 'toggle_complete',
  ARCHIVE: 'archive'
};

// ============================================================================
// ITEM TYPES
// ============================================================================
export const ITEM_TYPES = {
  NOTE: 'note',
  GOAL: 'goal',
  PLAN: 'plan',
  PERSON: 'person',
  TASK: 'task',
  PROCESS: 'process',
  PROJECT: 'project',
  SUBPROJECT: 'subproject',
  CALENDAR_EVENT: 'calendar_event',
  MUSIC_TRACK: 'music_track',
  PLAYLIST: 'playlist',
  FILE: 'file',
  TIMER_SESSION: 'timer_session'
};

// ============================================================================
// DEFAULT ACTION DEFINITIONS BY ITEM TYPE
// ============================================================================
const DEFAULT_ITEM_ACTIONS = {
  // Universal actions available for ALL item types
  _universal: [
    { id: ITEM_ACTIONS.DUPLICATE, label: 'Duplikovat', icon: 'Copy' },
    { id: ITEM_ACTIONS.DELETE, label: 'Odstranit', icon: 'Trash2', danger: true }
  ],
  
  // Type-specific actions (merged with universal)
  [ITEM_TYPES.NOTE]: [
    { id: ITEM_ACTIONS.CONVERT_TO_TASK, label: 'Převést na úkol', icon: 'ListChecks' },
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.GOAL]: [
    { id: ITEM_ACTIONS.OPEN_PLANNING, label: 'Otevřít plánování', icon: 'Map' },
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.PLAN]: [
    { id: ITEM_ACTIONS.OPEN_DETAIL, label: 'Otevřít canvas', icon: 'Layout' },
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.PERSON]: [
    { id: ITEM_ACTIONS.OPEN_PROFILE, label: 'Otevřít profil', icon: 'User' }
  ],
  
  [ITEM_TYPES.TASK]: [
    { id: ITEM_ACTIONS.TOGGLE_COMPLETE, label: 'Dokončit/Obnovit', icon: 'CheckCircle2' },
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.PROCESS]: [
    { id: ITEM_ACTIONS.OPEN_DETAIL, label: 'Otevřít canvas', icon: 'GitBranch' },
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.PROJECT]: [
    { id: ITEM_ACTIONS.CREATE_SUBPROJECT, label: 'Nový podprojekt', icon: 'FolderPlus' },
    { id: ITEM_ACTIONS.OPEN_DETAIL, label: 'Otevřít projekt', icon: 'ExternalLink' }
  ],
  
  [ITEM_TYPES.SUBPROJECT]: [
    { id: ITEM_ACTIONS.CREATE_SUBPROJECT, label: 'Nový podprojekt', icon: 'FolderPlus' },
    { id: ITEM_ACTIONS.OPEN_DETAIL, label: 'Otevřít', icon: 'ExternalLink' }
  ],
  
  [ITEM_TYPES.CALENDAR_EVENT]: [
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.MUSIC_TRACK]: [
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.PLAYLIST]: [
    { id: ITEM_ACTIONS.EDIT, label: 'Upravit', icon: 'Edit2' }
  ],
  
  [ITEM_TYPES.FILE]: [
    { id: ITEM_ACTIONS.OPEN_DETAIL, label: 'Otevřít', icon: 'ExternalLink' }
  ],
  
  [ITEM_TYPES.TIMER_SESSION]: []
};

/**
 * Get available actions for an item type
 * Merges type-specific actions with universal actions
 * Returns only universal actions if type is unknown
 */
export const getItemActions = (itemType, registeredActions = null) => {
  const universalActions = DEFAULT_ITEM_ACTIONS._universal;
  
  // If custom actions registered for this type, use them
  if (registeredActions && registeredActions.length > 0) {
    return [...registeredActions, ...universalActions];
  }
  
  // Get type-specific actions
  const typeActions = DEFAULT_ITEM_ACTIONS[itemType] || [];
  
  return [...typeActions, ...universalActions];
};

// ============================================================================
// ITEM ACTION PROVIDER
// ============================================================================
export const ItemActionProvider = ({ children }) => {
  /**
   * Central Item Registry
   * Maps itemType -> { moduleType, supports, api }
   */
  const itemRegistryRef = useRef(new Map());
  
  /**
   * Module Handlers Registry
   * Maps moduleType -> { action: handler }
   */
  const handlersRef = useRef(new Map());
  
  /**
   * Custom Actions Registry
   * Maps itemType -> [custom action definitions]
   */
  const customActionsRef = useRef(new Map());

  // ==========================================================================
  // REGISTRY METHODS
  // ==========================================================================
  
  /**
   * Register an item type in the central registry
   * @param {Object} config - { itemType, moduleType, supports, api, customActions }
   */
  const registerItemType = useCallback((config) => {
    const { 
      itemType, 
      moduleType, 
      supports = ['delete', 'duplicate'], 
      api = {},
      customActions = []
    } = config;
    
    if (!itemType || !moduleType) {
      console.warn('ItemRegistry: itemType and moduleType are required');
      return () => {};
    }
    
    // Register in item registry
    itemRegistryRef.current.set(itemType, {
      moduleType,
      supports,
      api
    });
    
    // Register custom actions if provided
    if (customActions.length > 0) {
      customActionsRef.current.set(itemType, customActions);
    }
    
    // Return unregister function
    return () => {
      itemRegistryRef.current.delete(itemType);
      customActionsRef.current.delete(itemType);
    };
  }, []);
  
  /**
   * Register handlers for a module (backward compatible)
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
   * Quick registration: itemType + moduleType + handlers in one call
   */
  const register = useCallback((config) => {
    const { itemType, moduleType, handlers = {}, supports, customActions } = config;
    
    // Auto-detect supports from handlers
    const autoSupports = supports || Object.keys(handlers);
    
    // Register item type
    const unregisterType = registerItemType({
      itemType,
      moduleType,
      supports: autoSupports,
      customActions
    });
    
    // Register handlers
    const existingHandlers = handlersRef.current.get(moduleType) || {};
    handlersRef.current.set(moduleType, { ...existingHandlers, ...handlers });
    
    return () => {
      unregisterType();
      // Note: We don't fully remove handlers as other item types might use same module
    };
  }, [registerItemType]);

  // ==========================================================================
  // ACTION EXECUTION
  // ==========================================================================
  
  /**
   * Execute an action on an item
   * @param {Object} command - { scope, itemType, itemId, parentContext, moduleType, action, source }
   * @returns {boolean} - Whether action was executed
   */
  const executeItemAction = useCallback((command) => {
    const {
      itemType,
      itemId,
      parentContext,
      moduleType,
      action,
      source = 'mouseRing'
    } = command;
    
    // Validate required fields
    if (!itemType || !itemId || !action) {
      console.warn('ItemActionContext: Invalid command - missing required fields', command);
      return false;
    }
    
    // Resolve moduleType from registry if not provided
    const resolvedModuleType = moduleType || itemRegistryRef.current.get(itemType)?.moduleType;
    
    // Try to find handler in this order:
    // 1. Module-specific handler
    // 2. Item type API from registry
    // 3. Graceful degradation (show toast, don't crash)
    
    const handlers = handlersRef.current.get(resolvedModuleType);
    const registryEntry = itemRegistryRef.current.get(itemType);
    
    // Try module handler first
    if (handlers && typeof handlers[action] === 'function') {
      try {
        handlers[action]({
          itemType,
          itemId,
          parentContext,
          moduleType: resolvedModuleType,
          source
        });
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
    }
    
    // Try registry API
    if (registryEntry?.api && typeof registryEntry.api[action] === 'function') {
      try {
        registryEntry.api[action]({
          itemType,
          itemId,
          parentContext,
          moduleType: resolvedModuleType,
          source
        });
        return true;
      } catch (error) {
        console.error('ItemActionContext: Registry API error', error);
        toast({
          title: 'Chyba',
          description: 'Nepodařilo se provést akci',
          variant: 'destructive'
        });
        return false;
      }
    }
    
    // Graceful degradation - no handler found
    console.info(`ItemActionContext: No handler for action "${action}" on itemType "${itemType}"`);
    toast({
      title: 'Akce nedostupná',
      description: `Tato akce není pro tento typ položky podporována`,
    });
    return false;
  }, []);

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================
  
  /**
   * Check if an action is supported for given itemType
   */
  const isActionSupported = useCallback((itemType, action, moduleType = null) => {
    const resolvedModuleType = moduleType || itemRegistryRef.current.get(itemType)?.moduleType;
    
    // Check module handlers
    const handlers = handlersRef.current.get(resolvedModuleType);
    if (handlers && typeof handlers[action] === 'function') {
      return true;
    }
    
    // Check registry supports
    const registryEntry = itemRegistryRef.current.get(itemType);
    if (registryEntry?.supports?.includes(action)) {
      return true;
    }
    
    // Check registry API
    if (registryEntry?.api && typeof registryEntry.api[action] === 'function') {
      return true;
    }
    
    return false;
  }, []);
  
  /**
   * Get available actions for an item, filtered by what's actually supported
   */
  const getAvailableActions = useCallback((itemType, moduleType = null) => {
    const customActions = customActionsRef.current.get(itemType);
    const allActions = getItemActions(itemType, customActions);
    
    // Filter to only supported actions
    return allActions.filter(action => 
      isActionSupported(itemType, action.id, moduleType)
    );
  }, [isActionSupported]);
  
  /**
   * Check if a handler exists (backward compatible)
   */
  const hasHandler = useCallback((moduleType, action) => {
    const handlers = handlersRef.current.get(moduleType);
    return handlers && typeof handlers[action] === 'function';
  }, []);
  
  /**
   * Get registry info for an item type
   */
  const getItemTypeInfo = useCallback((itemType) => {
    return itemRegistryRef.current.get(itemType) || null;
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================
  
  const value = useMemo(() => ({
    // Registration
    register,
    registerItemType,
    registerHandlers,
    
    // Execution
    executeItemAction,
    
    // Query
    isActionSupported,
    getAvailableActions,
    hasHandler,
    getItemTypeInfo,
    
    // Constants
    ITEM_ACTIONS,
    ITEM_TYPES
  }), [
    register,
    registerItemType,
    registerHandlers,
    executeItemAction,
    isActionSupported,
    getAvailableActions,
    hasHandler,
    getItemTypeInfo
  ]);
  
  return (
    <ItemActionContext.Provider value={value}>
      {children}
    </ItemActionContext.Provider>
  );
};

// Re-export for convenience
export { ITEM_ACTIONS as ItemActions, ITEM_TYPES as ItemTypes };
export default ItemActionContext;
