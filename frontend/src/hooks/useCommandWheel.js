import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

/**
 * Build hierarchical path from scope root to target item
 * Walks up the DOM collecting data-steward-item elements
 */
const buildParentPath = (itemElement) => {
  const path = [];
  let current = itemElement;
  
  // Collect all ancestors with data-steward-item up to scope root
  while (current) {
    if (current.dataset && current.dataset.stewardItem && current.dataset.itemId) {
      path.unshift({
        type: current.dataset.stewardItem,
        id: current.dataset.itemId,
        moduleType: current.dataset.moduleType || null
      });
    }
    
    // Stop at scope root
    if (current.dataset && current.dataset.moduleScopeRoot === 'true') {
      break;
    }
    
    current = current.parentElement;
  }
  
  return path;
};

/**
 * Find nearest scope root ancestor
 */
const findScopeRoot = (element) => {
  let current = element;
  while (current) {
    if (current.dataset && current.dataset.moduleScopeRoot === 'true') {
      return {
        scopeId: current.dataset.scopeId || null,
        scopeType: current.dataset.scopeType || null,
        moduleType: current.dataset.moduleType || null
      };
    }
    current = current.parentElement;
  }
  return null;
};

/**
 * Detect what's under the cursor
 * Priority: item > module-content > window > canvas-block > canvas-area > empty
 */
const detectTarget = (element, modules, deferredModules) => {
  if (!element) return { type: 'empty', data: null };
  
  // === ITEM MODE: Check for item with data-steward-item attribute ===
  const itemElement = element.closest('[data-steward-item][data-item-id]');
  if (itemElement) {
    const itemType = itemElement.dataset.stewardItem;
    const itemId = itemElement.dataset.itemId;
    const parentId = itemElement.dataset.parentId || null;
    const moduleType = itemElement.dataset.moduleType || null;
    const scopeId = itemElement.dataset.scopeId || null;
    
    // Build hierarchical path (deep resolution)
    const path = buildParentPath(itemElement);
    
    // Find scope root for context
    const scopeRoot = findScopeRoot(itemElement);
    
    // Resolve moduleType from ancestors if not on item
    let resolvedModuleType = moduleType;
    if (!resolvedModuleType) {
      // Try to find moduleType from ancestors
      let ancestor = itemElement.parentElement;
      while (ancestor && !resolvedModuleType) {
        if (ancestor.dataset && ancestor.dataset.moduleType) {
          resolvedModuleType = ancestor.dataset.moduleType;
        }
        ancestor = ancestor.parentElement;
      }
    }
    
    // Also get parent module window for context
    const moduleElement = itemElement.closest('[data-module-id]');
    const moduleId = moduleElement?.dataset.moduleId;
    const module = modules.find(m => m.id === moduleId);
    
    // Build parentContext with full hierarchy info
    const parentContext = {
      scopeId: scopeId || scopeRoot?.scopeId || null,
      scopeType: scopeRoot?.scopeType || null,
      path: path.length > 1 ? path.slice(0, -1) : [], // Ancestors only (exclude self)
      fullPath: path, // Include self
      parentId: parentId,
      // Legacy support
      raw: {
        scopeRoot,
        moduleType: resolvedModuleType
      }
    };
    
    return {
      type: 'item',
      itemType,
      itemId,
      parentId,
      moduleType: resolvedModuleType || module?.type,
      moduleId,
      parentContext,
      data: module
    };
  }
  
  // Check if it's a canvas module (in RightSidebar)
  const canvasItem = element.closest('[data-canvas-module-id]');
  if (canvasItem) {
    const moduleId = canvasItem.dataset.canvasModuleId;
    const module = deferredModules.find(m => m.id === moduleId);
    return { type: 'canvas-block', data: module };
  }
  
  // Check if it's a workspace module/window
  const moduleElement = element.closest('[data-module-id]');
  if (moduleElement) {
    const moduleId = moduleElement.dataset.moduleId;
    const module = modules.find(m => m.id === moduleId);
    
    // Check if cursor is over specific content type
    const moduleContent = element.closest('.module-content');
    if (moduleContent && module) {
      return { type: 'module-content', data: module, contentType: module.type };
    }
    
    return { type: 'window', data: module };
  }
  
  // Check if it's the right sidebar (CANVAS area)
  const sidebar = element.closest('[data-sidebar="canvas"]');
  if (sidebar) {
    return { type: 'canvas-area', data: null };
  }
  
  // Check if it's the workspace/canvas area
  const canvas = element.closest('[data-workspace="main"]');
  if (canvas) {
    return { type: 'empty', data: null };
  }
  
  return { type: 'other', data: null };
};

export const useCommandWheel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [target, setTarget] = useState({ type: 'empty', data: null });
  const altPressedRef = useRef(false);
  const blockedItemRef = useRef(null); // Track item that should have drag blocked
  const scanTimeoutRef = useRef(null); // Track scan animation timeout
  const scanTriggeredRef = useRef(false); // Guard against re-triggering scan
  
  const { modules, deferredModules } = useWorkspace();

  // Handle Alt key press + Target Acquisition Mode + HUD Mode
  // Note: This effect has NO dependencies to prevent re-running on state changes
  useEffect(() => {
    const enableTargetMode = () => {
      // Guard: If scan already triggered this session, don't re-trigger
      if (scanTriggeredRef.current) {
        return;
      }
      
      document.body.classList.add('steward-alt-target-visible');
      document.body.classList.add('steward-item-mode-active');
      
      // Trigger scan animation (one-shot)
      document.body.classList.add('steward-item-mode-scan');
      scanTriggeredRef.current = true;
      
      // Remove scan class after animation completes
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        document.body.classList.remove('steward-item-mode-scan');
      }, 950);
    };
    
    const disableTargetMode = () => {
      document.body.classList.remove('steward-alt-target-visible');
      document.body.classList.remove('steward-item-mode-active');
      document.body.classList.remove('steward-item-mode-scan');
      scanTriggeredRef.current = false; // Reset for next ALT press
      
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        altPressedRef.current = true;
        enableTargetMode();
      }
      // Note: ESC is handled in CommandWheel component via close()
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        altPressedRef.current = false;
        // Only disable if ring is not open (check DOM instead of state)
        if (!document.querySelector('.command-wheel')) {
          disableTargetMode();
        }
        blockedItemRef.current = null;
      }
    };
    
    const handleBlur = () => {
      altPressedRef.current = false;
      disableTargetMode();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.body.classList.remove('steward-alt-target-visible');
      document.body.classList.remove('steward-item-mode-active');
      document.body.classList.remove('steward-item-mode-scan');
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - never re-runs

  // Handle mouse click while Alt is pressed
  useEffect(() => {
    // Helper to cleanup HUD when ring closes and ALT not held
    const cleanupHudIfNeeded = () => {
      if (!altPressedRef.current) {
        document.body.classList.remove('steward-alt-target-visible');
        document.body.classList.remove('steward-item-mode-active');
        document.body.classList.remove('steward-item-mode-scan');
        scanTriggeredRef.current = false;
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
          scanTimeoutRef.current = null;
        }
      }
    };
    
    const handleClick = (e) => {
      // Alt + Click to open
      if (altPressedRef.current && !isOpen) {
        e.preventDefault();
        e.stopPropagation();
        
        const detectedTarget = detectTarget(e.target, modules, deferredModules);
        
        // Don't open for 'other' targets (like header, toolbar)
        if (detectedTarget.type === 'other') return;
        
        // If item mode, block drag for this item
        if (detectedTarget.type === 'item' && detectedTarget.itemId) {
          blockedItemRef.current = detectedTarget.itemId;
        }
        
        setTarget(detectedTarget);
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
        return;
      }
      
      // Click outside to close
      if (isOpen && !e.target.closest('.command-wheel')) {
        setIsOpen(false);
        blockedItemRef.current = null;
        cleanupHudIfNeeded();
      }
    };
    
    // Block drag for specific item when Alt is pressed
    const handleMouseDown = (e) => {
      if (altPressedRef.current) {
        const itemElement = e.target.closest('[data-steward-item]');
        if (itemElement) {
          // Prevent drag initiation on item when Alt is pressed
          e.preventDefault();
        }
      }
    };
    
    // Use capture phase to intercept clicks
    window.addEventListener('click', handleClick, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [isOpen, modules, deferredModules]);

  // Central close function - handles HUD cleanup
  const close = useCallback(() => {
    setIsOpen(false);
    blockedItemRef.current = null;
    
    // HUD cleanup on ring close:
    // If ALT is not held, disable HUD + highlight
    if (!altPressedRef.current) {
      document.body.classList.remove('steward-alt-target-visible');
      document.body.classList.remove('steward-item-mode-active');
      document.body.classList.remove('steward-item-mode-scan');
      scanTriggeredRef.current = false;
      
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }
    // If ALT is still held, HUD stays active (user can continue targeting)
  }, []);

  // Check if drag should be blocked for specific item
  const isDragBlockedFor = useCallback((itemId) => {
    return blockedItemRef.current === itemId;
  }, []);

  return {
    isOpen,
    position,
    target,
    close,
    isDragBlockedFor
  };
};

export default useCommandWheel;
