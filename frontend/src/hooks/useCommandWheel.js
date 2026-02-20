import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

/**
 * Detect what's under the cursor
 * Priority: item > module-content > window > canvas-block > canvas-area > empty
 */
const detectTarget = (element, modules, deferredModules) => {
  if (!element) return { type: 'empty', data: null };
  
  // === ITEM MODE: Check for item with data-steward-item attribute ===
  const itemElement = element.closest('[data-steward-item]');
  if (itemElement) {
    const itemType = itemElement.dataset.stewardItem;
    const itemId = itemElement.dataset.itemId;
    const parentId = itemElement.dataset.parentId || null;
    const moduleType = itemElement.dataset.moduleType || null;
    
    // Also get parent module for context
    const moduleElement = itemElement.closest('[data-module-id]');
    const moduleId = moduleElement?.dataset.moduleId;
    const module = modules.find(m => m.id === moduleId);
    
    return {
      type: 'item',
      itemType,
      itemId,
      parentId,
      moduleType: moduleType || module?.type,
      moduleId,
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
  
  const { modules, deferredModules } = useWorkspace();

  // Handle Alt key press + Target Acquisition Mode + HUD Mode
  useEffect(() => {
    const enableTargetMode = () => {
      // Guard: If already active, don't re-trigger (handles key repeat)
      if (document.body.classList.contains('steward-item-mode-active')) {
        return;
      }
      
      document.body.classList.add('steward-alt-target-visible');
      document.body.classList.add('steward-item-mode-active');
      
      // Trigger scan animation (one-shot)
      document.body.classList.add('steward-item-mode-scan');
      
      // Remove scan class after animation completes (prevent re-trigger)
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        document.body.classList.remove('steward-item-mode-scan');
      }, 950); // Slightly longer than animation duration
    };
    
    const disableTargetMode = () => {
      document.body.classList.remove('steward-alt-target-visible');
      document.body.classList.remove('steward-item-mode-active');
      document.body.classList.remove('steward-item-mode-scan');
      
      // Clear timeout if deactivating early
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        altPressedRef.current = true;
        // Enable Target Acquisition Mode + HUD (with guard against key repeat)
        enableTargetMode();
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        blockedItemRef.current = null;
        disableTargetMode();
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        altPressedRef.current = false;
        // Disable Target Acquisition Mode (unless ring is open)
        if (!isOpen) {
          disableTargetMode();
        }
        // Clear drag block when Alt is released
        if (!isOpen) {
          blockedItemRef.current = null;
        }
      }
    };
    
    // Disable on window blur (safety)
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
      // Cleanup
      document.body.classList.remove('steward-alt-target-visible');
      document.body.classList.remove('steward-item-mode-active');
      document.body.classList.remove('steward-item-mode-scan');
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Handle mouse click while Alt is pressed
  useEffect(() => {
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

  const close = useCallback(() => {
    setIsOpen(false);
    blockedItemRef.current = null;
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
