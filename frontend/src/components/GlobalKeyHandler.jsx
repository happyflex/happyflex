/**
 * GlobalKeyHandler
 * 
 * Handles global keyboard shortcuts for STEWARD workspace.
 * Currently supports:
 * - Ctrl+Z / Cmd+Z: Undo last action
 * 
 * Guards:
 * - Ignores shortcuts when focus is in INPUT/TEXTAREA/contentEditable
 * - Debounce/lock to prevent spam
 */

import { useEffect, useCallback } from 'react';
import { useUndo } from '../context/UndoContext';

const GlobalKeyHandler = () => {
  const { undoLast, canUndo } = useUndo();

  /**
   * Check if element is an editable field where native undo should work
   */
  const isEditableElement = useCallback((element) => {
    if (!element) return false;
    
    const tagName = element.tagName?.toUpperCase();
    
    // Check for input/textarea
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      return true;
    }
    
    // Check for contentEditable
    if (element.isContentEditable || element.contentEditable === 'true') {
      return true;
    }
    
    // Check for contentEditable on parent (some rich text editors)
    if (element.closest('[contenteditable="true"]')) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Global keydown handler
   */
  const handleKeyDown = useCallback((event) => {
    // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (macOS)
    const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey;
    
    if (!isUndo) return;
    
    // Guard: Don't intercept if focus is in editable element
    const activeElement = document.activeElement;
    if (isEditableElement(activeElement)) {
      // Let native text undo work
      return;
    }
    
    // Guard: Check if undo is possible
    if (!canUndo()) {
      return;
    }
    
    // Prevent default browser behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Execute undo
    undoLast();
  }, [isEditableElement, canUndo, undoLast]);

  // Register global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleKeyDown]);

  // This component doesn't render anything
  return null;
};

export default GlobalKeyHandler;
