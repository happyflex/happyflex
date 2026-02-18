import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, Save, Trash2, Link as LinkIcon, X, FolderPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from '../../hooks/use-toast';
import { useTrash } from '../../context/TrashContext';
import ProjectTree from './ProjectTree';
import ItemDetailPanel from './ItemDetailPanel';
import RelationshipTypeDialog from './RelationshipTypeDialog';

const ProjectWorldModule = ({ project, onBack, initialPath }) => {
  const { addToTrash, TRASH_TYPES } = useTrash();
  const [structure, setStructure] = useState({ 
    root: { 
      id: 'root', 
      name: 'Hlavní projekt', 
      children: [], 
      items: [], 
      connections: [] 
    } 
  });
  const [currentPath, setCurrentPath] = useState(initialPath || ['root']);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [connectionTarget, setConnectionTarget] = useState(null);
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddSubproject, setShowAddSubproject] = useState(false);
  const [newSubprojectName, setNewSubprojectName] = useState('');
  const canvasRef = useRef(null);

  // Load project data from localStorage
  useEffect(() => {
    const loadProjectData = () => {
      const saved = localStorage.getItem(`project_world_${project.id}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.structure) {
            setStructure(data.structure);
            // If initialPath was provided, navigate to it after loading
            if (initialPath && initialPath.length > 1) {
              setCurrentPath(initialPath);
            }
          }
        } catch (e) {
          console.error('Error loading project:', e);
        }
      }
    };

    loadProjectData();

    // Listen for restore events
    const handleElementRestored = (event) => {
      if (event.detail?.projectId === project.id) {
        loadProjectData();
        // Navigate to the restored element's path if provided
        if (event.detail?.nodePath) {
          setCurrentPath(event.detail.nodePath);
        }
        toast({
          title: 'Data obnovena',
          description: 'Element byl obnoven do projektu'
        });
      }
    };

    window.addEventListener('steward-project-element-restored', handleElementRestored);
    return () => {
      window.removeEventListener('steward-project-element-restored', handleElementRestored);
    };
  }, [project.id, initialPath]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = { structure };
      localStorage.setItem(`project_world_${project.id}`, JSON.stringify(data));
    }, 2000);
    return () => clearTimeout(timer);
  }, [structure, project.id]);

  const saveProject = () => {
    const data = { structure };
    localStorage.setItem(`project_world_${project.id}`, JSON.stringify(data));
    toast({
      title: 'Uloženo',
      description: 'Projekt byl uložen'
    });
  };

  // Get current node based on path
  const getCurrentNode = () => {
    let node = structure.root;
    for (let i = 1; i < currentPath.length; i++) {
      node = node.children.find(child => child.id === currentPath[i]);
      if (!node) return structure.root;
    }
    return node;
  };

  const currentNode = getCurrentNode();
  const items = currentNode.items || [];
  const connections = currentNode.connections || [];

  // Add subproject
  const addSubproject = () => {
    if (!newSubprojectName.trim()) {
      toast({
        title: 'Chybí název',
        description: 'Zadejte název podprojektu',
        variant: 'destructive'
      });
      return;
    }

    const newSubproject = {
      id: `sub-${Date.now()}`,
      name: newSubprojectName.trim(),
      children: [],
      items: [],
      connections: []
    };

    setStructure(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let node = updated.root;
      for (let i = 1; i < currentPath.length; i++) {
        node = node.children.find(child => child.id === currentPath[i]);
      }
      node.children.push(newSubproject);
      return updated;
    });

    setNewSubprojectName('');
    setShowAddSubproject(false);
    toast({
      title: 'Podprojekt vytvořen',
      description: `"${newSubproject.name}" byl přidán`
    });
  };

  // Navigate to node
  const navigateToNode = (nodeId) => {
    if (nodeId === 'root') {
      setCurrentPath(['root']);
    } else {
      // Find path to node
      const findPath = (node, targetId, path = ['root']) => {
        if (node.id === targetId) return path;
        if (node.children) {
          for (const child of node.children) {
            const result = findPath(child, targetId, [...path, child.id]);
            if (result) return result;
          }
        }
        return null;
      };
      const newPath = findPath(structure.root, nodeId);
      if (newPath) {
        setCurrentPath(newPath);
        setSelectedItem(null);
      }
    }
  };

  // Update items in current node and save immediately
  const updateCurrentNodeItems = (newItems) => {
    setStructure(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let node = updated.root;
      for (let i = 1; i < currentPath.length; i++) {
        node = node.children.find(child => child.id === currentPath[i]);
      }
      node.items = newItems;
      
      // Save immediately to localStorage
      localStorage.setItem(`project_world_${project.id}`, JSON.stringify({ structure: updated }));
      
      return updated;
    });
  };

  // Update connections in current node and save immediately
  const updateCurrentNodeConnections = (newConnections) => {
    setStructure(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let node = updated.root;
      for (let i = 1; i < currentPath.length; i++) {
        node = node.children.find(child => child.id === currentPath[i]);
      }
      node.connections = newConnections;
      
      // Save immediately to localStorage
      localStorage.setItem(`project_world_${project.id}`, JSON.stringify({ structure: updated }));
      
      return updated;
    });
  };

  const getDefaultData = (type) => {
    switch (type) {
      case 'note':
        return { title: 'Nová poznámka', content: '' };
      case 'task':
        return { title: 'Nový úkol', completed: false, priority: 'medium' };
      case 'contact':
        return { name: 'Nový kontakt', role: '', email: '' };
      case 'media':
        return { title: 'Media', type: 'image', url: '' };
      case 'flow':
        return { title: 'Flow diagram', nodes: [] };
      case 'milestone':
        return { title: 'Milestone', date: '', status: 'pending' };
      default:
        return {};
    }
  };

  const addItem = (type) => {
    const newItem = {
      id: `item-${Date.now()}`,
      type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 300, height: 200 },
      data: getDefaultData(type),
      zIndex: items.length
    };
    updateCurrentNodeItems([...items, newItem]);
    setShowAddMenu(false);
  };

  const updateItemPosition = (id, position) => {
    updateCurrentNodeItems(items.map(item => item.id === id ? { ...item, position } : item));
  };

  const updateItemData = (id, data) => {
    updateCurrentNodeItems(items.map(item => item.id === id ? { ...item, data } : item));
  };

  const deleteItem = (id) => {
    // Find the item to delete
    const itemToDelete = items.find(item => item.id === id);
    
    if (itemToDelete) {
      // Get item type label for toast
      const typeLabels = {
        note: 'Poznámka',
        task: 'Úkol',
        contact: 'Kontakt',
        milestone: 'Milestone',
        media: 'Media',
        flow: 'Flow Diagram'
      };
      
      // Add to Trash with full restore data
      addToTrash({
        type: TRASH_TYPES.PROJECT_ELEMENT, // Project element type for items inside projects
        name: itemToDelete.data?.title || typeLabels[itemToDelete.type] || 'Element',
        data: itemToDelete,
        sourceModule: 'Projekty',
        metadata: {
          projectId: project.id,
          projectName: project.name,
          itemType: itemToDelete.type,
          nodePath: [...currentPath], // Store path for potential restore
          connections: connections.filter(conn => conn.from === id || conn.to === id)
        }
      });

      toast({
        title: 'Přesunuto do koše',
        description: `${typeLabels[itemToDelete.type] || 'Element'} byl přesunut do koše`
      });
    }

    // Remove item and its connections
    updateCurrentNodeItems(items.filter(item => item.id !== id));
    updateCurrentNodeConnections(connections.filter(conn => conn.from !== id && conn.to !== id));
    setSelectedItem(null);
  };

  const startConnection = (itemId) => {
    setIsAddingConnection(true);
    setConnectionStart(itemId);
  };

  const completeConnection = (itemId) => {
    if (connectionStart && connectionStart !== itemId) {
      // Show dialog to select relationship type
      setConnectionTarget(itemId);
      setShowRelationshipDialog(true);
    } else {
      setIsAddingConnection(false);
      setConnectionStart(null);
    }
  };

  const createConnectionWithType = (type) => {
    if (connectionStart && connectionTarget) {
      const newConnection = {
        id: `conn-${Date.now()}`,
        from: connectionStart,
        to: connectionTarget,
        type: type
      };
      updateCurrentNodeConnections([...connections, newConnection]);
      toast({
        title: 'Propojení vytvořeno',
        description: 'Elementy byly propojeny'
      });
    }
    setIsAddingConnection(false);
    setConnectionStart(null);
    setConnectionTarget(null);
    setShowRelationshipDialog(false);
  };

  const bringToFront = (id) => {
    const maxZ = Math.max(...items.map(item => item.zIndex), 0);
    updateCurrentNodeItems(items.map(item => item.id === id ? { ...item, zIndex: maxZ + 1 } : item));
  };

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const crumbs = [];
    let node = structure?.root;
    
    // Safety check - if structure or root doesn't exist, return empty
    if (!node) {
      return [{ id: 'root', name: 'Hlavní projekt' }];
    }
    
    crumbs.push({ id: 'root', name: node.name });
    
    for (let i = 1; i < currentPath.length; i++) {
      // Safety check for children array
      if (!node.children) break;
      
      const nextNode = node.children.find(child => child.id === currentPath[i]);
      if (nextNode) {
        node = nextNode;
        crumbs.push({ id: node.id, name: node.name });
      } else {
        // Path doesn't exist anymore, stop here
        break;
      }
    }
    return crumbs;
  };

  return (
    <div className="h-full flex flex-col bg-[#0a1628]">
      {/* Header */}
      <div className="h-16 bg-[#0f1d35] border-b border-cyan-500/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              {getBreadcrumbs().map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  {index > 0 && <span className="mx-1">/</span>}
                  <button
                    onClick={() => navigateToNode(crumb.id)}
                    className="hover:text-cyan-400 transition-colors"
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={saveProject}
            className="bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Uložit
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tree View */}
        <div className="w-72 bg-[#0f1d35] border-r border-cyan-500/30 flex flex-col">
          <div className="p-4 border-b border-cyan-500/20">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3">Struktura projektu</h3>
            <Button
              onClick={() => setShowAddSubproject(true)}
              size="sm"
              className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Nový podprojekt
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            <ProjectTree
              node={structure.root}
              currentPath={currentPath}
              onNavigate={navigateToNode}
              level={0}
            />
          </ScrollArea>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1b3a] to-[#1a1f3a]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
            onClick={(e) => {
              if (e.target === canvasRef.current) {
                setSelectedItem(null);
              }
            }}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
                </marker>
              </defs>
              {connections.map(conn => {
                const fromItem = items.find(item => item.id === conn.from);
                const toItem = items.find(item => item.id === conn.to);
                if (!fromItem || !toItem) return null;

                const fromX = fromItem.position.x + fromItem.size.width / 2;
                const fromY = fromItem.position.y + fromItem.size.height / 2;
                const toX = toItem.position.x + toItem.size.width / 2;
                const toY = toItem.position.y + toItem.size.height / 2;

                // Calculate midpoint for label
                const midX = (fromX + toX) / 2;
                const midY = (fromY + toY) / 2;

                // Get relationship type label and color
                const relationshipLabels = {
                  'part-of': { label: 'součástí', color: '#3b82f6' },
                  'influences': { label: 'ovlivňuje', color: '#a855f7' },
                  'depends-on': { label: 'závisí', color: '#eab308' },
                  'blocks': { label: 'blokuje', color: '#ef4444' },
                  'relates-to': { label: 'souvisí', color: '#06b6d4' }
                };
                const relType = relationshipLabels[conn.type] || relationshipLabels['relates-to'];

                return (
                  <g key={conn.id}>
                    {/* Connection line with arrow */}
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={toX}
                      y2={toY}
                      stroke={relType.color}
                      strokeWidth="3"
                      opacity="0.9"
                      markerEnd="url(#arrowhead)"
                    />
                    {/* Connection points */}
                    <circle cx={fromX} cy={fromY} r="6" fill={relType.color} />
                    <circle cx={toX} cy={toY} r="6" fill={relType.color} />
                    {/* Relationship type label */}
                    <rect
                      x={midX - 40}
                      y={midY - 12}
                      width="80"
                      height="24"
                      rx="6"
                      fill="#0a1628"
                      stroke={relType.color}
                      strokeWidth="2"
                    />
                    <text
                      x={midX}
                      y={midY + 5}
                      textAnchor="middle"
                      fill={relType.color}
                      fontSize="12"
                      fontWeight="600"
                    >
                      {relType.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Items */}
            {items.map(item => (
              <ProjectItem
                key={item.id}
                item={item}
                isSelected={selectedItem === item.id}
                isConnecting={isAddingConnection}
                onSelect={() => {
                  setSelectedItem(item.id);
                  bringToFront(item.id);
                }}
                onMove={updateItemPosition}
                onUpdate={updateItemData}
                onDelete={deleteItem}
                onConnect={isAddingConnection ? completeConnection : startConnection}
              />
            ))}

            {/* Empty state */}
            {items.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-cyan-500/10 rounded-2xl flex items-center justify-center">
                    <Plus className="h-10 w-10 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{currentNode.name}</h3>
                  <p className="text-gray-400 mb-4">Začněte přidáním prvního elementu</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Menu FAB */}
          <div className="absolute bottom-8 right-8">
            {showAddMenu && (
              <div className="absolute bottom-20 right-0 bg-[#0f1d35] border border-cyan-500/30 rounded-lg p-2 shadow-2xl mb-2 w-64">
                <div className="space-y-1">
                  <button
                    onClick={() => addItem('note')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    📝 Poznámka
                  </button>
                  <button
                    onClick={() => addItem('task')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    ✅ Úkol
                  </button>
                  <button
                    onClick={() => addItem('contact')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    👤 Kontakt
                  </button>
                  <button
                    onClick={() => addItem('milestone')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    🎯 Milestone
                  </button>
                  <button
                    onClick={() => addItem('media')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    🖼️ Media (placeholder)
                  </button>
                  <button
                    onClick={() => addItem('flow')}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 rounded text-white text-sm"
                  >
                    🔄 Flow Diagram (placeholder)
                  </button>
                </div>
              </div>
            )}
            <Button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/50"
            >
              {showAddMenu ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Right Panel - Item Detail (FÁZE 1) */}
        {selectedItem && (
          <ItemDetailPanel
            item={items.find(i => i.id === selectedItem)}
            connections={connections}
            allItems={items}
            currentPath={currentPath}
            structure={structure}
            onClose={() => setSelectedItem(null)}
            onNavigate={navigateToNode}
          />
        )}
      </div>

      {/* Relationship Type Dialog (FÁZE 2) */}
      <RelationshipTypeDialog
        isOpen={showRelationshipDialog}
        onClose={() => {
          setShowRelationshipDialog(false);
          setIsAddingConnection(false);
          setConnectionStart(null);
          setConnectionTarget(null);
        }}
        onSelect={createConnectionWithType}
        fromItem={items.find(i => i.id === connectionStart)}
        toItem={items.find(i => i.id === connectionTarget)}
      />

      {/* Add Subproject Dialog */}
      <Dialog open={showAddSubproject} onOpenChange={setShowAddSubproject}>
        <DialogContent className="bg-[#0f1d35] border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white">Nový podprojekt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="např. Marketing, Produkt, Finance..."
              value={newSubprojectName}
              onChange={(e) => setNewSubprojectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSubproject()}
              className="bg-[#0a1628] border-cyan-500/30 text-white"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddSubproject(false);
                  setNewSubprojectName('');
                }}
                className="text-gray-400"
              >
                Zrušit
              </Button>
              <Button
                onClick={addSubproject}
                className="bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                Vytvořit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ProjectItem component - FIXED with shared drag utils
const ProjectItem = ({ item, isSelected, isConnecting, onSelect, onMove, onUpdate, onDelete, onConnect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef(null);
  const lastValidPosition = useRef({ x: item.position?.x || 0, y: item.position?.y || 0 });
  
  // ANTI-JUMP: Drag state ref (uses grid coords)
  const dragStateRef = useRef(null);
  
  // Clamp position to canvas bounds
  const clampPosition = (x, y) => {
    const maxX = 2000;
    const maxY = 1500;
    const minVisible = 50;
    
    return {
      x: Math.max(-item.size?.width + minVisible || 0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    };
  };

  const handleMouseDown = (e) => {
    // Ignore clicks on buttons (delete, connect) and content area
    if (e.target.closest('button')) return;
    if (e.target.closest('.item-content') && !e.target.closest('input, textarea')) return;
    
    e.preventDefault();
    
    // Find grid root (canvas element in ProjectWorldModule)
    const gridRoot = itemRef.current?.closest('.absolute.inset-0');
    if (!gridRoot) return;
    
    // Get pointer position in grid coords using shared helper
    const pointerLocal = getLocalPointer(e, gridRoot);
    
    // Item position from state = source of truth (in grid coords)
    const itemPosLocal = { x: item.position?.x || 0, y: item.position?.y || 0 };
    
    // Calculate grab offset in grid coords
    const grabOffsetX = pointerLocal.x - itemPosLocal.x;
    const grabOffsetY = pointerLocal.y - itemPosLocal.y;
    
    // Store drag state - DON'T activate drag yet
    dragStateRef.current = {
      pointerStart: { x: e.clientX, y: e.clientY },
      grabOffset: { x: grabOffsetX, y: grabOffsetY },
      gridRoot: gridRoot,
      activatedDrag: false
    };
    
    lastValidPosition.current = itemPosLocal;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // ANTI-JUMP: Check if drag should activate (threshold check)
      if (dragStateRef.current && !dragStateRef.current.activatedDrag && !isDragging) {
        const dx = Math.abs(e.clientX - dragStateRef.current.pointerStart.x);
        const dy = Math.abs(e.clientY - dragStateRef.current.pointerStart.y);
        
        // Threshold: 2px movement required
        if (dx + dy < 2) {
          return;
        }
        
        // Activate drag now
        dragStateRef.current.activatedDrag = true;
        setIsDragging(true);
        onSelect();
        
        // First position calculation in GRID COORDS
        const gridRoot = dragStateRef.current.gridRoot;
        const pointerLocal = getLocalPointer(e, gridRoot);
        
        const newX = pointerLocal.x - dragStateRef.current.grabOffset.x;
        const newY = pointerLocal.y - dragStateRef.current.grabOffset.y;
        
        if (isValidNumber(newX) && isValidNumber(newY)) {
          const clamped = clampPosition(newX, newY);
          lastValidPosition.current = clamped;
          onMove(item.id, clamped);
        }
        return;
      }
      
      if (!isDragging || !dragStateRef.current) return;
      
      // Calculate position in GRID COORDS
      const gridRoot = dragStateRef.current.gridRoot;
      const pointerLocal = getLocalPointer(e, gridRoot);
      
      const newX = pointerLocal.x - dragStateRef.current.grabOffset.x;
      const newY = pointerLocal.y - dragStateRef.current.grabOffset.y;
      
      if (!isValidNumber(newX) || !isValidNumber(newY)) {
        return;
      }
      
      const clamped = clampPosition(newX, newY);
      lastValidPosition.current = clamped;
      onMove(item.id, clamped);
    };

    const handleMouseUp = () => {
      // ANTI-JUMP: Clear drag state
      if (dragStateRef.current) {
        // If drag never activated (just a click), trigger onSelect
        if (!dragStateRef.current.activatedDrag) {
          onSelect();
        }
        dragStateRef.current = null;
      }
      
      setIsDragging(false);
    };

    if (isDragging || dragStateRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, item.id, item.position, item.size, onMove, onSelect]);

  const getItemColor = () => {
    switch (item.type) {
      case 'note': return 'from-blue-500/20 to-cyan-500/20 border-cyan-500/40';
      case 'task': return 'from-green-500/20 to-emerald-500/20 border-green-500/40';
      case 'contact': return 'from-purple-500/20 to-pink-500/20 border-purple-500/40';
      case 'milestone': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40';
      case 'media': return 'from-red-500/20 to-pink-500/20 border-red-500/40';
      case 'flow': return 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40';
      default: return 'from-gray-500/20 to-slate-500/20 border-gray-500/40';
    }
  };

  return (
    <div
      ref={itemRef}
      className={`absolute bg-gradient-to-br ${getItemColor()} backdrop-blur-lg rounded-xl border-2 overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/50' : ''
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        zIndex: item.zIndex
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        if (isConnecting) {
          onConnect(item.id);
        }
      }}
    >
      {/* Header */}
      <div className="h-10 bg-black/20 border-b border-white/10 flex items-center justify-between px-3">
        <span className="text-sm font-medium text-white">{item.data.title}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
            onClick={(e) => {
              e.stopPropagation();
              onConnect(item.id);
            }}
          >
            <LinkIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="item-content p-3 h-[calc(100%-2.5rem)] overflow-auto">
        {item.type === 'note' && (
          <div>
            <Textarea
              value={item.data.content}
              onChange={(e) => onUpdate(item.id, { ...item.data, content: e.target.value })}
              placeholder="Začněte psát..."
              className="bg-transparent border-none text-white text-sm resize-none"
            />
          </div>
        )}
        {item.type === 'task' && (
          <div className="space-y-2">
            <Input
              value={item.data.title}
              onChange={(e) => onUpdate(item.id, { ...item.data, title: e.target.value })}
              className="bg-black/20 border-white/10 text-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.data.completed}
                onChange={(e) => onUpdate(item.id, { ...item.data, completed: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-white">
                {item.data.completed ? 'Dokončeno' : 'Nedokončeno'}
              </span>
            </div>
          </div>
        )}
        {item.type === 'contact' && (
          <div className="space-y-2">
            <Input
              value={item.data.name}
              onChange={(e) => onUpdate(item.id, { ...item.data, name: e.target.value })}
              placeholder="Jméno"
              className="bg-black/20 border-white/10 text-white"
            />
            <Input
              value={item.data.role}
              onChange={(e) => onUpdate(item.id, { ...item.data, role: e.target.value })}
              placeholder="Role"
              className="bg-black/20 border-white/10 text-white"
            />
            <Input
              value={item.data.email}
              onChange={(e) => onUpdate(item.id, { ...item.data, email: e.target.value })}
              placeholder="Email"
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        )}
        {item.type === 'milestone' && (
          <div className="space-y-2">
            <Input
              value={item.data.title}
              onChange={(e) => onUpdate(item.id, { ...item.data, title: e.target.value })}
              className="bg-black/20 border-white/10 text-white"
            />
            <Input
              type="date"
              value={item.data.date}
              onChange={(e) => onUpdate(item.id, { ...item.data, date: e.target.value })}
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
        )}
        {(item.type === 'media' || item.type === 'flow') && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="text-2xl mb-2">{item.type === 'media' ? '🖼️' : '🔄'}</p>
              <p className="text-sm">Placeholder</p>
              <p className="text-xs mt-1">Bude implementováno později</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectWorldModule;
