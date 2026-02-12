import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

// Detect what's under the cursor
const detectTarget = (element, modules, deferredModules) => {
  if (!element) return { type: 'empty', data: null };
  
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
  
  const { modules, deferredModules } = useWorkspace();

  // Handle Alt key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') {
        e.preventDefault();
        altPressedRef.current = true;
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        altPressedRef.current = false;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
        
        setTarget(detectedTarget);
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
        return;
      }
      
      // Click outside to close
      if (isOpen && !e.target.closest('.command-wheel')) {
        setIsOpen(false);
      }
    };
    
    // Use capture phase to intercept clicks
    window.addEventListener('click', handleClick, true);
    
    return () => {
      window.removeEventListener('click', handleClick, true);
    };
  }, [isOpen, modules, deferredModules]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    position,
    target,
    close
  };
};

export default useCommandWheel;
