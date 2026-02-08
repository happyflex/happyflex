import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowLeft, Save, Trash2, Link as LinkIcon, X, ChevronRight, ChevronDown, FolderPlus, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from '../../hooks/use-toast';

const ProjectWorldModule = ({ project, onBack }) => {
  const [structure, setStructure] = useState({ root: { id: 'root', name: 'Hlavní projekt', children: [], items: [], connections: [] } });
  const [currentPath, setCurrentPath] = useState(['root']);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddSubproject, setShowAddSubproject] = useState(false);
  const [newSubprojectName, setNewSubprojectName] = useState('');
  const canvasRef = useRef(null);

  // Load project data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`project_world_${project.id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.structure) {
          setStructure(data.structure);
        }
      } catch (e) {
        console.error('Error loading project:', e);
      }
    }
  }, [project.id]);

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

  const addItem = (type) => {
    const newItem = {
      id: `item-${Date.now()}`,
      type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 300, height: 200 },
      data: getDefaultData(type),
      zIndex: items.length
    };
    setItems([...items, newItem]);
    setShowAddMenu(false);
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

  const updateItemPosition = (id, position) => {
    setItems(items.map(item => item.id === id ? { ...item, position } : item));
  };

  const updateItemData = (id, data) => {
    setItems(items.map(item => item.id === id ? { ...item, data } : item));
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    setConnections(connections.filter(conn => conn.from !== id && conn.to !== id));
    setSelectedItem(null);
  };

  const startConnection = (itemId) => {
    setIsAddingConnection(true);
    setConnectionStart(itemId);
  };

  const completeConnection = (itemId) => {
    if (connectionStart && connectionStart !== itemId) {
      const newConnection = {
        id: `conn-${Date.now()}`,
        from: connectionStart,
        to: itemId,
        label: ''
      };
      setConnections([...connections, newConnection]);
      toast({
        title: 'Propojení vytvořeno',
        description: 'Elementy byly propojeny'
      });
    }
    setIsAddingConnection(false);
    setConnectionStart(null);
  };

  const deleteConnection = (id) => {
    setConnections(connections.filter(conn => conn.id !== id));
  };

  const bringToFront = (id) => {
    const maxZ = Math.max(...items.map(item => item.zIndex), 0);
    setItems(items.map(item => item.id === id ? { ...item, zIndex: maxZ + 1 } : item));
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
            <p className="text-sm text-gray-400">Project World</p>
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
            {connections.map(conn => {
              const fromItem = items.find(item => item.id === conn.from);
              const toItem = items.find(item => item.id === conn.to);
              if (!fromItem || !toItem) return null;

              const fromX = fromItem.position.x + fromItem.size.width / 2;
              const fromY = fromItem.position.y + fromItem.size.height / 2;
              const toX = toItem.position.x + toItem.size.width / 2;
              const toY = toItem.position.y + toItem.size.height / 2;

              return (
                <g key={conn.id}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  <circle cx={fromX} cy={fromY} r="4" fill="#06b6d4" />
                  <circle cx={toX} cy={toY} r="4" fill="#06b6d4" />
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
                <h3 className="text-xl font-bold text-white mb-2">Prázdný Project Canvas</h3>
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
    </div>
  );
};

// ProjectItem component
const ProjectItem = ({ item, isSelected, isConnecting, onSelect, onMove, onUpdate, onDelete, onConnect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const itemRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.item-content') && !e.target.closest('input, textarea')) return;
    
    e.preventDefault();
    setIsDragging(true);
    onSelect();
    
    const rect = itemRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      onMove(item.id, {
        x: Math.max(0, newX),
        y: Math.max(0, newY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset, item.id, onMove]);

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
