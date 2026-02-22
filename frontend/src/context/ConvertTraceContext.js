/**
 * ConvertTraceContext
 * 
 * Manages Stark-style visual effects for the Convert system:
 * 1. Morph Trace Effect - Animation when converting objects
 * 2. Navigation Trace - Visual link when opening converted objects
 * 
 * Architecture:
 * - Single global overlay layer
 * - CSS transforms/opacity only (no layout changes)
 * - Self-cleaning effects (no memory leaks)
 * - Queue system to prevent effect overlap
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ConvertTraceContext = createContext(null);

// Effect queue configuration
const MAX_QUEUED_EFFECTS = 2;
const MORPH_PULSE_DURATION = 350; // ms
const TRACE_LINE_DURATION = 800; // ms
const MATERIALIZE_DURATION = 400; // ms
const NAV_TRACE_DURATION = 1000; // ms

export const ConvertTraceProvider = ({ children }) => {
  // Active effects state
  const [activeEffects, setActiveEffects] = useState([]);
  const effectQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const effectIdCounter = useRef(0);
  
  // Cleanup timeout refs
  const cleanupTimeouts = useRef(new Map());

  /**
   * Get element bounding rect by data-item-id
   */
  const getElementRect = useCallback((itemId, moduleType) => {
    // Try finding by item-id first
    let element = document.querySelector(`[data-item-id="${itemId}"]`);
    
    // Fallback: try finding within specific module
    if (!element && moduleType) {
      const moduleRoot = document.querySelector(`[data-module-type="${moduleType}"]`);
      if (moduleRoot) {
        element = moduleRoot.querySelector(`[data-item-id="${itemId}"]`);
      }
    }
    
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      element
    };
  }, []);

  /**
   * Check if element is in viewport
   */
  const isInViewport = useCallback((rect) => {
    if (!rect) return false;
    return (
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x <= window.innerWidth &&
      rect.y <= window.innerHeight
    );
  }, []);

  /**
   * Clean up an effect by ID
   */
  const cleanupEffect = useCallback((effectId) => {
    setActiveEffects(prev => prev.filter(e => e.id !== effectId));
    
    // Clear any pending timeout
    const timeout = cleanupTimeouts.current.get(effectId);
    if (timeout) {
      clearTimeout(timeout);
      cleanupTimeouts.current.delete(effectId);
    }
  }, []);

  /**
   * Process effect queue
   */
  const processQueue = useCallback(() => {
    if (isProcessingQueue.current || effectQueue.current.length === 0) return;
    
    isProcessingQueue.current = true;
    const effect = effectQueue.current.shift();
    
    if (effect) {
      setActiveEffects(prev => [...prev, effect]);
      
      // Schedule cleanup
      const timeout = setTimeout(() => {
        cleanupEffect(effect.id);
        isProcessingQueue.current = false;
        processQueue(); // Process next in queue
      }, effect.duration);
      
      cleanupTimeouts.current.set(effect.id, timeout);
    } else {
      isProcessingQueue.current = false;
    }
  }, [cleanupEffect]);

  /**
   * Queue an effect (with throttling)
   */
  const queueEffect = useCallback((effect) => {
    // Enforce max queue size
    if (effectQueue.current.length >= MAX_QUEUED_EFFECTS) {
      // Remove oldest effect (last-wins strategy)
      effectQueue.current.shift();
    }
    
    effectQueue.current.push(effect);
    processQueue();
  }, [processQueue]);

  /**
   * MORPH TRACE EFFECT
   * Triggered ONLY after confirmed convert command
   * 
   * @param {Object} params
   * @param {string} params.originId - Source item ID
   * @param {string} params.originType - Source item type (note, task, etc.)
   * @param {string} params.targetId - New item ID
   * @param {string} params.targetType - New item type
   * @param {string} params.originModuleType - Module containing origin
   * @param {string} params.targetModuleType - Module containing target
   */
  const triggerMorphTrace = useCallback(({ 
    originId, 
    originType, 
    targetId, 
    targetType,
    originModuleType,
    targetModuleType 
  }) => {
    const effectId = `morph-${++effectIdCounter.current}`;
    
    // Delay slightly to allow target to render
    setTimeout(() => {
      const originRect = getElementRect(originId, originModuleType);
      const targetRect = getElementRect(targetId, targetModuleType);
      
      const originVisible = isInViewport(originRect);
      const targetVisible = isInViewport(targetRect);
      
      const effect = {
        id: effectId,
        type: 'morph',
        phase: 'pulse', // pulse -> trace -> materialize
        originId,
        originType,
        targetId,
        targetType,
        originRect,
        targetRect,
        originVisible,
        targetVisible,
        duration: MORPH_PULSE_DURATION + TRACE_LINE_DURATION + MATERIALIZE_DURATION,
        startTime: Date.now()
      };
      
      queueEffect(effect);
    }, 100);
  }, [getElementRect, isInViewport, queueEffect]);

  /**
   * NAVIGATION TRACE EFFECT
   * Triggered when opening an object with convert link
   * 
   * @param {Object} params
   * @param {string} params.itemId - Opened item ID
   * @param {string} params.itemType - Item type
   * @param {Array} params.convertedTo - Array of {targetId, targetType, convertedAt}
   * @param {Object} params.convertedFrom - {id, type, convertedAt}
   * @param {string} params.moduleType - Current module type
   */
  const triggerNavigationTrace = useCallback(({ 
    itemId, 
    itemType, 
    convertedTo = [], 
    convertedFrom = null,
    moduleType 
  }) => {
    const effectId = `nav-${++effectIdCounter.current}`;
    
    const originRect = getElementRect(itemId, moduleType);
    
    // Build linked items
    const linkedItems = [];
    
    if (convertedFrom?.id) {
      linkedItems.push({
        id: convertedFrom.id,
        type: convertedFrom.type,
        direction: 'from', // This item was created FROM another
        convertedAt: convertedFrom.convertedAt
      });
    }
    
    if (convertedTo?.length > 0) {
      convertedTo.forEach(link => {
        linkedItems.push({
          id: link.targetId,
          type: link.targetType,
          direction: 'to', // This item was converted TO another
          convertedAt: link.convertedAt
        });
      });
    }
    
    if (linkedItems.length === 0) return;
    
    // Get rects for all linked items
    const linkedRects = linkedItems.map(item => ({
      ...item,
      rect: getElementRect(item.id),
      visible: false
    })).map(item => ({
      ...item,
      visible: isInViewport(item.rect)
    }));
    
    const effect = {
      id: effectId,
      type: 'navigation',
      itemId,
      itemType,
      originRect,
      linkedItems: linkedRects,
      duration: NAV_TRACE_DURATION + (linkedItems.length * 150), // Stagger for multi-convert
      startTime: Date.now()
    };
    
    queueEffect(effect);
  }, [getElementRect, isInViewport, queueEffect]);

  /**
   * Cancel all active effects (for cleanup)
   */
  const cancelAllEffects = useCallback(() => {
    effectQueue.current = [];
    setActiveEffects([]);
    cleanupTimeouts.current.forEach(timeout => clearTimeout(timeout));
    cleanupTimeouts.current.clear();
    isProcessingQueue.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllEffects();
    };
  }, [cancelAllEffects]);

  const value = {
    activeEffects,
    triggerMorphTrace,
    triggerNavigationTrace,
    cancelAllEffects,
    // Export durations for components
    MORPH_PULSE_DURATION,
    TRACE_LINE_DURATION,
    MATERIALIZE_DURATION,
    NAV_TRACE_DURATION
  };

  return (
    <ConvertTraceContext.Provider value={value}>
      {children}
    </ConvertTraceContext.Provider>
  );
};

export const useConvertTrace = () => {
  const context = useContext(ConvertTraceContext);
  if (!context) {
    throw new Error('useConvertTrace must be used within ConvertTraceProvider');
  }
  return context;
};

export default ConvertTraceContext;
