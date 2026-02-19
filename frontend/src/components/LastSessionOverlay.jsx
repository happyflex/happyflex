import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, X, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkspace } from '../context/WorkspaceContext';
import { toast } from '../hooks/use-toast';

const STORAGE_KEY = 'steward:lastSession';

// Debounce/throttle settings
const DEBOUNCE_MS = 800;
const THROTTLE_MS = 2000;

const LastSessionOverlay = () => {
  const workspace = useWorkspace();
  const [showOverlay, setShowOverlay] = useState(false);
  const [sessionSnapshot, setSessionSnapshot] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  
  // Track if workspace was restored from any source (layout or lastSession)
  const wasRestored = useRef(false);
  
  // Auto-save refs
  const lastSaveTime = useRef(0);
  const saveTimeoutRef = useRef(null);
  const pendingChanges = useRef(false);

  // Check for last session on mount
  useEffect(() => {
    if (dismissed || wasRestored.current) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const snapshot = JSON.parse(saved);
        // Validate snapshot has modules
        if (snapshot && snapshot.modules && snapshot.modules.length > 0) {
          setSessionSnapshot(snapshot);
          setShowOverlay(true);
        } else {
          // Invalid snapshot - remove it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('[LastSession] Error loading snapshot:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [dismissed]);

  // Create snapshot from current workspace state
  const createSnapshot = useCallback(() => {
    const now = new Date().toISOString();
    
    return {
      id: 'lastSession',
      name: 'Last Session',
      createdAt: sessionSnapshot?.createdAt || now,
      lastUsedAt: now,
      // Full window state for each module (including viewState)
      modules: workspace.modules.map(m => ({
        id: m.id,
        type: m.type,
        position: { x: m.position.x, y: m.position.y },
        size: { width: m.size.width, height: m.size.height },
        zIndex: m.zIndex,
        pinMode: m.pinMode || 'none',
        isAlwaysOnTop: m.isAlwaysOnTop || false,
        isMaximized: m.isMaximized || false,
        restoreRect: m.restoreRect || null,
        snappedState: m.snappedState || null,
        viewState: m.viewState || undefined
      })),
      // CANVAS (deferred modules)
      deferredModules: workspace.deferredModules.map(m => ({
        id: m.id,
        type: m.type,
        position: { x: m.position.x, y: m.position.y },
        size: { width: m.size.width, height: m.size.height },
        zIndex: m.zIndex,
        pinMode: m.pinMode || 'none',
        viewState: m.viewState || undefined
      })),
      // Focus mode state
      focusedModuleId: workspace.focusedModuleId,
      // Data
      data: {
        notes: workspace.notes,
        tasks: workspace.tasks,
        timerSeconds: workspace.timerSeconds
      }
    };
  }, [workspace.modules, workspace.deferredModules, workspace.focusedModuleId, 
      workspace.notes, workspace.tasks, workspace.timerSeconds, sessionSnapshot?.createdAt]);

  // Save snapshot with debounce and throttle
  const saveSnapshot = useCallback(() => {
    // Don't save if overlay is showing (user hasn't decided yet)
    if (showOverlay) return;
    
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime.current;
    
    // Clear any pending timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // If throttle period hasn't passed, schedule for later
    if (timeSinceLastSave < THROTTLE_MS) {
      pendingChanges.current = true;
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingChanges.current) {
          const snapshot = createSnapshot();
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            lastSaveTime.current = Date.now();
            pendingChanges.current = false;
          } catch (e) {
            console.error('[LastSession] Error saving snapshot:', e);
          }
        }
      }, THROTTLE_MS - timeSinceLastSave);
      return;
    }
    
    // Debounce - wait a bit before saving
    pendingChanges.current = true;
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingChanges.current) {
        const snapshot = createSnapshot();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
          lastSaveTime.current = Date.now();
          pendingChanges.current = false;
        } catch (e) {
          console.error('[LastSession] Error saving snapshot:', e);
        }
      }
    }, DEBOUNCE_MS);
  }, [showOverlay, createSnapshot]);

  // Watch for significant changes and trigger auto-save
  useEffect(() => {
    // Skip if overlay is showing or just mounted
    if (showOverlay || dismissed) return;
    
    // Only save if there are modules (don't save empty state)
    if (workspace.modules.length > 0 || workspace.deferredModules.length > 0) {
      saveSnapshot();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    // Significant changes that trigger save
    workspace.modules.length,
    workspace.deferredModules.length,
    workspace.focusedModuleId,
    // Module changes (serialized for comparison)
    JSON.stringify(workspace.modules.map(m => ({
      id: m.id, 
      x: Math.round(m.position.x), 
      y: Math.round(m.position.y),
      w: m.size.width,
      h: m.size.height,
      pin: m.pinMode,
      max: m.isMaximized,
      vs: m.viewState
    }))),
    JSON.stringify(workspace.deferredModules.map(m => m.id)),
    saveSnapshot,
    showOverlay,
    dismissed
  ]);

  // Restore last session
  const handleRestore = useCallback(() => {
    if (!sessionSnapshot) return;
    
    try {
      // Use the same restore pipeline as layout load
      workspace.setModules([]);
      workspace.setDeferredModules([]);
      workspace.clearFocusMode();
      
      // Restore modules
      const restoredModules = (sessionSnapshot.modules || []).map((moduleData, index) => ({
        id: moduleData.id || `module-${Date.now()}-${index}`,
        type: moduleData.type,
        position: {
          x: moduleData.position?.x ?? 100 + index * 30,
          y: moduleData.position?.y ?? 100 + index * 30
        },
        size: {
          width: moduleData.size?.width ?? 400,
          height: moduleData.size?.height ?? 300
        },
        zIndex: moduleData.zIndex ?? index,
        pinMode: moduleData.pinMode || 'none',
        isAlwaysOnTop: moduleData.isAlwaysOnTop || false,
        isMaximized: moduleData.isMaximized || false,
        restoreRect: moduleData.restoreRect || null,
        snappedState: moduleData.snappedState || null,
        viewState: moduleData.viewState || undefined
      }));
      
      workspace.setModules(restoredModules);
      
      // Restore CANVAS
      const restoredDeferredModules = (sessionSnapshot.deferredModules || []).map((moduleData, index) => ({
        id: moduleData.id || `deferred-${Date.now()}-${index}`,
        type: moduleData.type,
        position: {
          x: moduleData.position?.x ?? 100,
          y: moduleData.position?.y ?? 100
        },
        size: {
          width: moduleData.size?.width ?? 400,
          height: moduleData.size?.height ?? 300
        },
        zIndex: moduleData.zIndex ?? index,
        pinMode: moduleData.pinMode || 'none',
        viewState: moduleData.viewState || undefined
      }));
      
      workspace.setDeferredModules(restoredDeferredModules);
      
      // Restore focus mode
      if (sessionSnapshot.focusedModuleId) {
        const focusedExists = restoredModules.some(m => m.id === sessionSnapshot.focusedModuleId);
        if (focusedExists) {
          workspace.setFocusMode(sessionSnapshot.focusedModuleId);
        }
      }
      
      // Restore data
      if (sessionSnapshot.data) {
        if (sessionSnapshot.data.notes && Array.isArray(sessionSnapshot.data.notes)) {
          workspace.setNotes(sessionSnapshot.data.notes);
        }
        if (sessionSnapshot.data.tasks && Array.isArray(sessionSnapshot.data.tasks)) {
          workspace.setTasks(sessionSnapshot.data.tasks);
        }
        if (typeof sessionSnapshot.data.timerSeconds === 'number') {
          workspace.setTimerSeconds(sessionSnapshot.data.timerSeconds);
        }
      }
      
      // Update lastUsedAt in stored snapshot
      const updatedSnapshot = {
        ...sessionSnapshot,
        lastUsedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSnapshot));
      
      wasRestored.current = true;
      setShowOverlay(false);
      setDismissed(true);
      
      const moduleCount = restoredModules.length;
      const canvasCount = restoredDeferredModules.length;
      
      toast({
        title: 'Session obnovena',
        description: `${moduleCount} oken${canvasCount > 0 ? `, ${canvasCount} v CANVAS` : ''}`
      });
    } catch (e) {
      console.error('[LastSession] Error restoring:', e);
      localStorage.removeItem(STORAGE_KEY);
      setShowOverlay(false);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se obnovit session',
        variant: 'destructive'
      });
    }
  }, [sessionSnapshot, workspace]);

  // Dismiss overlay
  const handleDismiss = useCallback(() => {
    setShowOverlay(false);
    setDismissed(true);
    // Don't delete the snapshot - keep it for next reload
  }, []);

  // Don't render if no overlay needed
  if (!showOverlay || !sessionSnapshot) return null;

  // Calculate session info
  const moduleCount = sessionSnapshot.modules?.length || 0;
  const canvasCount = sessionSnapshot.deferredModules?.length || 0;
  const lastUsed = sessionSnapshot.lastUsedAt 
    ? new Date(sessionSnapshot.lastUsedAt).toLocaleString('cs-CZ')
    : 'Neznámé';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" />
      
      {/* Overlay panel */}
      <div className="relative bg-[#0d1f35] border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 p-6 max-w-md w-full mx-4 pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-full border border-cyan-500/30">
            <Clock className="h-8 w-8 text-cyan-400" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-xl font-semibold text-white text-center mb-2">
          Obnovit poslední session?
        </h2>
        
        {/* Subtitle */}
        <p className="text-gray-400 text-center text-sm mb-4">
          Systém detekoval nedokončenou session.
        </p>
        
        {/* Session info */}
        <div className="bg-[#0a1628] rounded-lg p-3 mb-5 border border-cyan-500/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Oken:</span>
            <span className="text-cyan-400 font-medium">{moduleCount}</span>
          </div>
          {canvasCount > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">V CANVAS:</span>
              <span className="text-cyan-400 font-medium">{canvasCount}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Uloženo:</span>
            <span className="text-gray-400">{lastUsed}</span>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Pokračovat bez obnovení
          </Button>
          <Button
            onClick={handleRestore}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Obnovit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LastSessionOverlay;
