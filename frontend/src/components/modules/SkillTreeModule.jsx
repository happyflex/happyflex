/**
 * SkillTreeModule
 * 
 * Tony Stark HUD-style skill visualization.
 * Displays user abilities in a radiální tree structure.
 * 
 * Features:
 * - Central CORE node (user)
 * - Radiální layout with category branches
 * - Multi-level subskill hierarchy
 * - Level-based glow visualization
 * - Add/edit/delete skills
 * - Drag to reparent
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Plus, Trash2, ChevronRight, Zap, Book, Dumbbell } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { ScrollArea } from '../ui/scroll-area';
import ModuleHeader from './ModuleHeader';
import { toast } from '../../hooks/use-toast';

// Storage key
const STORAGE_KEY = 'steward_skill_tree';

// Default skill tree structure
const DEFAULT_SKILL_TREE = {
  id: 'core',
  name: 'CORE',
  category: 'core',
  level: 100,
  parentId: null,
  children: [
    {
      id: 'physical',
      name: 'Physical',
      category: 'physical',
      level: 50,
      parentId: 'core',
      children: []
    },
    {
      id: 'skills',
      name: 'Skills',
      category: 'skill',
      level: 50,
      parentId: 'core',
      children: []
    },
    {
      id: 'knowledge',
      name: 'Knowledge',
      category: 'knowledge',
      level: 50,
      parentId: 'core',
      children: []
    }
  ]
};

// Category colors
const CATEGORY_COLORS = {
  core: { primary: '#22d3ee', glow: 'rgba(34, 211, 238, 0.6)', bg: 'rgba(34, 211, 238, 0.1)' },
  physical: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.6)', bg: 'rgba(249, 115, 22, 0.1)' },
  skill: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)', bg: 'rgba(168, 85, 247, 0.1)' },
  knowledge: { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)', bg: 'rgba(34, 197, 94, 0.1)' }
};

// Category icons
const CATEGORY_ICONS = {
  core: Zap,
  physical: Dumbbell,
  skill: Brain,
  knowledge: Book
};

/**
 * Calculate glow intensity based on level
 */
const getLevelGlow = (level, color) => {
  if (level < 20) return { opacity: 0.3, blur: 4 };
  if (level < 60) return { opacity: 0.6, blur: 8 };
  return { opacity: 1, blur: 16 };
};

/**
 * Flatten tree to array for easy lookup
 */
const flattenTree = (node, result = []) => {
  result.push(node);
  if (node.children) {
    node.children.forEach(child => flattenTree(child, result));
  }
  return result;
};

/**
 * Find node by ID in tree
 */
const findNode = (tree, id) => {
  if (tree.id === id) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Check if nodeId is descendant of ancestorId
 */
const isDescendant = (tree, nodeId, ancestorId) => {
  const ancestor = findNode(tree, ancestorId);
  if (!ancestor) return false;
  
  const checkChildren = (node) => {
    if (node.id === nodeId) return true;
    if (node.children) {
      return node.children.some(checkChildren);
    }
    return false;
  };
  
  return checkChildren(ancestor);
};

/**
 * Remove node from tree (returns new tree)
 */
const removeNode = (tree, nodeId) => {
  if (tree.id === nodeId) return null;
  
  return {
    ...tree,
    children: tree.children
      ? tree.children
          .filter(child => child.id !== nodeId)
          .map(child => removeNode(child, nodeId))
          .filter(Boolean)
      : []
  };
};

/**
 * Add child to node (returns new tree)
 */
const addChildToNode = (tree, parentId, newChild) => {
  if (tree.id === parentId) {
    return {
      ...tree,
      children: [...(tree.children || []), newChild]
    };
  }
  
  return {
    ...tree,
    children: tree.children
      ? tree.children.map(child => addChildToNode(child, parentId, newChild))
      : []
  };
};

/**
 * Update node in tree (returns new tree)
 */
const updateNode = (tree, nodeId, updates) => {
  if (tree.id === nodeId) {
    return { ...tree, ...updates, updatedAt: Date.now() };
  }
  
  return {
    ...tree,
    children: tree.children
      ? tree.children.map(child => updateNode(child, nodeId, updates))
      : []
  };
};

// ============================================================================
// SKILL NODE COMPONENT
// ============================================================================

const SkillNode = ({ 
  node, 
  x, 
  y, 
  isSelected, 
  onSelect, 
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.skill;
  const Icon = CATEGORY_ICONS[node.category] || Brain;
  const glow = getLevelGlow(node.level, colors);
  const isCore = node.id === 'core';
  const nodeSize = isCore ? 60 : 40;
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
      draggable={!isCore}
      onDragStart={(e) => !isCore && onDragStart(e, node)}
      onDragOver={(e) => onDragOver(e, node)}
      onDrop={(e) => onDrop(e, node)}
    >
      {/* Outer glow ring */}
      <circle
        r={nodeSize + 8}
        fill="none"
        stroke={colors.primary}
        strokeWidth={2}
        opacity={glow.opacity * 0.3}
        filter={`blur(${glow.blur}px)`}
      />
      
      {/* Level ring (progress) */}
      <circle
        r={nodeSize + 4}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
        strokeDasharray={`${(node.level / 100) * 2 * Math.PI * (nodeSize + 4)} ${2 * Math.PI * (nodeSize + 4)}`}
        strokeLinecap="round"
        opacity={0.8}
        transform="rotate(-90)"
      />
      
      {/* Main node circle */}
      <circle
        r={nodeSize}
        fill={colors.bg}
        stroke={colors.primary}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isSelected ? 1 : 0.9}
        style={{
          filter: isSelected ? `drop-shadow(0 0 ${glow.blur}px ${colors.glow})` : 'none'
        }}
      />
      
      {/* Inner decoration ring */}
      <circle
        r={nodeSize - 8}
        fill="none"
        stroke={colors.primary}
        strokeWidth={1}
        opacity={0.4}
        strokeDasharray="4 4"
      />
      
      {/* Icon */}
      <foreignObject 
        x={-12} 
        y={-12} 
        width={24} 
        height={24}
        style={{ pointerEvents: 'none' }}
      >
        <Icon 
          className="w-6 h-6" 
          style={{ color: colors.primary }} 
        />
      </foreignObject>
      
      {/* Level text */}
      {!isCore && (
        <text
          y={nodeSize + 16}
          textAnchor="middle"
          fill={colors.primary}
          fontSize={10}
          fontFamily="monospace"
          opacity={0.8}
        >
          LVL {node.level}
        </text>
      )}
      
      {/* Name label */}
      <text
        y={nodeSize + (isCore ? 20 : 28)}
        textAnchor="middle"
        fill="white"
        fontSize={isCore ? 14 : 11}
        fontWeight={isCore ? 'bold' : 'normal'}
        fontFamily="system-ui"
      >
        {node.name}
      </text>
    </g>
  );
};

// ============================================================================
// MAIN SKILL TREE MODULE
// ============================================================================

const SkillTreeModule = () => {
  const [skillTree, setSkillTree] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('skill');
  const [draggedNode, setDraggedNode] = useState(null);
  const svgRef = useRef(null);
  const viewportRef = useRef(null); // SkillTreeViewport ref
  const [viewportSize, setViewportSize] = useState({ width: 400, height: 300 }); // Default valid size
  const sizeRef = useRef({ width: 400, height: 300 }); // Track size without re-renders

  // Load skill tree from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSkillTree(JSON.parse(saved));
      } else {
        setSkillTree(DEFAULT_SKILL_TREE);
      }
    } catch (e) {
      console.error('Error loading skill tree:', e);
      setSkillTree(DEFAULT_SKILL_TREE);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (skillTree) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(skillTree));
      } catch (e) {
        console.error('Error saving skill tree:', e);
      }
    }
  }, [skillTree]);

  // Update viewport size using ResizeObserver on SkillTreeViewport
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const rect = viewport.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      
      // Only update state if size actually changed (use ref to track)
      if (newWidth > 50 && newHeight > 50) {
        if (newWidth !== sizeRef.current.width || newHeight !== sizeRef.current.height) {
          sizeRef.current = { width: newWidth, height: newHeight };
          setViewportSize({ width: newWidth, height: newHeight });
        }
      }
    };

    // Initial size with delay
    const timeoutId = setTimeout(updateSize, 100);

    // ResizeObserver with debounce
    let rafId = null;
    const resizeObserver = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateSize);
    });

    resizeObserver.observe(viewport);
    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate node positions using radiální layout
  const calculatePositions = useCallback(() => {
    if (!skillTree || viewportSize.width < 100 || viewportSize.height < 100) return [];
    
    const positions = [];
    const centerX = viewportSize.width / 2;
    const centerY = viewportSize.height / 2;
    
    // Recursive function to calculate positions
    const layoutNode = (node, depth, angleStart, angleEnd, parentX, parentY) => {
      const radius = depth === 0 ? 0 : 80 + (depth - 1) * 100;
      const angle = (angleStart + angleEnd) / 2;
      const angleRad = (angle * Math.PI) / 180;
      
      const x = depth === 0 ? centerX : parentX + radius * Math.cos(angleRad);
      const y = depth === 0 ? centerY : parentY + radius * Math.sin(angleRad);
      
      positions.push({ node, x, y, parentX, parentY, depth });
      
      if (node.children && node.children.length > 0) {
        const childAngleSpan = (angleEnd - angleStart) / node.children.length;
        node.children.forEach((child, index) => {
          const childAngleStart = angleStart + index * childAngleSpan;
          const childAngleEnd = childAngleStart + childAngleSpan;
          layoutNode(child, depth + 1, childAngleStart, childAngleEnd, x, y);
        });
      }
    };
    
    // Start layout from root
    layoutNode(skillTree, 0, 0, 360, centerX, centerY);
    
    return positions;
  }, [skillTree, viewportSize]);

  const nodePositions = calculatePositions();

  // Handle node selection
  const handleSelectNode = (node) => {
    setSelectedNode(node);
    setContextMenu(null);
  };

  // Handle right-click context menu
  const handleContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't allow context menu on core
    if (node.id === 'core') return;
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  // Close context menu
  const closeContextMenu = () => setContextMenu(null);

  // Add subskill
  const handleAddSubskill = (parentNode) => {
    setSelectedNode(parentNode);
    setIsAddingSkill(true);
    setNewSkillName('');
    setNewSkillCategory(parentNode.category === 'core' ? 'skill' : parentNode.category);
    closeContextMenu();
  };

  // Confirm add skill
  const confirmAddSkill = () => {
    if (!newSkillName.trim() || !selectedNode) return;
    
    const newSkill = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: 0,
      parentId: selectedNode.id,
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setSkillTree(prev => addChildToNode(prev, selectedNode.id, newSkill));
    setIsAddingSkill(false);
    setNewSkillName('');
    
    toast({
      title: 'Skill přidán',
      description: `"${newSkill.name}" byl přidán`
    });
  };

  // Delete skill
  const handleDeleteSkill = (node) => {
    if (node.id === 'core' || ['physical', 'skills', 'knowledge'].includes(node.id)) {
      toast({
        title: 'Nelze smazat',
        description: 'Základní kategorie nelze odstranit',
        variant: 'destructive'
      });
      return;
    }
    
    setSkillTree(prev => removeNode(prev, node.id));
    setSelectedNode(null);
    closeContextMenu();
    
    toast({
      title: 'Skill smazán',
      description: `"${node.name}" byl odstraněn`
    });
  };

  // Update skill level
  const handleLevelChange = (value) => {
    if (!selectedNode || selectedNode.id === 'core') return;
    
    setSkillTree(prev => updateNode(prev, selectedNode.id, { level: value[0] }));
    setSelectedNode(prev => ({ ...prev, level: value[0] }));
  };

  // Update skill name
  const handleNameChange = (name) => {
    if (!selectedNode || selectedNode.id === 'core') return;
    
    setSkillTree(prev => updateNode(prev, selectedNode.id, { name }));
    setSelectedNode(prev => ({ ...prev, name }));
  };

  // Drag handlers
  const handleDragStart = (e, node) => {
    setDraggedNode(node);
    e.dataTransfer.setData('text/plain', node.id);
  };

  const handleDragOver = (e, node) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetNode) => {
    e.preventDefault();
    
    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDraggedNode(null);
      return;
    }
    
    // Prevent cycle: target cannot be descendant of dragged node
    if (isDescendant(skillTree, targetNode.id, draggedNode.id)) {
      toast({
        title: 'Neplatný přesun',
        description: 'Nelze přesunout do vlastního potomka',
        variant: 'destructive'
      });
      setDraggedNode(null);
      return;
    }
    
    // Remove from current position and add to new parent
    let newTree = removeNode(skillTree, draggedNode.id);
    const updatedDraggedNode = { ...draggedNode, parentId: targetNode.id };
    newTree = addChildToNode(newTree, targetNode.id, updatedDraggedNode);
    
    setSkillTree(newTree);
    setDraggedNode(null);
    
    toast({
      title: 'Skill přesunut',
      description: `"${draggedNode.name}" přesunut do "${targetNode.name}"`
    });
  };

  // Click outside to close context menu
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (!skillTree) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-cyan-400">Načítání Skill Tree...</div>
      </div>
    );
  }

  const allNodes = flattenTree(skillTree);
  const skillCount = allNodes.length - 1; // Exclude core
  const avgLevel = skillCount > 0 
    ? Math.round(allNodes.filter(n => n.id !== 'core').reduce((sum, n) => sum + n.level, 0) / skillCount)
    : 0;

  return (
    <div className="h-full flex flex-col min-h-0 min-w-0">
      {/* Header with padding - consistent with other modules */}
      <div className="pl-[18px] pr-6 pt-4">
        <ModuleHeader
          icon={Brain}
          title="Skill Tree"
          subtitle={`${skillCount} skills · Avg LVL ${avgLevel}`}
          iconColor="text-purple-400"
          actions={
            <Button
              size="sm"
              onClick={() => handleAddSubskill(skillTree)}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nový Skill
            </Button>
          }
        />
      </div>

      {/* SkillTreeRoot - main content area */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0 h-full">
        {/* LeftPane - visualization area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full">
          {/* SkillTreeViewport - the actual canvas/workspace */}
          <div 
            ref={viewportRef}
            className="flex-1 w-full h-full min-h-0 min-w-0 relative overflow-hidden bg-[#050a15]"
          >
            {/* Only render SVG if viewport has valid size */}
            {viewportSize.width >= 100 && viewportSize.height >= 100 ? (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="absolute inset-0"
                style={{ display: 'block' }}
              >
                {/* Background grid pattern */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34, 211, 238, 0.05)" strokeWidth="1"/>
                  </pattern>
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 211, 238, 0.2)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                  </radialGradient>
                </defs>
                
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Center glow */}
                <circle 
                  cx={viewportSize.width / 2} 
                  cy={viewportSize.height / 2} 
                  r={200} 
                  fill="url(#centerGlow)" 
                />
                
                {/* Connection lines */}
                {nodePositions.filter(p => p.depth > 0).map(({ node, x, y, parentX, parentY }) => {
                  const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.skill;
                  return (
                    <line
                      key={`line-${node.id}`}
                      x1={parentX}
                      y1={parentY}
                      x2={x}
                      y2={y}
                      stroke={colors.primary}
                      strokeWidth={2}
                      opacity={0.4}
                      strokeDasharray="8 4"
                    />
                  );
                })}
                
                {/* Nodes */}
                {nodePositions.map(({ node, x, y }) => (
                  <SkillNode
                    key={node.id}
                    node={node}
                    x={x}
                    y={y}
                    isSelected={selectedNode?.id === node.id}
                    onSelect={handleSelectNode}
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </svg>
            ) : null}

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed z-50 bg-[#0a1628] border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/20 py-1 min-w-[160px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-cyan-500/20 flex items-center gap-2"
                  onClick={() => handleAddSubskill(contextMenu.node)}
                >
                  <Plus className="h-4 w-4 text-cyan-400" />
                  Přidat Subskill
                </button>
                {!['physical', 'skills', 'knowledge'].includes(contextMenu.node.id) && (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                    onClick={() => handleDeleteSkill(contextMenu.node)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Smazat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RightSidebar - Detail Panel */}
        {selectedNode && (
          <div className="flex-shrink-0 w-64 h-full min-h-0 border-l border-cyan-500/20 bg-[#0a1628]/80 p-4 overflow-y-auto">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-cyan-400" />
              Detail Skillu
            </h3>
            
            {selectedNode.id === 'core' ? (
              <div className="text-gray-400 text-sm">
                CORE reprezentuje uživatele a nelze jej upravovat.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Název</label>
                  <Input
                    value={selectedNode.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="mt-1 bg-[#0f1d35] border-cyan-500/30 text-white"
                  />
                </div>
                
                {/* Level */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">
                    Level: {selectedNode.level}
                  </label>
                  <Slider
                    value={[selectedNode.level]}
                    onValueChange={handleLevelChange}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
                
                {/* Category */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Kategorie</label>
                  <div 
                    className="mt-1 px-3 py-2 rounded bg-[#0f1d35] border border-cyan-500/30 text-sm"
                    style={{ color: CATEGORY_COLORS[selectedNode.category]?.primary || '#fff' }}
                  >
                    {selectedNode.category === 'physical' && 'Physical'}
                    {selectedNode.category === 'skill' && 'Skills'}
                    {selectedNode.category === 'knowledge' && 'Knowledge'}
                  </div>
                </div>
                
                {/* Parent */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Parent</label>
                  <div className="mt-1 px-3 py-2 rounded bg-[#0f1d35] border border-cyan-500/30 text-gray-400 text-sm">
                    {findNode(skillTree, selectedNode.parentId)?.name || 'CORE'}
                  </div>
                </div>
                
                {/* Actions */}
                {!['physical', 'skills', 'knowledge'].includes(selectedNode.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSkill(selectedNode)}
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Smazat Skill
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Skill Dialog */}
      {isAddingSkill && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0a1628] border border-cyan-500/30 rounded-lg p-6 w-80 shadow-lg shadow-cyan-500/20">
            <h3 className="text-white font-semibold mb-4">Nový Skill</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Název</label>
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Název skillu..."
                  className="mt-1 bg-[#0f1d35] border-cyan-500/30 text-white"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmAddSkill()}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Kategorie</label>
                <div className="mt-1 flex gap-2">
                  {['physical', 'skill', 'knowledge'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewSkillCategory(cat)}
                      className={`px-3 py-1.5 rounded text-xs border transition-all ${
                        newSkillCategory === cat
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {cat === 'physical' && 'Physical'}
                      {cat === 'skill' && 'Skill'}
                      {cat === 'knowledge' && 'Knowledge'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">
                  Parent: {selectedNode?.name}
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="ghost"
                className="flex-1 text-gray-400"
                onClick={() => setIsAddingSkill(false)}
              >
                Zrušit
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white"
                onClick={confirmAddSkill}
                disabled={!newSkillName.trim()}
              >
                Přidat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillTreeModule;
