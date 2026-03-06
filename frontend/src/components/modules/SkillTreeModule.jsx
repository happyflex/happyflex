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
import { PersonStanding, Plus, Trash2, ChevronRight, Zap, Book, Dumbbell, Brain } from 'lucide-react';
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
  if (!node) return result;
  result.push(node);
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => flattenTree(child, result));
  }
  return result;
};

/**
 * Find node by ID in tree
 */
const findNode = (tree, id) => {
  if (!tree || !id) return null;
  if (tree.id === id) return tree;
  if (tree.children && Array.isArray(tree.children)) {
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
  if (!tree || !nodeId || !ancestorId) return false;
  const ancestor = findNode(tree, ancestorId);
  if (!ancestor) return false;
  
  const checkChildren = (node) => {
    if (!node) return false;
    if (node.id === nodeId) return true;
    if (node.children && Array.isArray(node.children)) {
      return node.children.some(checkChildren);
    }
    return false;
  };
  
  return checkChildren(ancestor);
};

/**
 * Get all descendants of a node (for cycle prevention)
 */
const getAllDescendantIds = (node, ids = new Set()) => {
  if (!node) return ids;
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (child && child.id) {
        ids.add(child.id);
        getAllDescendantIds(child, ids);
      }
    });
  }
  return ids;
};

/**
 * Check if changing parent would create a cycle
 */
const wouldCreateCycle = (tree, nodeId, newParentId) => {
  if (!tree || !nodeId || !newParentId) return false;
  // Can't set self as parent
  if (nodeId === newParentId) return true;
  // Can't set a descendant as parent
  const node = findNode(tree, nodeId);
  if (!node) return false;
  const descendants = getAllDescendantIds(node);
  return descendants.has(newParentId);
};

/**
 * Get valid parent options for a node (excludes self and descendants)
 */
const getValidParentOptions = (tree, excludeNodeId = null) => {
  const allNodes = flattenTree(tree);
  
  if (!excludeNodeId) {
    // For new node, all existing nodes are valid
    return allNodes.map(n => ({ id: n.id, name: n.name, category: n.category }));
  }
  
  const nodeToExclude = findNode(tree, excludeNodeId);
  const descendantIds = nodeToExclude ? getAllDescendantIds(nodeToExclude) : new Set();
  
  return allNodes
    .filter(n => n.id !== excludeNodeId && !descendantIds.has(n.id))
    .map(n => ({ id: n.id, name: n.name, category: n.category }));
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
// GALAXY MAP LAYOUT CONSTANTS
// ============================================================================

const ORBIT_RADII = {
  0: 0,      // CORE at center
  1: 180,   // Primary skills orbit
  2: 320,   // Subskills orbit
  3: 460,   // Sub-subskills orbit
  4: 580    // Level 4+ orbit
};

const NODE_SIZES = {
  core: 110,     // CORE - largest, visual center of skill tree (Vitruvian scale)
  primary: 45,   // Primary skills
  secondary: 35, // Subskills
  tertiary: 28   // Sub-subskills
};

// ============================================================================
// CORE NODE COMPONENT - Vitruvian Man HUD / JARVIS Holographic Scanner
// ============================================================================

const CoreNode = ({ 
  node, 
  x, 
  y, 
  isSelected,
  onSelect,
  totalSkills = 0
}) => {
  const colors = CATEGORY_COLORS.core;
  const nodeSize = NODE_SIZES.core;
  
  // User data for HUD panels
  const userData = {
    age: 29,
    energy: 74,
    focus: 61,
    skills: totalSkills || 10
  };
  
  // Vitruvian proportions (scaled for nodeSize)
  const scale = nodeSize / 110; // Base scale factor
  const vs = (v) => v * scale;  // Scale helper
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(node)}
    >
      {/* ===== SVG DEFINITIONS ===== */}
      <defs>
        {/* Glow filter for biometric points */}
        <filter id="bioGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Strong glow for main energy points */}
        <filter id="strongGlow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Radial gradient for inner glow */}
        <radialGradient id="coreInnerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.15)" />
          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.05)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
        </radialGradient>
        
        {/* Gradient for ring segments */}
        <linearGradient id="ringSegmentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.1)" />
          <stop offset="50%" stopColor="rgba(34, 211, 238, 0.8)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.1)" />
        </linearGradient>
      </defs>
      
      {/* ===== OUTER ROTATING RINGS (3-4 layers) ===== */}
      
      {/* Ring 4 - Outermost, slow rotation */}
      <circle
        r={nodeSize + 35}
        fill="none"
        stroke={colors.primary}
        strokeWidth={1}
        opacity={0.2}
        strokeDasharray="4 12"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="60s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Ring 3 - Segmented HUD ring */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="25s"
          repeatCount="indefinite"
        />
        <circle
          r={nodeSize + 28}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          opacity={0.4}
          strokeDasharray="30 10 8 10 30 10 8 10"
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
        />
        {/* Bright segment markers */}
        {[0, 90, 180, 270].map((angle, i) => (
          <circle
            key={`marker-${i}`}
            cx={Math.cos((angle * Math.PI) / 180) * (nodeSize + 28)}
            cy={Math.sin((angle * Math.PI) / 180) * (nodeSize + 28)}
            r={3}
            fill={colors.primary}
            opacity={0.8}
            filter="url(#bioGlow)"
          />
        ))}
      </g>
      
      {/* Ring 2 - Counter-rotating inner ring */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="360"
          to="0"
          dur="18s"
          repeatCount="indefinite"
        />
        <circle
          r={nodeSize + 18}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1.5}
          opacity={0.5}
          strokeDasharray="20 5 5 5 20 5 5 5"
          style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
        />
      </g>
      
      {/* Ring 1 - Inner accent ring with tick marks */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="-360"
          dur="40s"
          repeatCount="indefinite"
        />
        {/* Tick marks around inner ring */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const r1 = nodeSize + 8;
          const r2 = nodeSize + 12;
          const isMajor = i % 9 === 0;
          return (
            <line
              key={`tick-${i}`}
              x1={Math.cos(angle) * r1}
              y1={Math.sin(angle) * r1}
              x2={Math.cos(angle) * (isMajor ? r2 + 3 : r2)}
              y2={Math.sin(angle) * (isMajor ? r2 + 3 : r2)}
              stroke={colors.primary}
              strokeWidth={isMajor ? 2 : 0.5}
              opacity={isMajor ? 0.8 : 0.3}
            />
          );
        })}
      </g>
      
      {/* ===== MAIN CORE CIRCLE ===== */}
      <circle
        r={nodeSize + 5}
        fill="none"
        stroke={colors.primary}
        strokeWidth={2}
        opacity={0.6}
        style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
      />
      <circle
        r={nodeSize}
        fill="rgba(5, 15, 30, 0.95)"
        stroke={colors.primary}
        strokeWidth={isSelected ? 3 : 2}
        style={{ filter: `drop-shadow(0 0 ${isSelected ? 20 : 12}px ${colors.glow})` }}
      />
      
      {/* Inner glow */}
      <circle
        r={nodeSize - 2}
        fill="url(#coreInnerGlow)"
      />
      
      {/* ===== BLUEPRINT GRID BACKGROUND ===== */}
      <clipPath id="vitruvianClip">
        <circle r={nodeSize - 4} />
      </clipPath>
      <g clipPath="url(#vitruvianClip)" opacity={0.06}>
        {/* Grid lines */}
        {Array.from({ length: 11 }).map((_, i) => {
          const pos = -nodeSize + (i * nodeSize * 2) / 10;
          return (
            <g key={`grid-${i}`}>
              <line x1={pos} y1={-nodeSize} x2={pos} y2={nodeSize} stroke={colors.primary} strokeWidth={0.5} />
              <line x1={-nodeSize} y1={pos} x2={nodeSize} y2={pos} stroke={colors.primary} strokeWidth={0.5} />
            </g>
          );
        })}
      </g>
      
      {/* ===== VITRUVIAN GEOMETRY (Circle + Square) ===== */}
      <g opacity={0.15}>
        {/* Vitruvian circle */}
        <circle
          r={vs(75)}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
        />
        {/* Vitruvian square */}
        <rect
          x={vs(-60)}
          y={vs(-60)}
          width={vs(120)}
          height={vs(120)}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
        />
      </g>
      
      {/* ===== VITRUVIAN MAN - DETAILED WIREFRAME ===== */}
      <g style={{ filter: `drop-shadow(0 0 3px ${colors.glow})` }}>
        
        {/* === HEAD === */}
        <ellipse cx={0} cy={vs(-52)} rx={vs(12)} ry={vs(14)} fill="none" stroke={colors.primary} strokeWidth={1.2} opacity={0.8} />
        <ellipse cx={0} cy={vs(-52)} rx={vs(8)} ry={vs(10)} fill="none" stroke={colors.primary} strokeWidth={0.5} opacity={0.4} />
        {/* Face details */}
        <line x1={vs(-4)} y1={vs(-55)} x2={vs(-4)} y2={vs(-50)} stroke={colors.primary} strokeWidth={0.5} opacity={0.3} />
        <line x1={vs(4)} y1={vs(-55)} x2={vs(4)} y2={vs(-50)} stroke={colors.primary} strokeWidth={0.5} opacity={0.3} />
        
        {/* === NECK === */}
        <line x1={vs(-5)} y1={vs(-38)} x2={vs(-7)} y2={vs(-30)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        <line x1={vs(5)} y1={vs(-38)} x2={vs(7)} y2={vs(-30)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        
        {/* === TORSO - Primary position === */}
        <path
          d={`M ${vs(-7)} ${vs(-30)} 
              L ${vs(-25)} ${vs(-26)} 
              L ${vs(-22)} ${vs(0)} 
              L ${vs(-18)} ${vs(20)} 
              L ${vs(-12)} ${vs(22)} 
              L ${vs(0)} ${vs(24)} 
              L ${vs(12)} ${vs(22)} 
              L ${vs(18)} ${vs(20)} 
              L ${vs(22)} ${vs(0)} 
              L ${vs(25)} ${vs(-26)} 
              L ${vs(7)} ${vs(-30)} Z`}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
          opacity={0.6}
        />
        {/* Spine */}
        <line x1={0} y1={vs(-30)} x2={0} y2={vs(22)} stroke={colors.primary} strokeWidth={1.2} opacity={0.7} />
        {/* Ribs hint */}
        <path
          d={`M ${vs(-18)} ${vs(-15)} Q ${vs(0)} ${vs(-10)} ${vs(18)} ${vs(-15)}`}
          fill="none"
          stroke={colors.primary}
          strokeWidth={0.5}
          opacity={0.3}
        />
        <path
          d={`M ${vs(-20)} ${vs(-5)} Q ${vs(0)} ${vs(0)} ${vs(20)} ${vs(-5)}`}
          fill="none"
          stroke={colors.primary}
          strokeWidth={0.5}
          opacity={0.3}
        />
        
        {/* === ARMS - Primary position (horizontal) === */}
        {/* Left arm */}
        <line x1={vs(-25)} y1={vs(-26)} x2={vs(-45)} y2={vs(-20)} stroke={colors.primary} strokeWidth={1.2} opacity={0.8} />
        <line x1={vs(-45)} y1={vs(-20)} x2={vs(-65)} y2={vs(-15)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        <ellipse cx={vs(-68)} cy={vs(-14)} rx={vs(5)} ry={vs(4)} fill="none" stroke={colors.primary} strokeWidth={0.8} opacity={0.6} />
        {/* Right arm */}
        <line x1={vs(25)} y1={vs(-26)} x2={vs(45)} y2={vs(-20)} stroke={colors.primary} strokeWidth={1.2} opacity={0.8} />
        <line x1={vs(45)} y1={vs(-20)} x2={vs(65)} y2={vs(-15)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        <ellipse cx={vs(68)} cy={vs(-14)} rx={vs(5)} ry={vs(4)} fill="none" stroke={colors.primary} strokeWidth={0.8} opacity={0.6} />
        
        {/* === ARMS - Secondary position (raised) === */}
        {/* Left arm raised */}
        <line x1={vs(-25)} y1={vs(-26)} x2={vs(-50)} y2={vs(-45)} stroke={colors.primary} strokeWidth={0.8} opacity={0.35} />
        <line x1={vs(-50)} y1={vs(-45)} x2={vs(-70)} y2={vs(-55)} stroke={colors.primary} strokeWidth={0.6} opacity={0.3} />
        <ellipse cx={vs(-73)} cy={vs(-57)} rx={vs(4)} ry={vs(3)} fill="none" stroke={colors.primary} strokeWidth={0.5} opacity={0.25} />
        {/* Right arm raised */}
        <line x1={vs(25)} y1={vs(-26)} x2={vs(50)} y2={vs(-45)} stroke={colors.primary} strokeWidth={0.8} opacity={0.35} />
        <line x1={vs(50)} y1={vs(-45)} x2={vs(70)} y2={vs(-55)} stroke={colors.primary} strokeWidth={0.6} opacity={0.3} />
        <ellipse cx={vs(73)} cy={vs(-57)} rx={vs(4)} ry={vs(3)} fill="none" stroke={colors.primary} strokeWidth={0.5} opacity={0.25} />
        
        {/* === PELVIS === */}
        <path
          d={`M ${vs(-12)} ${vs(22)} Q ${vs(0)} ${vs(28)} ${vs(12)} ${vs(22)}`}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
          opacity={0.6}
        />
        
        {/* === LEGS - Primary position (together) === */}
        {/* Left leg */}
        <line x1={vs(-10)} y1={vs(24)} x2={vs(-14)} y2={vs(50)} stroke={colors.primary} strokeWidth={1.2} opacity={0.8} />
        <line x1={vs(-14)} y1={vs(50)} x2={vs(-16)} y2={vs(75)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        <ellipse cx={vs(-16)} cy={vs(80)} rx={vs(6)} ry={vs(3)} fill="none" stroke={colors.primary} strokeWidth={0.8} opacity={0.6} />
        {/* Right leg */}
        <line x1={vs(10)} y1={vs(24)} x2={vs(14)} y2={vs(50)} stroke={colors.primary} strokeWidth={1.2} opacity={0.8} />
        <line x1={vs(14)} y1={vs(50)} x2={vs(16)} y2={vs(75)} stroke={colors.primary} strokeWidth={1} opacity={0.7} />
        <ellipse cx={vs(16)} cy={vs(80)} rx={vs(6)} ry={vs(3)} fill="none" stroke={colors.primary} strokeWidth={0.8} opacity={0.6} />
        
        {/* === LEGS - Secondary position (spread) === */}
        {/* Left leg spread */}
        <line x1={vs(-10)} y1={vs(24)} x2={vs(-35)} y2={vs(50)} stroke={colors.primary} strokeWidth={0.8} opacity={0.35} />
        <line x1={vs(-35)} y1={vs(50)} x2={vs(-55)} y2={vs(70)} stroke={colors.primary} strokeWidth={0.6} opacity={0.3} />
        <ellipse cx={vs(-58)} cy={vs(73)} rx={vs(5)} ry={vs(2.5)} fill="none" stroke={colors.primary} strokeWidth={0.5} opacity={0.25} />
        {/* Right leg spread */}
        <line x1={vs(10)} y1={vs(24)} x2={vs(35)} y2={vs(50)} stroke={colors.primary} strokeWidth={0.8} opacity={0.35} />
        <line x1={vs(35)} y1={vs(50)} x2={vs(55)} y2={vs(70)} stroke={colors.primary} strokeWidth={0.6} opacity={0.3} />
        <ellipse cx={vs(58)} cy={vs(73)} rx={vs(5)} ry={vs(2.5)} fill="none" stroke={colors.primary} strokeWidth={0.5} opacity={0.25} />
        
        {/* === BIOMETRIC GLOW POINTS === */}
        
        {/* Forehead / Third eye */}
        <circle cx={0} cy={vs(-55)} r={vs(4)} fill={colors.primary} opacity={0.5} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        
        {/* Chest / Heart */}
        <circle cx={0} cy={vs(-18)} r={vs(6)} fill={colors.primary} opacity={0.6} filter="url(#strongGlow)">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={0} cy={vs(-18)} r={vs(3)} fill="white" opacity={0.8}>
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        
        {/* Solar Plexus */}
        <circle cx={0} cy={vs(0)} r={vs(4)} fill={colors.primary} opacity={0.5} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
        </circle>
        
        {/* Sacral / Genital area */}
        <circle cx={0} cy={vs(22)} r={vs(3)} fill={colors.primary} opacity={0.4} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite" />
        </circle>
        
        {/* Feet energy points */}
        <circle cx={vs(-16)} cy={vs(80)} r={vs(3)} fill={colors.primary} opacity={0.4} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.8s" repeatCount="indefinite" />
        </circle>
        <circle cx={vs(16)} cy={vs(80)} r={vs(3)} fill={colors.primary} opacity={0.4} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.8s" repeatCount="indefinite" />
        </circle>
        
        {/* Hand energy points */}
        <circle cx={vs(-68)} cy={vs(-14)} r={vs(2.5)} fill={colors.primary} opacity={0.35} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.25;0.45;0.25" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx={vs(68)} cy={vs(-14)} r={vs(2.5)} fill={colors.primary} opacity={0.35} filter="url(#bioGlow)">
          <animate attributeName="opacity" values="0.25;0.45;0.25" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>
      
      {/* ===== HORIZONTAL ENERGY LINE (through chest) ===== */}
      <line
        x1={vs(-80)}
        y1={vs(-18)}
        x2={vs(80)}
        y2={vs(-18)}
        stroke={colors.primary}
        strokeWidth={1}
        opacity={0.3}
        style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
      />
      
      {/* ===== HUD DATA PANELS ===== */}
      
      {/* Top-left: AGE */}
      <g transform={`translate(${vs(-55)}, ${vs(-70)})`}>
        <rect x={0} y={0} width={vs(35)} height={vs(28)} fill="rgba(5, 15, 30, 0.7)" stroke={colors.primary} strokeWidth={0.8} rx={2} opacity={0.8} />
        <text x={vs(17.5)} y={vs(11)} textAnchor="middle" fill={colors.primary} fontSize={vs(8)} fontFamily="monospace" opacity={0.7}>
          AGE
        </text>
        <text x={vs(17.5)} y={vs(23)} textAnchor="middle" fill="white" fontSize={vs(12)} fontFamily="monospace" fontWeight="bold" style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}>
          {userData.age}
        </text>
      </g>
      
      {/* Top-right: ENERGY */}
      <g transform={`translate(${vs(20)}, ${vs(-70)})`}>
        <rect x={0} y={0} width={vs(38)} height={vs(28)} fill="rgba(5, 15, 30, 0.7)" stroke={colors.primary} strokeWidth={0.8} rx={2} opacity={0.8} />
        <text x={vs(19)} y={vs(11)} textAnchor="middle" fill={colors.primary} fontSize={vs(7)} fontFamily="monospace" opacity={0.7}>
          ENERGY
        </text>
        <text x={vs(19)} y={vs(23)} textAnchor="middle" fill="white" fontSize={vs(12)} fontFamily="monospace" fontWeight="bold" style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}>
          {userData.energy}%
        </text>
      </g>
      
      {/* Bottom-left: FOCUS */}
      <g transform={`translate(${vs(-55)}, ${vs(42)})`}>
        <rect x={0} y={0} width={vs(38)} height={vs(28)} fill="rgba(5, 15, 30, 0.7)" stroke={colors.primary} strokeWidth={0.8} rx={2} opacity={0.8} />
        <text x={vs(19)} y={vs(11)} textAnchor="middle" fill={colors.primary} fontSize={vs(7)} fontFamily="monospace" opacity={0.7}>
          FOCUS
        </text>
        <text x={vs(19)} y={vs(23)} textAnchor="middle" fill="white" fontSize={vs(12)} fontFamily="monospace" fontWeight="bold" style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}>
          {userData.focus}%
        </text>
      </g>
      
      {/* Bottom-right: SKILLS */}
      <g transform={`translate(${vs(20)}, ${vs(42)})`}>
        <rect x={0} y={0} width={vs(38)} height={vs(28)} fill="rgba(5, 15, 30, 0.7)" stroke={colors.primary} strokeWidth={0.8} rx={2} opacity={0.8} />
        <text x={vs(19)} y={vs(11)} textAnchor="middle" fill={colors.primary} fontSize={vs(7)} fontFamily="monospace" opacity={0.7}>
          SKILLS
        </text>
        <text x={vs(19)} y={vs(23)} textAnchor="middle" fill="white" fontSize={vs(12)} fontFamily="monospace" fontWeight="bold" style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}>
          {userData.skills}
        </text>
      </g>
      
      {/* ===== SCANNING SWEEP EFFECT ===== */}
      <clipPath id="coreScanArea">
        <circle r={nodeSize - 5} />
      </clipPath>
      <g clipPath="url(#coreScanArea)">
        <rect
          x={-nodeSize}
          y={-3}
          width={nodeSize * 2}
          height={6}
          fill="url(#scanSweepGrad)"
          opacity={0.6}
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 ${-nodeSize - 10}; 0 ${nodeSize + 10}; 0 ${nodeSize + 10}`}
            keyTimes="0; 0.3; 1"
            dur="6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            keyTimes="0;0.03;0.27;0.3"
            dur="6s"
            repeatCount="indefinite"
          />
        </rect>
        <defs>
          <linearGradient id="scanSweepGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
            <stop offset="40%" stopColor="rgba(34, 211, 238, 0.6)" />
            <stop offset="50%" stopColor="rgba(34, 211, 238, 1)" />
            <stop offset="60%" stopColor="rgba(34, 211, 238, 0.6)" />
            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
          </linearGradient>
        </defs>
      </g>
      
      {/* ===== CORE LABEL ===== */}
      <text
        y={nodeSize + 48}
        textAnchor="middle"
        fill="white"
        fontSize={20}
        fontWeight="bold"
        fontFamily="system-ui"
        letterSpacing={4}
        style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
      >
        CORE
      </text>
      
      {/* Secondary label */}
      <text
        y={nodeSize + 66}
        textAnchor="middle"
        fill={colors.primary}
        fontSize={9}
        fontFamily="monospace"
        opacity={0.6}
        letterSpacing={3}
      >
        STEWARD USER CORE
      </text>
      
      {/* ===== SELECTION INDICATOR ===== */}
      {isSelected && (
        <g>
          <circle
            r={nodeSize + 45}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
            opacity={0.7}
            strokeDasharray="25 12"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            r={nodeSize + 52}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1}
            opacity={0.4}
            strokeDasharray="8 20"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360"
              to="0"
              dur="6s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </g>
  );
};

// ============================================================================
// SKILL NODE COMPONENT - Galaxy Map Style
// ============================================================================

const SkillNode = ({ 
  node, 
  x, 
  y, 
  depth,
  isSelected,
  isInParentChain,
  labelScale = 1,
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
  
  // Size based on depth
  const getNodeSize = () => {
    if (isCore) return NODE_SIZES.core;
    if (depth === 1) return NODE_SIZES.primary;
    if (depth === 2) return NODE_SIZES.secondary;
    return NODE_SIZES.tertiary;
  };
  
  const nodeSize = getNodeSize();
  const glowIntensity = isCore ? 1.5 : depth === 1 ? 1 : 0.6;
  const highlightBoost = isInParentChain ? 1.3 : 1;
  const safeLabelScale = isNaN(labelScale) ? 1 : labelScale;
  
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
      {/* Outer glow effect - stronger for CORE and highlighted nodes */}
      <circle
        r={nodeSize + 20}
        fill={`url(#glow-${node.category})`}
        opacity={glow.opacity * glowIntensity * highlightBoost * 0.4}
      />
      
      {/* HUD ring - only for CORE and primary */}
      {(isCore || depth === 1) && (
        <>
          <circle
            r={nodeSize + 12}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1}
            opacity={0.3}
            strokeDasharray="8 4"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur={isCore ? "20s" : "30s"}
              repeatCount="indefinite"
            />
          </circle>
          <circle
            r={nodeSize + 8}
            fill="none"
            stroke={colors.primary}
            strokeWidth={1}
            opacity={0.2}
            strokeDasharray="4 8"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360"
              to="0"
              dur={isCore ? "15s" : "25s"}
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
      
      {/* Level progress ring */}
      <circle
        r={nodeSize + 4}
        fill="none"
        stroke={colors.primary}
        strokeWidth={isCore ? 4 : 3}
        strokeDasharray={`${(node.level / 100) * 2 * Math.PI * (nodeSize + 4)} ${2 * Math.PI * (nodeSize + 4)}`}
        strokeLinecap="round"
        opacity={0.9}
        transform="rotate(-90)"
        style={{
          filter: `drop-shadow(0 0 ${glow.blur * glowIntensity}px ${colors.glow})`
        }}
      />
      
      {/* Main node circle */}
      <circle
        r={nodeSize}
        fill={isCore ? 'rgba(10, 22, 40, 0.95)' : colors.bg}
        stroke={colors.primary}
        strokeWidth={isSelected ? 4 : 2}
        style={{
          filter: `drop-shadow(0 0 ${isSelected ? 20 : glow.blur * glowIntensity}px ${colors.glow})`
        }}
      />
      
      {/* Inner decoration ring */}
      {(isCore || depth <= 2) && (
        <circle
          r={nodeSize - 8}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
          opacity={0.4}
          strokeDasharray={isCore ? "6 3" : "4 4"}
        />
      )}
      
      {/* Inner glow */}
      <circle
        r={nodeSize - 12}
        fill={`url(#innerGlow-${node.category})`}
        opacity={0.3}
      />
      
      {/* Icon */}
      <foreignObject 
        x={isCore ? -16 : -12} 
        y={isCore ? -16 : -12} 
        width={isCore ? 32 : 24} 
        height={isCore ? 32 : 24}
        style={{ pointerEvents: 'none' }}
      >
        <Icon 
          className={isCore ? "w-8 h-8" : "w-6 h-6"}
          style={{ color: colors.primary }} 
        />
      </foreignObject>
      
      {/* Level text - positioned based on node size */}
      {!isCore && (
        <text
          y={nodeSize + 14}
          textAnchor="middle"
          fill={colors.primary}
          fontSize={depth <= 2 ? 10 : 9}
          fontFamily="monospace"
          opacity={0.8}
          style={{
            filter: `drop-shadow(0 0 4px ${colors.glow})`
          }}
        >
          LVL {node.level}
        </text>
      )}
      
      {/* Name label - scaled based on zoom */}
      <text
        y={nodeSize + (isCore ? 22 : depth <= 2 ? 26 : 24)}
        textAnchor="middle"
        fill="white"
        fontSize={(isCore ? 16 : depth === 1 ? 12 : 10) * safeLabelScale}
        fontWeight={isCore ? 'bold' : depth === 1 ? '600' : 'normal'}
        fontFamily="system-ui"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))'
        }}
      >
        {node.name}
      </text>
      
      {/* Parent chain highlight */}
      {isInParentChain && !isSelected && (
        <circle
          r={nodeSize + 14}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1.5}
          opacity={0.4}
          strokeDasharray="6 4"
        />
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <circle
          r={nodeSize + 16}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          opacity={0.6}
          strokeDasharray="12 6"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      )}
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
  const [newSkillParentId, setNewSkillParentId] = useState('core'); // Parent for new skill
  const [draggedNode, setDraggedNode] = useState(null);
  const svgRef = useRef(null);
  const viewportRef = useRef(null); // SkillTreeViewport ref
  const resizeObserverRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 400, height: 300 }); // Default valid size

  // Canvas navigation state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Zoom constraints
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 1.8;
  const ZOOM_STEP = 0.1;

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
  // Using callback ref pattern to ensure we attach when element is ready
  const setViewportRef = useCallback((node) => {
    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    
    viewportRef.current = node;
    
    if (node) {
      const updateSize = () => {
        const rect = node.getBoundingClientRect();
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height);
        
        if (newWidth > 50 && newHeight > 50) {
          setViewportSize(prev => {
            if (prev.width !== newWidth || prev.height !== newHeight) {
              return { width: newWidth, height: newHeight };
            }
            return prev;
          });
        }
      };

      // Immediate update
      updateSize();
      
      // Also update after layout settling
      setTimeout(updateSize, 100);

      // ResizeObserver
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(updateSize);
      });
      resizeObserverRef.current.observe(node);
    }
  }, []);

  // Calculate node positions using Galaxy Map radiální layout
  // CORE at center, skills orbit in concentric circles by depth
  const calculatePositions = useCallback(() => {
    if (!skillTree || viewportSize.width < 100 || viewportSize.height < 100) return [];
    
    const positions = [];
    
    // Group nodes by depth level
    const nodesByDepth = {};
    
    const collectNodesByDepth = (node, depth, parentAngle = null) => {
      if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
      nodesByDepth[depth].push({ node, parentAngle });
      
      if (node.children && node.children.length > 0) {
        const childCount = node.children.length;
        // Calculate angle spread for children (max ±25° from parent)
        const maxSpread = depth === 0 ? 360 : Math.min(50, 120 / childCount);
        const startAngle = parentAngle !== null ? parentAngle - maxSpread / 2 : 0;
        const angleStep = childCount > 1 ? maxSpread / (childCount - 1) : 0;
        
        node.children.forEach((child, index) => {
          const childAngle = depth === 0 
            ? (360 / childCount) * index 
            : startAngle + angleStep * index;
          collectNodesByDepth(child, depth + 1, childAngle);
        });
      }
    };
    
    // Collect all nodes by depth
    collectNodesByDepth(skillTree, 0);
    
    // Calculate positions for each depth level
    Object.keys(nodesByDepth).forEach(depthStr => {
      const depth = parseInt(depthStr);
      const nodes = nodesByDepth[depth];
      const radius = ORBIT_RADII[depth] || ORBIT_RADII[4];
      
      nodes.forEach(({ node, parentAngle }, index) => {
        let x, y, angle;
        
        if (depth === 0) {
          // CORE at center
          x = 0;
          y = 0;
          angle = 0;
        } else {
          // Use parent angle for positioning (creates branch effect)
          angle = parentAngle !== null ? parentAngle : (360 / nodes.length) * index;
          const angleRad = (angle * Math.PI) / 180;
          x = Math.cos(angleRad) * radius;
          y = Math.sin(angleRad) * radius;
        }
        
        // Find parent position for line drawing
        let parentX = 0, parentY = 0;
        if (node.parentId) {
          const parentPos = positions.find(p => p.node.id === node.parentId);
          if (parentPos) {
            parentX = parentPos.x;
            parentY = parentPos.y;
          }
        }
        
        positions.push({ 
          node, 
          x, 
          y, 
          parentX, 
          parentY, 
          depth,
          angle
        });
      });
    });
    
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
    setNewSkillParentId(parentNode.id); // Set selected node as default parent
    closeContextMenu();
  };

  // Confirm add skill
  const confirmAddSkill = () => {
    if (!newSkillName.trim() || !skillTree) return;
    
    // Validate parent exists
    const parentNode = findNode(skillTree, newSkillParentId);
    if (!parentNode) {
      toast({
        title: 'Chyba',
        description: 'Parent skill nebyl nalezen',
        variant: 'destructive'
      });
      return;
    }
    
    const newSkill = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: 0,
      parentId: newSkillParentId,
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setSkillTree(prev => addChildToNode(prev, newSkillParentId, newSkill));
    setIsAddingSkill(false);
    setNewSkillName('');
    setNewSkillParentId('core');
    
    toast({
      title: 'Skill přidán',
      description: `"${newSkill.name}" byl přidán pod "${parentNode.name}"`
    });
  };

  // Change parent of existing skill
  const handleParentChange = (newParentId) => {
    if (!selectedNode || !skillTree) return;
    
    // Check for cycle
    if (wouldCreateCycle(skillTree, selectedNode.id, newParentId)) {
      toast({
        title: 'Nelze změnit parent',
        description: 'Změna by vytvořila cyklus v hierarchii',
        variant: 'destructive'
      });
      return;
    }
    
    // Find new parent
    const newParent = findNode(skillTree, newParentId);
    if (!newParent) {
      toast({
        title: 'Chyba',
        description: 'Parent skill nebyl nalezen',
        variant: 'destructive'
      });
      return;
    }
    
    // Remove from old parent and add to new parent
    const updatedNode = { ...selectedNode, parentId: newParentId };
    
    // First remove the node from tree
    let newTree = removeNode(skillTree, selectedNode.id);
    
    // Then add it to new parent
    newTree = addChildToNode(newTree, newParentId, updatedNode);
    
    setSkillTree(newTree);
    setSelectedNode(updatedNode);
    
    toast({
      title: 'Parent změněn',
      description: `"${selectedNode.name}" je nyní pod "${newParent.name}"`
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

  // Pan handlers
  const handlePanStart = useCallback((e) => {
    // Only start pan on middle mouse button or when not clicking on a node
    if (e.button === 1 || (e.button === 0 && !e.target.closest('g[style*="cursor: pointer"]'))) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  }, [pan]);

  const handlePanMove = useCallback((e) => {
    if (!isPanning) return;
    
    const deltaX = e.clientX - panStartRef.current.x;
    const deltaY = e.clientY - panStartRef.current.y;
    
    setPan({
      x: panStartRef.current.panX + deltaX,
      y: panStartRef.current.panY + deltaY
    });
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handler - Ctrl + wheel to zoom, centered on cursor position
  const handleWheel = useCallback((e) => {
    // Only zoom with Ctrl key held
    if (!e.ctrlKey) return;
    
    e.preventDefault();
    
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    const rect = viewport.getBoundingClientRect();
    
    // Cursor position relative to viewport
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    // Calculate new zoom (step-based)
    const direction = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + direction * ZOOM_STEP));
    
    if (newZoom === zoom) return;
    
    // Zoom centered on cursor position
    const zoomRatio = newZoom / zoom;
    const newPanX = cursorX - (cursorX - pan.x) * zoomRatio;
    const newPanY = cursorY - (cursorY - pan.y) * zoomRatio;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  // Zoom in/out buttons
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(ZOOM_MAX, zoom + ZOOM_STEP);
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(ZOOM_MIN, zoom - ZOOM_STEP);
    setZoom(newZoom);
  }, [zoom]);

  // Attach wheel event with passive: false to enable preventDefault
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Reset view to center
  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  // Focus on selected node - center view on the node
  const focusOnSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    
    // Find position of selected node
    const nodePos = nodePositions.find(p => p.node.id === selectedNode.id);
    if (!nodePos) return;
    
    // Calculate pan to center the node
    // Node is at (nodePos.x, nodePos.y) in transformed space
    // We want to translate so that node is at viewport center
    const newPanX = -nodePos.x * zoom;
    const newPanY = -nodePos.y * zoom;
    
    setPan({ x: newPanX, y: newPanY });
  }, [selectedNode, nodePositions, zoom]);

  // Get parent chain for highlighting
  const getParentChain = useCallback((nodeId) => {
    if (!skillTree || !nodeId) return new Set();
    const chain = new Set();
    let currentId = nodeId;
    
    while (currentId) {
      chain.add(currentId);
      const node = findNode(skillTree, currentId);
      if (!node || !node.parentId || node.parentId === currentId) break;
      currentId = node.parentId;
    }
    
    return chain;
  }, [skillTree]);

  // Parent chain for selected node (for highlighting)
  const selectedParentChain = selectedNode ? getParentChain(selectedNode.id) : new Set();

  // Calculate label scale based on zoom
  const getLabelScale = useCallback(() => {
    const safeZoom = isNaN(zoom) ? 1 : zoom;
    if (safeZoom < 0.6) return 0.85;
    if (safeZoom > 1.2) return 1.15;
    return 1;
  }, [zoom]);

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
          icon={PersonStanding}
          title="Skill Tree"
          subtitle={`${skillCount} skills · Avg LVL ${avgLevel}`}
          iconColor="text-purple-400"
          iconStyle={{ transform: 'scale(1.2)', transformOrigin: 'center' }}
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
            ref={setViewportRef}
            className="flex-1 w-full h-full min-h-0 min-w-0 relative overflow-hidden bg-[#050a15]"
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            {/* Zoom controls panel */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_MIN}
                className="w-7 h-7 flex items-center justify-center rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Oddálit (−)"
              >
                <span className="text-lg font-bold leading-none">−</span>
              </button>
              <div className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-400 font-mono min-w-[50px] text-center">
                {Math.round((isNaN(zoom) ? 1 : zoom) * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_MAX}
                className="w-7 h-7 flex items-center justify-center rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Přiblížit (+)"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </button>
            </div>
            
            {/* Right-side controls: Focus + Reset */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
              {/* Focus button - only show when node is selected */}
              {selectedNode && (
                <button
                  onClick={focusOnSelectedNode}
                  className="w-7 h-7 flex items-center justify-center rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 transition-colors"
                  title={`Zaměřit na "${selectedNode.name}"`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </button>
              )}
              
              {/* Reset view button */}
              {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                <button
                  onClick={resetView}
                  className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs text-cyan-400 transition-colors"
                  title="Reset pohledu"
                >
                  Reset
                </button>
              )}
            </div>
            
            {/* Only render SVG if viewport has valid size */}
            {viewportSize.width >= 100 && viewportSize.height >= 100 ? (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="absolute inset-0"
                style={{ display: 'block' }}
              >
                {/* SVG Definitions for Galaxy Map effects */}
                <defs>
                  {/* Grid pattern */}
                  <pattern id="skillTreeGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(34, 211, 238, 0.03)" strokeWidth="1"/>
                  </pattern>
                  
                  {/* Radial grid circles */}
                  <pattern id="skillTreeRadialGrid" width="100%" height="100%" patternUnits="objectBoundingBox">
                    <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(34, 211, 238, 0.08)" strokeWidth="1"/>
                    <circle cx="50%" cy="50%" r="320" fill="none" stroke="rgba(34, 211, 238, 0.06)" strokeWidth="1"/>
                    <circle cx="50%" cy="50%" r="460" fill="none" stroke="rgba(34, 211, 238, 0.04)" strokeWidth="1"/>
                  </pattern>
                  
                  {/* Center glow */}
                  <radialGradient id="skillTreeCenterGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 211, 238, 0.3)" />
                    <stop offset="50%" stopColor="rgba(34, 211, 238, 0.1)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                  </radialGradient>
                  
                  {/* Category glow gradients */}
                  <radialGradient id="glow-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 211, 238, 0.6)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                  </radialGradient>
                  <radialGradient id="glow-physical" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(249, 115, 22, 0.6)" />
                    <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                  </radialGradient>
                  <radialGradient id="glow-skill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.6)" />
                    <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                  </radialGradient>
                  <radialGradient id="glow-knowledge" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 197, 94, 0.6)" />
                    <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
                  </radialGradient>
                  
                  {/* Inner glow gradients */}
                  <radialGradient id="innerGlow-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 211, 238, 0.3)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                  </radialGradient>
                  <radialGradient id="innerGlow-physical" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(249, 115, 22, 0.3)" />
                    <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                  </radialGradient>
                  <radialGradient id="innerGlow-skill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                    <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                  </radialGradient>
                  <radialGradient id="innerGlow-knowledge" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
                    <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
                  </radialGradient>
                  
                  {/* Neon line filter */}
                  <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Static background grid */}
                <rect width="100%" height="100%" fill="url(#skillTreeGrid)" />
                
                {/* Transformable content group - translate to center, then apply pan and zoom */}
                <g transform={`translate(${viewportSize.width / 2 + pan.x}, ${viewportSize.height / 2 + pan.y}) scale(${zoom})`}>
                  {/* Galaxy center glow */}
                  <circle 
                    cx={0} 
                    cy={0} 
                    r={300} 
                    fill="url(#skillTreeCenterGlow)" 
                  />
                  
                  {/* Orbit rings (visual guides) */}
                  {Object.entries(ORBIT_RADII).filter(([d]) => parseInt(d) > 0).map(([depth, radius]) => (
                    <circle
                      key={`orbit-${depth}`}
                      cx={0}
                      cy={0}
                      r={radius}
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.08)"
                      strokeWidth={1}
                      strokeDasharray="4 8"
                    />
                  ))}
                  
                  {/* Connection lines with neon glow effect */}
                  {nodePositions.filter(p => p.depth > 0).map(({ node, x, y, parentX, parentY, depth }) => {
                    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.skill;
                    const isHighlighted = selectedParentChain.has(node.id);
                    const lineOpacity = isHighlighted ? 0.8 : (depth === 1 ? 0.6 : depth === 2 ? 0.4 : 0.3);
                    const lineWidth = isHighlighted ? 3 : (depth === 1 ? 2 : depth === 2 ? 1.5 : 1);
                    
                    return (
                      <g key={`line-${node.id}`}>
                        {/* Glow line */}
                        <line
                          x1={parentX}
                          y1={parentY}
                          x2={x}
                          y2={y}
                          stroke={colors.glow}
                          strokeWidth={(lineWidth + 4) / zoom}
                          opacity={lineOpacity * (isHighlighted ? 0.5 : 0.3)}
                          strokeLinecap="round"
                        />
                        {/* Main line */}
                        <line
                          x1={parentX}
                          y1={parentY}
                          x2={x}
                          y2={y}
                          stroke={colors.primary}
                          strokeWidth={lineWidth / zoom}
                          opacity={lineOpacity}
                          strokeLinecap="round"
                          filter="url(#neonGlow)"
                        />
                      </g>
                    );
                  })}
                  
                  {/* Nodes - render in order by depth (core first, then children) */}
                  {nodePositions
                    .sort((a, b) => a.depth - b.depth)
                    .map(({ node, x, y, depth }) => {
                      // Use specialized CoreNode for CORE, SkillNode for others
                      if (node.id === 'core') {
                        return (
                          <CoreNode
                            key={node.id}
                            node={node}
                            x={x}
                            y={y}
                            isSelected={selectedNode?.id === node.id}
                            onSelect={handleSelectNode}
                            totalSkills={nodePositions.length - 1}
                          />
                        );
                      }
                      return (
                        <SkillNode
                          key={node.id}
                          node={node}
                          x={x}
                          y={y}
                          depth={depth}
                          isSelected={selectedNode?.id === node.id}
                          isInParentChain={selectedParentChain.has(node.id)}
                          labelScale={getLabelScale()}
                          onSelect={handleSelectNode}
                          onContextMenu={handleContextMenu}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                        />
                      );
                    })}
                </g>
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
                
                {/* Parent - Dropdown for non-core skills */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Parent</label>
                  {['physical', 'skills', 'knowledge'].includes(selectedNode.id) ? (
                    // Root categories can't change parent
                    <div className="mt-1 px-3 py-2 rounded bg-[#0f1d35] border border-cyan-500/30 text-gray-400 text-sm">
                      CORE (nelze změnit)
                    </div>
                  ) : (
                    <select
                      value={selectedNode.parentId}
                      onChange={(e) => handleParentChange(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded bg-[#0f1d35] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400"
                    >
                      {getValidParentOptions(skillTree, selectedNode.id).map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} {opt.id === 'core' ? '' : `(${opt.category})`}
                        </option>
                      ))}
                    </select>
                  )}
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
                <label className="text-xs text-gray-500 uppercase tracking-wide">Parent</label>
                <select
                  value={newSkillParentId}
                  onChange={(e) => setNewSkillParentId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded bg-[#0f1d35] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400"
                >
                  {getValidParentOptions(skillTree).map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} {opt.id === 'core' ? '' : `(${opt.category})`}
                    </option>
                  ))}
                </select>
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
