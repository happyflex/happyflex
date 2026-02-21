import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  FileText,
  GitBranch,
  FolderOpen,
  Calendar,
  Music,
  Timer,
  Save,
  Zap,
  Focus,
  PanelLeftClose,
  PanelRightClose,
  Send,
  Copy,
  Lock,
  Pin,
  X,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  SplitSquareVertical,
  ListChecks,
  Users,
  Play,
  Pause,
  SkipForward,
  Minimize2,
  CalendarPlus,
  Bell,
  Trash2,
  Map,
  User,
  Edit2,
  CheckCircle2,
  FolderPlus,
  Layout,
  Shuffle,
  Target,
  Box,
  ArrowRight
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCommandWheel } from '../hooks/useCommandWheel';
import { useItemActions, ITEM_ACTIONS, ITEM_TYPES } from '../context/ItemActionContext';
import { toast } from '../hooks/use-toast';
import { executeConvert, getConvertTargets, CONVERT_TARGET_LABELS } from '../services/ConvertService';

// Workzones for switch action
const WORKZONES = [
  { id: 'problem-solving', name: 'Problem Solving', color: 'purple' },
  { id: 'planning', name: 'Plánovací', color: 'yellow' },
  { id: 'executive', name: 'Exekutivní', color: 'green' }
];

// ============================================================================
// ITEM TYPE THEME LAYER - Visual variants based on item type
// ============================================================================
const ITEM_TYPE_THEMES = {
  note: {
    accentColor: 'rgba(34, 211, 238, 0.7)', // cyan
    glowColor: 'rgba(34, 211, 238, 0.3)',
    label: 'Poznámka'
  },
  project: {
    accentColor: 'rgba(99, 102, 241, 0.7)', // indigo
    glowColor: 'rgba(99, 102, 241, 0.3)',
    label: 'Projekt'
  },
  projectNode: {
    accentColor: 'rgba(99, 102, 241, 0.7)', // indigo
    glowColor: 'rgba(99, 102, 241, 0.3)',
    label: 'Podprojekt'
  },
  subproject: {
    accentColor: 'rgba(99, 102, 241, 0.7)', // indigo
    glowColor: 'rgba(99, 102, 241, 0.3)',
    label: 'Podprojekt'
  },
  person: {
    accentColor: 'rgba(59, 130, 246, 0.7)', // blue
    glowColor: 'rgba(59, 130, 246, 0.3)',
    label: 'Kontakt'
  },
  goal: {
    accentColor: 'rgba(16, 185, 129, 0.7)', // emerald
    glowColor: 'rgba(16, 185, 129, 0.3)',
    label: 'Cíl'
  },
  process: {
    accentColor: 'rgba(139, 92, 246, 0.7)', // violet
    glowColor: 'rgba(139, 92, 246, 0.3)',
    label: 'Proces'
  },
  processStep: {
    accentColor: 'rgba(139, 92, 246, 0.7)', // violet
    glowColor: 'rgba(139, 92, 246, 0.3)',
    label: 'Krok procesu'
  },
  task: {
    accentColor: 'rgba(236, 72, 153, 0.7)', // pink
    glowColor: 'rgba(236, 72, 153, 0.3)',
    label: 'Úkol'
  },
  calendar_event: {
    accentColor: 'rgba(244, 63, 94, 0.7)', // rose
    glowColor: 'rgba(244, 63, 94, 0.3)',
    label: 'Událost'
  },
  planArea: {
    accentColor: 'rgba(132, 204, 22, 0.7)', // lime
    glowColor: 'rgba(132, 204, 22, 0.3)',
    label: 'Oblast plánu'
  }
};

// Get menu items based on context
const getMenuItems = (target, activeWorkzone, workspace, getAvailableActions = null) => {
  const { type, data, contentType } = target;
  
  // Empty workspace
  if (type === 'empty' || type === 'canvas-area') {
    let items = [
      { id: 'new-note', icon: FileText, label: 'Nová Poznámka', action: 'addModule', params: 'notes' },
      { id: 'new-process', icon: GitBranch, label: 'Nový Proces', action: 'addModule', params: 'processes' },
      { id: 'open-calendar', icon: Calendar, label: 'Kalendář', action: 'addModule', params: 'calendar' },
      { id: 'open-music', icon: Music, label: 'Hudba', action: 'addModule', params: 'music' },
      { id: 'open-timer', icon: Timer, label: 'Časovač', action: 'addModule', params: 'timer' },
      { id: 'switch-workzone', icon: Zap, label: 'Workzone', action: 'switchWorkzone', hasSubmenu: true }
    ];
    
    // Prioritize based on workzone
    if (activeWorkzone?.id === 'problem-solving') {
      items = [
        { id: 'new-process', icon: GitBranch, label: 'Nový Proces', action: 'addModule', params: 'processes', recommended: true },
        { id: 'new-note', icon: FileText, label: 'Nová Poznámka', action: 'addModule', params: 'notes', recommended: true },
        ...items.filter(i => i.id !== 'new-process' && i.id !== 'new-note')
      ];
    } else if (activeWorkzone?.id === 'planning') {
      items = [
        { id: 'open-calendar', icon: Calendar, label: 'Kalendář', action: 'addModule', params: 'calendar', recommended: true },
        { id: 'new-process', icon: GitBranch, label: 'Nový Proces', action: 'addModule', params: 'processes', recommended: true },
        ...items.filter(i => i.id !== 'open-calendar' && i.id !== 'new-process')
      ];
    } else if (activeWorkzone?.id === 'executive') {
      items = [
        { id: 'open-tasks', icon: ListChecks, label: 'Úkoly', action: 'addModule', params: 'tasks', recommended: true },
        { id: 'open-timer', icon: Timer, label: 'Časovač', action: 'addModule', params: 'timer', recommended: true },
        ...items.filter(i => i.id !== 'open-timer'),
        { id: 'open-people', icon: Users, label: 'Lidi', action: 'addModule', params: 'people' }
      ];
    }
    
    return items.slice(0, 8);
  }
  
  // Window/Module
  if (type === 'window' || type === 'module-content') {
    const module = data;
    const pinMode = module?.pinMode || 'none';
    
    let items = [
      { id: 'focus', icon: Focus, label: 'Focus', action: 'toggleFocus', params: module?.id },
      { id: 'snap-left', icon: PanelLeftClose, label: 'Snap Vlevo', action: 'snapLeft', params: module?.id },
      { id: 'snap-right', icon: PanelRightClose, label: 'Snap Vpravo', action: 'snapRight', params: module?.id },
      { id: 'send-canvas', icon: Send, label: 'Do CANVAS', action: 'sendToCanvas', params: module?.id },
      { id: 'duplicate', icon: Copy, label: 'Duplikovat', action: 'duplicate', params: module?.id },
      { id: 'pin-lock', icon: Lock, label: pinMode === 'lock' ? 'Odemknout' : 'Zamknout', action: 'togglePinLock', params: module?.id, active: pinMode === 'lock' },
      { id: 'pin-top', icon: Pin, label: pinMode === 'top' ? 'Odepnout' : 'Vždy nahoře', action: 'togglePinTop', params: module?.id, active: pinMode === 'top' },
      { id: 'close', icon: X, label: 'Zavřít', action: 'closeWindow', params: module?.id, danger: true }
    ];
    
    // Content-specific actions
    if (type === 'module-content' && contentType) {
      const contentActions = getContentActions(contentType, module);
      if (contentActions.length > 0) {
        // Insert content actions after focus
        items = [
          items[0], // focus
          ...contentActions,
          ...items.slice(1, 7)
        ].slice(0, 8);
      }
    }
    
    return items;
  }
  
  // CANVAS block
  if (type === 'canvas-block') {
    const module = data;
    return [
      { id: 'restore', icon: ExternalLink, label: 'Do Workspace', action: 'restoreFromCanvas', params: module?.id, recommended: true },
      { id: 'move-up', icon: ArrowUp, label: 'Posunout Nahoru', action: 'moveUp', params: module?.id },
      { id: 'move-down', icon: ArrowDown, label: 'Posunout Dolů', action: 'moveDown', params: module?.id },
      { id: 'close', icon: X, label: 'Odebrat', action: 'removeFromCanvas', params: module?.id, danger: true }
    ];
  }
  
  // === ITEM MODE: Actions for individual items ===
  if (type === 'item') {
    const { itemType, itemId, parentId, moduleType, parentContext } = target;
    
    // Icon mapping for item actions
    const iconMap = {
      'Copy': Copy,
      'Trash2': Trash2,
      'ListChecks': ListChecks,
      'FolderPlus': FolderPlus,
      'FolderOpen': FolderOpen,
      'Map': Map,
      'User': User,
      'Edit2': Edit2,
      'CheckCircle2': CheckCircle2,
      'Layout': Layout,
      'GitBranch': GitBranch,
      'ExternalLink': ExternalLink,
      'Shuffle': Shuffle,
      'Target': Target,
      'FileText': FileText,
      'Box': Box
    };
    
    // Get available actions from registry (filtered by what's supported)
    const itemActions = getAvailableActions 
      ? getAvailableActions(itemType, moduleType) 
      : [];
    
    // Check if this item type can be converted
    const convertTargets = getConvertTargets(itemType);
    const canConvert = convertTargets.length > 0;
    
    // If no actions available, show minimal fallback
    if (itemActions.length === 0) {
      const fallbackItems = [
        {
          id: 'item-info',
          icon: Edit2,
          label: 'Položka',
          action: 'itemInfo',
          params: { itemType, itemId, moduleType, parentContext }
        }
      ];
      
      // Add convert if available
      if (canConvert) {
        fallbackItems.push({
          id: 'item-convert',
          icon: Shuffle,
          label: 'Převést',
          action: 'convertItem',
          hasSubmenu: true,
          params: { itemType, itemId, moduleType, parentContext, convertTargets }
        });
      }
      
      return fallbackItems;
    }
    
    // Build menu items from registered actions
    const menuItems = itemActions.map(action => ({
      id: `item-${action.id}`,
      icon: iconMap[action.icon] || Copy,
      label: action.label,
      action: 'itemAction',
      params: {
        actionType: action.id,
        itemType,
        itemId,
        parentId,
        moduleType,
        parentContext
      },
      danger: action.danger || false,
      recommended: action.id === ITEM_ACTIONS.DUPLICATE
    }));
    
    // Add Convert action if available (before DELETE)
    if (canConvert) {
      const deleteIndex = menuItems.findIndex(m => m.id === 'item-delete');
      const convertAction = {
        id: 'item-convert',
        icon: Shuffle,
        label: 'Převést',
        action: 'convertItem',
        hasSubmenu: true,
        params: { itemType, itemId, moduleType, parentContext, convertTargets }
      };
      
      if (deleteIndex !== -1) {
        menuItems.splice(deleteIndex, 0, convertAction);
      } else {
        menuItems.push(convertAction);
      }
    }
    
    return menuItems.slice(0, 8); // Max 8 items
  }
  
  return [];
};

// Content-specific actions
const getContentActions = (contentType, module) => {
  switch (contentType) {
    case 'notes':
      return [
        { id: 'split-note', icon: SplitSquareVertical, label: 'Rozdělit', action: 'splitNote' },
        { id: 'to-task', icon: ListChecks, label: 'Na Úkol', action: 'convertToTask' }
      ];
    case 'processes':
      return [
        { id: 'add-step', icon: Plus, label: 'Přidat Krok', action: 'addProcessStep' },
        { id: 'duplicate-process', icon: Copy, label: 'Duplikovat', action: 'duplicateProcess' }
      ];
    case 'calendar':
      return [
        { id: 'new-event', icon: CalendarPlus, label: 'Nová Událost', action: 'newCalendarEvent' },
        { id: 'add-reminder', icon: Bell, label: 'Připomínka', action: 'addReminder' }
      ];
    case 'music':
      return [
        { id: 'play-pause', icon: Play, label: 'Play/Pause', action: 'togglePlayPause' },
        { id: 'next-track', icon: SkipForward, label: 'Další', action: 'nextTrack' },
        { id: 'mini-mode', icon: Minimize2, label: 'Mini', action: 'toggleMiniMode' }
      ];
    case 'people':
      return [
        { id: 'assign-task', icon: ListChecks, label: 'Přiřadit Úkol', action: 'assignTask' },
        { id: 'open-profile', icon: Users, label: 'Profil', action: 'openProfile' }
      ];
    default:
      return [];
  }
};

const CommandWheel = () => {
  const { isOpen, position, target, close } = useCommandWheel();
  const { executeItemAction, getAvailableActions } = useItemActions();
  const {
    activeWorkzone,
    addModule,
    removeModule,
    deferModule,
    restoreModule,
    removeFromCanvas,
    duplicateModule,
    setPinMode,
    snapToLeft,
    snapToRight,
    setFocusMode,
    clearFocusMode,
    focusedModuleId,
    moveCanvasModuleUp,
    moveCanvasModuleDown,
    setActiveWorkzone,
    modules
  } = useWorkspace();
  
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const wheelRef = useRef(null);
  
  // === STARK UPGRADE STATE ===
  const [isDragging, setIsDragging] = useState(false); // Drag-to-delete tracking
  const [activeSegment, setActiveSegment] = useState(null); // Currently hovered segment during drag
  const [showConvertSubmenu, setShowConvertSubmenu] = useState(false); // Convert submenu visibility
  const [deleteFlash, setDeleteFlash] = useState(false); // Red pulse after delete
  
  // === ITEM TYPE THEME LAYER ===
  // Compute theme based on item type (only for item mode)
  const itemTypeTheme = useMemo(() => {
    if (target.type !== 'item' || !target.itemType) {
      return null;
    }
    return ITEM_TYPE_THEMES[target.itemType] || null;
  }, [target]);
  
  // Get workzone color (with item type overlay when in item mode)
  const workzoneColor = useMemo(() => {
    // Base workzone color
    let base;
    switch (activeWorkzone?.color) {
      case 'purple': base = { ring: 'rgba(168, 85, 247, 0.6)', glow: 'rgba(168, 85, 247, 0.3)', accent: '#a855f7' }; break;
      case 'yellow': base = { ring: 'rgba(250, 204, 21, 0.6)', glow: 'rgba(250, 204, 21, 0.3)', accent: '#facc15' }; break;
      case 'green': base = { ring: 'rgba(74, 222, 128, 0.6)', glow: 'rgba(74, 222, 128, 0.3)', accent: '#4ade80' }; break;
      default: base = { ring: 'rgba(34, 211, 238, 0.6)', glow: 'rgba(34, 211, 238, 0.3)', accent: '#22d3ee' };
    }
    
    // Apply item type theme overlay for item mode
    if (itemTypeTheme) {
      return {
        ...base,
        itemAccent: itemTypeTheme.accentColor,
        itemGlow: itemTypeTheme.glowColor,
        itemLabel: itemTypeTheme.label
      };
    }
    
    return base;
  }, [activeWorkzone, itemTypeTheme]);
  
  // Menu items based on context (pass getAvailableActions for item mode)
  const menuItems = useMemo(() => {
    return getMenuItems(target, activeWorkzone, { modules }, getAvailableActions);
  }, [target, activeWorkzone, modules, getAvailableActions]);
  
  // ESC key handler to close ring
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);
  
  // Parallax effect
  useEffect(() => {
    if (!isOpen) return;
    
    const handleMouseMove = (e) => {
      const dx = (e.clientX - position.x) / 50;
      const dy = (e.clientY - position.y) / 50;
      setMouseOffset({ x: Math.max(-5, Math.min(5, dx)), y: Math.max(-5, Math.min(5, dy)) });
      
      // === STARK UPGRADE: Drag-to-delete segment tracking ===
      if (wheelRef.current) {
        const wheelRect = wheelRef.current.getBoundingClientRect();
        const centerX = wheelRect.left + wheelRect.width / 2;
        const centerY = wheelRect.top + wheelRect.height / 2;
        
        // Calculate angle from center to mouse
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const normalizedAngle = ((angle * 180 / Math.PI) + 90 + 360) % 360; // 0 is top
        
        // Calculate distance from center
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );
        
        // Only track if mouse is in segment area (between 60 and 120 pixels from center)
        if (distance > 60 && distance < 140 && menuItems.length > 0) {
          const segmentAngle = 360 / menuItems.length;
          const segmentIndex = Math.floor(normalizedAngle / segmentAngle);
          setActiveSegment(menuItems[segmentIndex % menuItems.length]?.id || null);
        } else {
          setActiveSegment(null);
        }
      }
    };
    
    // === STARK UPGRADE: Drag-to-delete - Execute on mouse up if on delete segment ===
    const handleMouseUp = (e) => {
      if (!e.altKey) return; // Only when ALT is still held
      
      // Check if we're on a delete segment
      if (activeSegment) {
        const activeItem = menuItems.find(m => m.id === activeSegment);
        if (activeItem && (activeItem.action === 'itemAction' && activeItem.params?.actionType === 'delete')) {
          // Trigger delete flash
          setDeleteFlash(true);
          setTimeout(() => setDeleteFlash(false), 300);
          
          // Execute delete action
          executeAction(activeItem);
          close();
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, position, menuItems, activeSegment, close]);
  
  // Execute action
  const executeAction = (item) => {
    const { action, params } = item;
    
    switch (action) {
      case 'addModule':
        addModule(params);
        toast({ title: 'Modul přidán', description: `${item.label} byl vytvořen` });
        break;
      case 'toggleFocus':
        if (focusedModuleId === params) {
          clearFocusMode();
        } else {
          setFocusMode(params);
        }
        break;
      case 'snapLeft':
        snapToLeft(params);
        toast({ title: 'Snap', description: 'Okno přesunuto vlevo' });
        break;
      case 'snapRight':
        snapToRight(params);
        toast({ title: 'Snap', description: 'Okno přesunuto vpravo' });
        break;
      case 'sendToCanvas':
        deferModule(params);
        toast({ title: 'CANVAS', description: 'Okno přesunuto do CANVAS' });
        break;
      case 'duplicate':
        duplicateModule(params);
        toast({ title: 'Duplikováno', description: 'Okno bylo zduplikováno' });
        break;
      case 'togglePinLock':
        const module = modules.find(m => m.id === params);
        setPinMode(params, module?.pinMode === 'lock' ? 'none' : 'lock');
        break;
      case 'togglePinTop':
        const mod = modules.find(m => m.id === params);
        setPinMode(params, mod?.pinMode === 'top' ? 'none' : 'top');
        break;
      case 'closeWindow':
        removeModule(params);
        toast({ title: 'Zavřeno', description: 'Okno bylo zavřeno' });
        break;
      case 'restoreFromCanvas':
        restoreModule(params);
        toast({ title: 'Obnoveno', description: 'Modul přesunut do workspace' });
        break;
      case 'moveUp':
        moveCanvasModuleUp(params);
        break;
      case 'moveDown':
        moveCanvasModuleDown(params);
        break;
      case 'removeFromCanvas':
        removeFromCanvas(params);
        toast({ title: 'Odebráno', description: 'Modul byl odebrán z CANVAS' });
        break;
      case 'switchWorkzone':
        setShowSubmenu(!showSubmenu);
        return; // Don't close
      // === STARK UPGRADE: Convert submenu ===
      case 'convertItem':
        setShowConvertSubmenu(!showConvertSubmenu);
        return; // Don't close - show submenu
      // === STARK UPGRADE: Execute convert action from submenu ===
      case 'executeConvert':
        {
          const { sourceType, sourceId, targetType, moduleType: srcModuleType, parentContext: srcContext } = params;
          
          // Validate scope safety
          if (!srcModuleType) {
            console.warn('[CommandWheel] Convert blocked - missing moduleType');
            toast({ 
              title: 'Convert zablokován', 
              description: 'Chybí kontext modulu',
              variant: 'destructive'
            });
            break;
          }
          
          // Execute convert via service
          const result = executeConvert({
            sourceType,
            sourceId,
            targetType,
            moduleType: srcModuleType,
            parentContext: srcContext,
            source: 'mouseRing'
          });
          
          if (result.success) {
            const targetLabel = CONVERT_TARGET_LABELS[targetType]?.label || targetType;
            toast({ 
              title: 'Převedeno', 
              description: `Vytvořen nový ${targetLabel} s propojením na původní objekt`
            });
          } else {
            toast({ 
              title: 'Chyba převodu', 
              description: result.error || 'Nepodařilo se převést objekt',
              variant: 'destructive'
            });
          }
          
          setShowConvertSubmenu(false);
        }
        break;
      // === ITEM MODE: Execute item actions via adapter ===
      case 'itemAction':
        {
          const { actionType, itemType, itemId, parentId, moduleType, parentContext } = params;
          
          // Trigger delete flash for delete action
          if (actionType === 'delete') {
            setDeleteFlash(true);
            setTimeout(() => setDeleteFlash(false), 300);
          }
          
          executeItemAction({
            scope: 'item',
            itemType,
            itemId,
            parentContext: parentContext || { parentId }, // Full context or fallback
            moduleType,
            action: actionType,
            source: 'mouseRing'
          });
        }
        break;
      default:
        toast({ title: item.label, description: 'Funkce bude brzy dostupná' });
    }
    
    setShowConvertSubmenu(false); // Reset convert submenu
    close();
  };
  
  // === STARK UPGRADE: Handle convert target selection ===
  const executeConvertTarget = (targetType) => {
    const params = menuItems.find(m => m.id === 'item-convert')?.params;
    if (!params) return;
    
    executeAction({
      action: 'executeConvert',
      params: {
        sourceType: params.itemType,
        sourceId: params.itemId,
        targetType,
        moduleType: params.moduleType,
        parentContext: params.parentContext
      }
    });
  };
  
  // Handle workzone selection
  const selectWorkzone = (zone) => {
    const workzone = {
      id: zone.id,
      name: zone.name,
      color: zone.color,
      bgColor: `bg-${zone.color}-500/20`,
      borderColor: `border-${zone.color}-500/40`,
      textColor: `text-${zone.color}-400`
    };
    setActiveWorkzone(workzone);
    toast({ title: 'Workzone změněna', description: `Přepnuto na ${zone.name}` });
    close();
  };
  
  if (!isOpen || menuItems.length === 0) return null;
  
  // Compact radius
  const radius = 30;
  const itemCount = menuItems.length;
  const angleStep = (2 * Math.PI) / itemCount;
  
  // Adjust position to stay in viewport
  let adjustedX = position.x;
  let adjustedY = position.y;
  const margin = 100;
  
  if (position.x < margin) adjustedX = margin;
  if (position.x > window.innerWidth - margin) adjustedX = window.innerWidth - margin;
  if (position.y < margin) adjustedY = margin;
  if (position.y > window.innerHeight - margin) adjustedY = window.innerHeight - margin;
  
  // === STARK UPGRADE: Get convert targets for submenu ===
  const convertParams = menuItems.find(m => m.id === 'item-convert')?.params;
  const convertTargets = convertParams?.convertTargets || [];
  
  return (
    <div
      className="command-wheel fixed inset-0 z-[10000] pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={close}
      />
      
      {/* Wheel Container */}
      <div
        ref={wheelRef}
        className="absolute pointer-events-auto"
        style={{
          left: adjustedX,
          top: adjustedY,
          transform: `translate(-50%, -50%) translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`,
          animation: 'wheelOpen 200ms cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* === SPATIAL INTEGRATION: Ambient Halo === */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: (radius + 60) * 2,
            height: (radius + 60) * 2,
            left: -(radius + 60),
            top: -(radius + 60),
            background: `radial-gradient(circle at center, ${workzoneColor.glow} 0%, ${workzoneColor.glow}00 70%)`,
            opacity: 0.15,
            filter: 'blur(20px)'
          }}
        />
        
        {/* === MULTI-LAYER RING SYSTEM === */}
        
        {/* Layer 1: Outer Detail Ring with 12 Tick Marks */}
        <div
          className="absolute rounded-full"
          style={{
            width: (radius + 6) * 2,
            height: (radius + 6) * 2,
            left: -(radius + 6),
            top: -(radius + 6),
          }}
        >
          {/* 12 Ultra-subtle tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const tickAngle = (360 / 12) * i;
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  width: '1px',
                  height: '5px',
                  background: `linear-gradient(to bottom, ${workzoneColor.ring}, transparent)`,
                  opacity: 0.2,
                  left: '50%',
                  top: '0',
                  transformOrigin: `0 ${radius + 6}px`,
                  transform: `translateX(-50%) rotate(${tickAngle}deg)`
                }}
              />
            );
          })}
        </div>
        
        {/* Layer 2: Main Energy Ring (workzone glow) */}
        <div
          className="absolute rounded-full"
          style={{
            width: radius * 2,
            height: radius * 2,
            left: -radius,
            top: -radius,
            border: `1.5px solid ${workzoneColor.ring}`,
            boxShadow: `
              0 0 12px ${workzoneColor.glow},
              0 0 24px ${workzoneColor.glow}
              ${deleteFlash ? `, 0 0 40px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.5)` : ''}
            `,
            animation: deleteFlash ? 'deleteFlash 300ms ease-out' : 'ringBreathe 4s ease-in-out infinite',
            transition: 'box-shadow 150ms ease'
          }}
        />
        
        {/* === STARK UPGRADE: Item Type Theme Overlay Ring === */}
        {itemTypeTheme && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: (radius + 3) * 2,
              height: (radius + 3) * 2,
              left: -(radius + 3),
              top: -(radius + 3),
              border: `1px solid ${itemTypeTheme.accentColor}`,
              boxShadow: `
                0 0 8px ${itemTypeTheme.glowColor},
                inset 0 0 6px ${itemTypeTheme.glowColor}
              `,
              opacity: 0.6,
              animation: 'itemTypeGlow 2s ease-in-out infinite'
            }}
          />
        )}
        
        {/* Layer 3: Inner Technical Ring (thin, no glow) */}
        <div
          className="absolute rounded-full"
          style={{
            width: (radius - 4) * 2,
            height: (radius - 4) * 2,
            left: -(radius - 4),
            top: -(radius - 4),
            border: '1px solid rgba(34, 211, 238, 0.15)'
          }}
        />
        
        {/* Layer 4: Central Hub with gradient core */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            width: (radius - 8) * 2,
            height: (radius - 8) * 2,
            left: -(radius - 8),
            top: -(radius - 8),
            background: `
              radial-gradient(
                circle at center,
                rgba(13, 42, 58, 0.95) 0%,
                rgba(8, 28, 42, 0.98) 50%,
                rgba(10, 22, 40, 0.95) 100%
              )
            `,
            backdropFilter: 'blur(12px)',
            boxShadow: `
              inset 0 0 15px rgba(0, 0, 0, 0.4),
              inset 0 0 8px ${workzoneColor.glow}
            `
          }}
        >
          {/* Inner gradient overlay with workzone tint */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${workzoneColor.accent}10 0%, transparent 70%)`,
              animation: 'coreTint 4s ease-in-out infinite'
            }}
          />
        </div>
        
        {/* Layer 5: Central Energy Core with Micro Pulse */}
        <div
          className="absolute rounded-full"
          style={{
            width: 10,
            height: 10,
            left: -5,
            top: -5,
            background: `radial-gradient(circle, ${workzoneColor.accent}90 0%, ${workzoneColor.accent}40 50%, transparent 80%)`,
            boxShadow: `
              0 0 6px ${workzoneColor.accent}80,
              0 0 12px ${workzoneColor.glow}
            `,
            animation: 'corePulse 4s ease-in-out infinite'
          }}
        />
        
        {/* Inner energy dot (stable center) */}
        <div
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 3,
            left: -1.5,
            top: -1.5,
            background: workzoneColor.accent,
            boxShadow: `0 0 2px ${workzoneColor.accent}`
          }}
        />
        
        {/* Menu Items */}
        {menuItems.map((item, index) => {
          const angle = angleStep * index - Math.PI / 2; // Start from top
          const x = Math.cos(angle) * (radius + 38);
          const y = Math.sin(angle) * (radius + 38);
          const isHovered = hoveredItem === item.id;
          const isDragActive = activeSegment === item.id; // STARK: Active during drag
          const isDeleteSegment = item.action === 'itemAction' && item.params?.actionType === 'delete';
          const isConvertSegment = item.action === 'convertItem';
          const Icon = item.icon;
          
          // Determine segment visual state
          const isActiveHighlight = isHovered || isDragActive;
          const segmentColor = isDragActive && isDeleteSegment 
            ? { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }
            : isDragActive && isConvertSegment
              ? { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' }
              : workzoneColor;
          
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${isActiveHighlight ? 1.15 : 1}) translateX(${isActiveHighlight ? Math.cos(angle) * 10 : 0}px) translateY(${isActiveHighlight ? Math.sin(angle) * 10 : 0}px)`,
                transition: 'all 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: isActiveHighlight ? 10 : 1
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => executeAction(item)}
            >
              {/* Item container */}
              <div
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                {/* Icon circle */}
                <div
                  className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isActiveHighlight 
                      ? `linear-gradient(135deg, ${segmentColor.accent}30 0%, ${segmentColor.accent}10 100%)`
                      : item.recommended
                        ? `linear-gradient(135deg, ${workzoneColor.accent}20 0%, transparent 100%)`
                        : 'rgba(15, 29, 53, 0.9)',
                    border: `1px solid ${isActiveHighlight ? segmentColor.accent : item.recommended ? workzoneColor.ring : 'rgba(34, 211, 238, 0.25)'}`,
                    boxShadow: isActiveHighlight
                      ? `0 0 12px ${segmentColor.glow}, 0 0 24px ${segmentColor.glow}`
                      : item.recommended
                        ? `0 0 10px ${workzoneColor.glow}`
                        : 'none',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <Icon 
                    className="w-3.5 h-3.5 transition-colors duration-150"
                    style={{ 
                      color: item.danger || (isDragActive && isDeleteSegment) 
                        ? '#f87171' 
                        : item.active 
                          ? '#c084fc' 
                          : isConvertSegment
                            ? '#8b5cf6'
                            : isActiveHighlight || item.recommended 
                              ? segmentColor.accent 
                              : '#22d3ee' 
                    }}
                  />
                  
                  {/* Recommended indicator */}
                  {item.recommended && !isActiveHighlight && (
                    <div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: workzoneColor.accent }}
                    />
                  )}
                  
                  {/* STARK: Convert has submenu indicator */}
                  {item.hasSubmenu && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#8b5cf6' }}
                    />
                  )}
                </div>
                
                {/* Label */}
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-all duration-150 ${
                    isHovered ? 'opacity-100' : 'opacity-70'
                  }`}
                  style={{
                    color: item.danger ? '#f87171' : isHovered ? workzoneColor.accent : '#94a3b8',
                    textShadow: isHovered ? `0 0 8px ${workzoneColor.glow}` : 'none'
                  }}
                >
                  {item.label}
                </span>
                
                {/* Submenu for workzone */}
                {item.hasSubmenu && showSubmenu && hoveredItem === item.id && (
                  <div
                    className="absolute top-full mt-2 py-2 px-1 rounded-lg"
                    style={{
                      background: 'rgba(15, 29, 53, 0.95)',
                      border: `1px solid ${workzoneColor.ring}`,
                      backdropFilter: 'blur(20px)',
                      boxShadow: `0 0 20px ${workzoneColor.glow}`
                    }}
                  >
                    {WORKZONES.map(zone => (
                      <button
                        key={zone.id}
                        className="block w-full px-3 py-1.5 text-xs text-left rounded hover:bg-cyan-500/20 transition-colors"
                        style={{ color: activeWorkzone?.id === zone.id ? workzoneColor.accent : '#94a3b8' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectWorkzone(zone);
                        }}
                      >
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 bg-${zone.color}-500`} />
                        {zone.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* === STARK UPGRADE: Convert Submenu Ring === */}
        {showConvertSubmenu && convertTargets.length > 0 && (
          <div
            className="absolute pointer-events-auto"
            style={{
              width: (radius + 100) * 2,
              height: (radius + 100) * 2,
              left: -(radius + 100),
              top: -(radius + 100),
              animation: 'submenuOpen 200ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Submenu backdrop ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.2), inset 0 0 40px rgba(139, 92, 246, 0.1)'
              }}
            />
            
            {/* Submenu items */}
            {convertTargets.map((target, index) => {
              const totalTargets = convertTargets.length;
              const subAngle = (2 * Math.PI / totalTargets) * index - Math.PI / 2;
              const subX = Math.cos(subAngle) * (radius + 85);
              const subY = Math.sin(subAngle) * (radius + 85);
              
              // Icon mapping for convert targets
              const targetIconMap = {
                task: ListChecks,
                goal: Target,
                note: FileText,
                projectElement: Box
              };
              const TargetIcon = targetIconMap[target.type] || Box;
              
              return (
                <div
                  key={target.type}
                  className="absolute cursor-pointer transition-all duration-150 hover:scale-110"
                  style={{
                    left: subX + radius + 100,
                    top: subY + radius + 100,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    executeConvertTarget(target.type);
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <TargetIcon className="w-4 h-4 text-violet-400" />
                    </div>
                    <span
                      className="text-[9px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: '#a78bfa'
                      }}
                    >
                      {target.label}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Close submenu button */}
            <div
              className="absolute cursor-pointer"
              style={{
                left: '50%',
                bottom: 15,
                transform: 'translateX(-50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowConvertSubmenu(false);
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-800/80 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </div>
            </div>
          </div>
        )}
        
        {/* === STARK UPGRADE: Item Type Label in Center === */}
        {itemTypeTheme && workzoneColor.itemLabel && (
          <div
            className="absolute text-[8px] font-medium tracking-wider uppercase"
            style={{
              left: '50%',
              bottom: -(radius + 55),
              transform: 'translateX(-50%)',
              color: itemTypeTheme.accentColor,
              textShadow: `0 0 10px ${itemTypeTheme.glowColor}`,
              opacity: 0.8
            }}
          >
            {workzoneColor.itemLabel}
          </div>
        )}
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes wheelOpen {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes submenuOpen {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes deleteFlash {
          0% {
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.3), 0 0 24px rgba(34, 211, 238, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.5);
          }
          100% {
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.3), 0 0 24px rgba(34, 211, 238, 0.3);
          }
        }
        
        @keyframes itemTypeGlow {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        /* Micro Pulse - very subtle 3-5% intensity change */
        @keyframes corePulse {
          0%, 100% {
            opacity: 0.95;
          }
          50% {
            opacity: 1;
          }
        }
        
        /* Core tint breathing - ultra subtle */
        @keyframes coreTint {
          0%, 100% {
            opacity: 0.97;
          }
          50% {
            opacity: 1;
          }
        }
        
        /* Ring breathing - subtle glow variation */
        @keyframes ringBreathe {
          0%, 100% {
            opacity: 0.97;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.03);
          }
        }
      `}</style>
    </div>
  );
};

export default CommandWheel;
