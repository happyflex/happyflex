import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home } from 'lucide-react';

const TreeNode = ({ node, currentPath, onNavigate, level, expanded, onToggle, parentPath = [] }) => {
  const isActive = currentPath[currentPath.length - 1] === node.id;
  const hasChildren = node && node.children && node.children.length > 0;
  const isExpanded = expanded[node.id];
  
  // Build current node's full path for data attribute
  const nodePath = [...parentPath, node.id];

  return (
    <div
      // === ITEM MODE: Data attributes for Mouse Ring ===
      data-steward-item="projectNode"
      data-item-id={node.id}
      data-module-type="projects"
      data-parent-id={parentPath.length > 0 ? parentPath[parentPath.length - 1] : ''}
      data-path={JSON.stringify(nodePath)}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors relative ${
        isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300 hover:bg-cyan-500/10'
      }`}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
      onClick={() => onNavigate(node.id)}
    >
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          className="hover:text-cyan-400"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      )}
      {!hasChildren && <div className="w-4" />}
      {node.id === 'root' ? (
        <Home className="h-4 w-4" />
      ) : isExpanded && hasChildren ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      )}
      <span className="text-sm font-medium truncate">{node.name}</span>
      {node.items && node.items.length > 0 && (
        <span className="text-xs text-gray-500 ml-auto">
          {node.items.length}
        </span>
      )}
    </div>
  );
};

function ProjectTree({ node, currentPath, onNavigate }) {
  const [expanded, setExpanded] = useState({ root: true });

  const toggleExpand = (nodeId) => {
    setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Flatten tree to list with levels and parent paths
  const flattenTree = (n, level = 0, parentPath = []) => {
    const result = [{ node: n, level, parentPath }];
    if (n.children && n.children.length > 0 && expanded[n.id]) {
      const newParentPath = [...parentPath, n.id];
      n.children.forEach(child => {
        result.push(...flattenTree(child, level + 1, newParentPath));
      });
    }
    return result;
  };

  const flatList = flattenTree(node);

  return (
    <div>
      {flatList.map((item, index) => (
        <TreeNode
          key={item.node.id || index}
          node={item.node}
          level={item.level}
          parentPath={item.parentPath}
          currentPath={currentPath}
          onNavigate={onNavigate}
          expanded={expanded}
          onToggle={toggleExpand}
        />
      ))}
    </div>
  );
}

export default ProjectTree;
