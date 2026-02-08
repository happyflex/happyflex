import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home } from 'lucide-react';

function ProjectTree({ node, currentPath, onNavigate, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isActive = currentPath[currentPath.length - 1] === node.id;
  const hasChildren = node && node.children && node.children.length > 0;

  if (!node) return null;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
          isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300 hover:bg-cyan-500/10'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onNavigate(node.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
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

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child, index) => (
            <ProjectTree
              key={child.id || index}
              node={child}
              currentPath={currentPath}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectTree;
