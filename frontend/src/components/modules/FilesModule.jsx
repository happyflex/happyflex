import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, FolderOpen, File, FileText, FileImage, FileVideo, FileAudio,
  Plus, Trash2, Edit2, ChevronRight, ChevronDown, HardDrive, Cloud, 
  Smartphone, MoreVertical, FolderPlus, Download, X, Check, Move,
  Copy, ExternalLink, GripVertical
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { useTrash } from '../../context/TrashContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useItemActions, ITEM_ACTIONS, ITEM_TYPES } from '../../context/ItemActionContext';
import { toast } from '../../hooks/use-toast';
import ModuleHeader from './ModuleHeader';

// File type icons mapping
const FILE_ICONS = {
  folder: Folder,
  document: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  default: File
};

// Get file type from extension
const getFileType = (filename) => {
  if (!filename || !filename.includes('.')) return 'default';
  const ext = filename.split('.').pop().toLowerCase();
  
  const typeMap = {
    // Documents
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
    xls: 'document', xlsx: 'document', ppt: 'document', pptx: 'document',
    // Images
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', 
    svg: 'image', webp: 'image', bmp: 'image',
    // Videos
    mp4: 'video', avi: 'video', mov: 'video', mkv: 'video', webm: 'video',
    // Audio
    mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio'
  };
  
  return typeMap[ext] || 'default';
};

// Source types
const SOURCES = {
  local: { 
    id: 'local', 
    name: 'Lokální úložiště', 
    icon: HardDrive, 
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    available: true 
  },
  devices: { 
    id: 'devices', 
    name: 'Připojená zařízení', 
    icon: Smartphone, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    available: false,
    placeholder: true 
  },
  cloud: { 
    id: 'cloud', 
    name: 'Cloud úložiště', 
    icon: Cloud, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    available: false,
    placeholder: true 
  }
};

// Default folder structure
const createDefaultFileSystem = () => ({
  local: {
    id: 'root-local',
    name: 'Lokální úložiště',
    type: 'folder',
    children: [
      {
        id: 'folder-downloads',
        name: 'Stažené soubory',
        type: 'folder',
        children: [
          { id: 'file-1', name: 'Report_Q4_2024.pdf', type: 'file', size: '2.4 MB', modified: '2024-12-15' },
          { id: 'file-2', name: 'Prezentace_STEWARD.pptx', type: 'file', size: '5.1 MB', modified: '2024-12-20' }
        ]
      },
      {
        id: 'folder-documents',
        name: 'Dokumenty',
        type: 'folder',
        children: [
          { id: 'file-3', name: 'Strategie_2025.docx', type: 'file', size: '1.2 MB', modified: '2025-01-10' },
          { id: 'file-4', name: 'Poznámky_meeting.txt', type: 'file', size: '24 KB', modified: '2025-02-01' },
          {
            id: 'folder-projects',
            name: 'Projekty',
            type: 'folder',
            children: [
              { id: 'file-5', name: 'STEWARD_specifikace.pdf', type: 'file', size: '3.8 MB', modified: '2025-01-25' }
            ]
          }
        ]
      },
      {
        id: 'folder-images',
        name: 'Obrázky',
        type: 'folder',
        children: [
          { id: 'file-6', name: 'Logo_STEWARD.png', type: 'file', size: '156 KB', modified: '2024-11-01' },
          { id: 'file-7', name: 'Screenshot_dashboard.jpg', type: 'file', size: '890 KB', modified: '2025-02-10' }
        ]
      },
      {
        id: 'folder-videos',
        name: 'Videa',
        type: 'folder',
        children: [
          { id: 'file-8', name: 'Tutorial_workspace.mp4', type: 'file', size: '45.2 MB', modified: '2025-01-15' }
        ]
      }
    ]
  },
  devices: {
    id: 'root-devices',
    name: 'Připojená zařízení',
    type: 'folder',
    children: []
  },
  cloud: {
    id: 'root-cloud',
    name: 'Cloud úložiště',
    type: 'folder',
    children: []
  }
});

// Storage key
const STORAGE_KEY = 'steward_files';

const FilesModule = ({ initialViewState, onViewStateChange }) => {
  const { addToTrash, TRASH_TYPES } = useTrash();
  const { addModule } = useWorkspace();
  const { register } = useItemActions();
  
  // VIEW STATE GUARDS: Prevent infinite loops
  const didApplyInitialViewState = React.useRef(false);
  const lastEmittedViewState = React.useRef(null);
  const isInitialized = React.useRef(false);
  
  // State
  const [fileSystem, setFileSystem] = useState(null);
  const [activeSource, setActiveSource] = useState('local');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root-local', 'folder-documents']));
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Helper: Get path to folder (array of folder IDs from root to target)
  const getFolderPath = useCallback((root, targetId, currentPath = []) => {
    if (!root) return null;
    
    const newPath = [...currentPath, root.id];
    
    if (root.id === targetId) return newPath;
    
    if (root.children) {
      for (const child of root.children) {
        if (child.type === 'folder') {
          const found = getFolderPath(child, targetId, newPath);
          if (found) return found;
        }
      }
    }
    return null;
  }, []);

  // Helper: Find folder by path
  const findFolderByPath = useCallback((root, path) => {
    if (!root || !path || path.length === 0) return null;
    
    let current = root;
    for (let i = 1; i < path.length; i++) { // Skip first (root)
      if (!current.children) return current; // Can't go deeper, return last valid
      const next = current.children.find(c => c.id === path[i] && c.type === 'folder');
      if (!next) return current; // Path broken, return last valid
      current = next;
    }
    return current;
  }, []);

  // Find item by ID in tree (moved here to be available for viewState restore)
  const findItemById = useCallback((items, id) => {
    if (!items) return null;
    
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFileSystem(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading files:', e);
        setFileSystem(createDefaultFileSystem());
      }
    } else {
      setFileSystem(createDefaultFileSystem());
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (fileSystem) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fileSystem));
    }
  }, [fileSystem]);

  // VIEW STATE: Apply initial viewState (once when fileSystem is loaded)
  useEffect(() => {
    if (!initialViewState || !fileSystem || didApplyInitialViewState.current) return;
    
    // Apply activeSource first
    if (initialViewState.activeSource && SOURCES[initialViewState.activeSource]) {
      setActiveSource(initialViewState.activeSource);
    }
    
    const source = initialViewState.activeSource || 'local';
    const root = fileSystem[source];
    
    // Apply folder path (deep restore)
    if (initialViewState.selectedFolderPath && Array.isArray(initialViewState.selectedFolderPath)) {
      // Expand all folders in path
      const pathSet = new Set(initialViewState.selectedFolderPath);
      setExpandedFolders(prev => new Set([...prev, ...pathSet]));
      
      // Find and select the deepest valid folder
      const folder = findFolderByPath(root, initialViewState.selectedFolderPath);
      if (folder) {
        setSelectedFolder(folder);
      }
    } else if (initialViewState.selectedFolderId) {
      // Fallback: just selectedFolderId without path
      const folder = findItemById(root?.children || [], initialViewState.selectedFolderId);
      if (folder) {
        setSelectedFolder(folder);
        // Try to compute and expand ancestors
        const path = getFolderPath(root, initialViewState.selectedFolderId);
        if (path) {
          setExpandedFolders(prev => new Set([...prev, ...path]));
        }
      }
    }
    
    // Apply expanded folders (merge with path)
    if (initialViewState.expandedFolders && Array.isArray(initialViewState.expandedFolders)) {
      setExpandedFolders(prev => new Set([...prev, ...initialViewState.expandedFolders]));
    }
    
    didApplyInitialViewState.current = true;
    isInitialized.current = true;
  }, [initialViewState, fileSystem, findFolderByPath, findItemById, getFolderPath]);

  // VIEW STATE: Emit changes (with deep-equal guard)
  useEffect(() => {
    if (!onViewStateChange || !isInitialized.current || !fileSystem) return;
    
    // Build folder path for selected folder
    let selectedFolderPath = null;
    if (selectedFolder && selectedFolder.id) {
      const root = fileSystem[activeSource];
      selectedFolderPath = getFolderPath(root, selectedFolder.id);
    }
    
    const nextViewState = {
      activeSource: activeSource !== 'local' ? activeSource : undefined,
      selectedFolderId: selectedFolder?.id,
      selectedFolderPath: selectedFolderPath,
      expandedFolders: Array.from(expandedFolders)
    };
    
    // Deep-equal guard: only emit if changed
    const nextJson = JSON.stringify(nextViewState);
    if (lastEmittedViewState.current === nextJson) return;
    
    lastEmittedViewState.current = nextJson;
    onViewStateChange(nextViewState);
  }, [activeSource, selectedFolder, expandedFolders, fileSystem, onViewStateChange, getFolderPath]);

  // Initialize selected folder (only if not restored from viewState)
  useEffect(() => {
    if (fileSystem && !selectedFolder && !didApplyInitialViewState.current) {
      setSelectedFolder(fileSystem[activeSource]);
      isInitialized.current = true;
    }
  }, [fileSystem, activeSource, selectedFolder]);

  // Find parent of item
  const findParentOfItem = useCallback((root, targetId, parent = null) => {
    if (!root) return null;
    
    if (root.id === targetId) return parent;
    
    if (root.children) {
      for (const child of root.children) {
        const found = findParentOfItem(child, targetId, root);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handle folder selection
  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    setSelectedItem(null);
    if (folder.type === 'folder') {
      setExpandedFolders(prev => new Set([...prev, folder.id]));
    }
  };

  // Handle item selection
  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  // Handle item double click (open)
  const handleItemDoubleClick = (item) => {
    if (item.type === 'folder') {
      handleFolderClick(item);
    } else {
      // Open file in new window
      openFileInWindow(item);
    }
  };

  // Open file in workspace window
  const openFileInWindow = (file) => {
    const fileType = getFileType(file.name);
    toast({
      title: 'Otevírám soubor',
      description: `${file.name} se otevře v novém okně`
    });
    // In a real implementation, this would open a viewer window
  };

  // Create new folder
  const createFolder = () => {
    if (!newFolderName.trim() || !selectedFolder) return;

    const newFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      type: 'folder',
      children: []
    };

    setFileSystem(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const target = findItemInTree(updated[activeSource], selectedFolder.id);
      if (target && target.type === 'folder') {
        target.children = target.children || [];
        target.children.push(newFolder);
      }
      return updated;
    });

    setNewFolderName('');
    setShowNewFolder(false);
    toast({ title: 'Složka vytvořena', description: newFolderName });
  };

  // Find item in tree (mutable)
  const findItemInTree = (root, id) => {
    if (!root) return null;
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = findItemInTree(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Rename item
  const startRename = (item) => {
    setEditingItem(item.id);
    setEditingName(item.name);
  };

  const saveRename = () => {
    if (!editingName.trim() || !editingItem) return;

    setFileSystem(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const item = findItemInTree(updated[activeSource], editingItem);
      if (item) {
        item.name = editingName.trim();
      }
      return updated;
    });

    setEditingItem(null);
    setEditingName('');
    toast({ title: 'Přejmenováno' });
  };

  const cancelRename = () => {
    setEditingItem(null);
    setEditingName('');
  };

  // Delete item
  const deleteItem = (item) => {
    // Add to trash
    addToTrash({
      type: item.type === 'folder' ? TRASH_TYPES.NOTE : TRASH_TYPES.NOTE, // Using NOTE as generic
      name: item.name,
      data: item,
      sourceModule: 'Soubory',
      metadata: { fileType: item.type, size: item.size }
    });

    setFileSystem(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const removeFromTree = (node) => {
        if (node.children) {
          node.children = node.children.filter(child => {
            if (child.id === item.id) return false;
            removeFromTree(child);
            return true;
          });
        }
      };
      removeFromTree(updated[activeSource]);
      return updated;
    });

    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    toast({ title: 'Přesunuto do koše', description: item.name });
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetFolder) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetFolder.id) return;
    
    // Prevent dropping folder into itself or its children
    if (draggedItem.type === 'folder') {
      const isDescendant = (parent, childId) => {
        if (parent.id === childId) return true;
        if (parent.children) {
          return parent.children.some(c => isDescendant(c, childId));
        }
        return false;
      };
      if (isDescendant(draggedItem, targetFolder.id)) return;
    }
    
    setDropTarget(targetFolder.id);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetFolder.id || targetFolder.type !== 'folder') {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // Prevent dropping folder into itself
    if (draggedItem.type === 'folder') {
      const isDescendant = (parent, childId) => {
        if (parent.id === childId) return true;
        if (parent.children) {
          return parent.children.some(c => isDescendant(c, childId));
        }
        return false;
      };
      if (isDescendant(draggedItem, targetFolder.id)) {
        toast({ title: 'Nelze přesunout', description: 'Složku nelze přesunout do sebe sama', variant: 'destructive' });
        setDraggedItem(null);
        setDropTarget(null);
        return;
      }
    }

    setFileSystem(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      
      // Remove from current location
      const removeFromTree = (node) => {
        if (node.children) {
          const index = node.children.findIndex(c => c.id === draggedItem.id);
          if (index !== -1) {
            node.children.splice(index, 1);
            return true;
          }
          for (const child of node.children) {
            if (removeFromTree(child)) return true;
          }
        }
        return false;
      };
      
      const itemCopy = findItemInTree(updated[activeSource], draggedItem.id);
      if (!itemCopy) return prev;
      
      const itemData = JSON.parse(JSON.stringify(itemCopy));
      removeFromTree(updated[activeSource]);
      
      // Add to target
      const target = findItemInTree(updated[activeSource], targetFolder.id);
      if (target) {
        target.children = target.children || [];
        target.children.push(itemData);
      }
      
      return updated;
    });

    toast({ title: 'Přesunuto', description: `${draggedItem.name} → ${targetFolder.name}` });
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Render folder tree item
  const renderTreeItem = (item, level = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFolder?.id === item.id;
    const isDropping = dropTarget === item.id;
    const Icon = item.type === 'folder' ? (isExpanded ? FolderOpen : Folder) : FILE_ICONS[getFileType(item.name)] || File;

    return (
      <div key={item.id}>
        <div
          // === ITEM MODE: Data attributes for Mouse Ring ===
          data-steward-item={item.type === 'folder' ? 'folder' : 'file'}
          data-item-id={item.id}
          data-module-type="files"
          data-parent-id={selectedFolder?.id || ''}
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors relative
            ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/5 text-gray-300'}
            ${isDropping ? 'bg-cyan-500/30 ring-1 ring-cyan-400' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => item.type === 'folder' && handleFolderClick(item)}
          onDragOver={(e) => item.type === 'folder' && handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => item.type === 'folder' && handleDrop(e, item)}
        >
          {item.type === 'folder' && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFolder(item.id); }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {item.type !== 'folder' && <span className="w-4" />}
          <Icon className={`h-4 w-4 flex-shrink-0 ${item.type === 'folder' ? 'text-amber-400' : 'text-gray-400'}`} />
          <span className="text-sm truncate">{item.name}</span>
        </div>
        
        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {item.children
              .filter(child => child.type === 'folder')
              .map(child => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render content item
  const renderContentItem = (item) => {
    const isSelected = selectedItem?.id === item.id;
    const isEditing = editingItem === item.id;
    const Icon = item.type === 'folder' ? Folder : FILE_ICONS[getFileType(item.name)] || File;
    const fileType = getFileType(item.name);

    return (
      <div
        key={item.id}
        // === ITEM MODE: Data attributes for Mouse Ring ===
        data-steward-item={item.type === 'folder' ? 'folder' : 'file'}
        data-item-id={item.id}
        data-module-type="files"
        data-parent-id={selectedFolder?.id || ''}
        className={`group p-3 rounded-lg border transition-all cursor-pointer relative
          ${isSelected 
            ? 'bg-cyan-500/10 border-cyan-500/40' 
            : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-cyan-500/20'}
        `}
        onClick={() => handleItemClick(item)}
        onDoubleClick={() => handleItemDoubleClick(item)}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${item.type === 'folder' ? 'bg-amber-500/20' : 'bg-gray-500/20'}`}>
            <Icon className={`h-6 w-6 ${item.type === 'folder' ? 'text-amber-400' : 
              fileType === 'image' ? 'text-green-400' :
              fileType === 'video' ? 'text-purple-400' :
              fileType === 'audio' ? 'text-pink-400' :
              fileType === 'document' ? 'text-blue-400' : 'text-gray-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-7 text-sm bg-[#0a1628] border-cyan-500/30"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveRename}>
                  <Check className="h-3 w-3 text-green-400" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelRename}>
                  <X className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                {item.type === 'file' && (
                  <p className="text-xs text-gray-500">{item.size} • {item.modified}</p>
                )}
                {item.type === 'folder' && item.children && (
                  <p className="text-xs text-gray-500">{item.children.length} položek</p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-gray-400 hover:text-cyan-400"
              onClick={(e) => { e.stopPropagation(); startRename(item); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-gray-400 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (!fileSystem) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Folder className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Načítání souborů...</p>
        </div>
      </div>
    );
  }

  const currentContents = selectedFolder?.children || [];
  const folders = currentContents.filter(item => item.type === 'folder');
  const files = currentContents.filter(item => item.type === 'file');

  return (
    <div className="h-full flex flex-col">
      <ModuleHeader
        icon={Folder}
        title="Soubory"
        subtitle={`${currentContents.length} položek`}
        iconColor="text-amber-400"
        actions={
          <Button
            size="sm"
            onClick={() => setShowNewFolder(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <FolderPlus className="h-4 w-4 mr-1" />
            Nová složka
          </Button>
        }
      />

      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left Panel - Tree */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-cyan-500/20 pr-3">
          {/* Sources */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">Zdroje</p>
            <div className="space-y-1">
              {Object.values(SOURCES).map(source => {
                const SourceIcon = source.icon;
                const isActive = activeSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => {
                      if (source.available) {
                        setActiveSource(source.id);
                        setSelectedFolder(fileSystem[source.id]);
                      } else {
                        toast({ 
                          title: 'Nedostupné', 
                          description: `${source.name} není připojeno`,
                          variant: 'destructive'
                        });
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors
                      ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/5'}
                      ${!source.available ? 'opacity-50' : ''}
                    `}
                  >
                    <SourceIcon className={`h-4 w-4 ${source.color}`} />
                    <span className="text-sm">{source.name}</span>
                    {source.placeholder && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-gray-500/20 text-gray-500 ml-auto">
                        Brzy
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">Složky</p>
            <ScrollArea className="h-full">
              <div className="space-y-0.5">
                {fileSystem[activeSource]?.children?.map(item => 
                  item.type === 'folder' && renderTreeItem(item)
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right Panel - Contents */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Breadcrumb / Current path */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <button 
              onClick={() => setSelectedFolder(fileSystem[activeSource])}
              className="text-gray-400 hover:text-cyan-400"
            >
              {SOURCES[activeSource]?.name}
            </button>
            {selectedFolder && selectedFolder.id !== `root-${activeSource}` && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-600" />
                <span className="text-white">{selectedFolder.name}</span>
              </>
            )}
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="mb-3 flex items-center gap-2 p-2 bg-[#0a1628] rounded-lg border border-cyan-500/30">
              <FolderPlus className="h-4 w-4 text-amber-400" />
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Název nové složky..."
                className="flex-1 h-8 text-sm bg-transparent border-0 focus-visible:ring-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                }}
              />
              <Button size="sm" variant="ghost" onClick={createFolder} className="h-7 px-2 text-cyan-400">
                Vytvořit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="h-7 px-2 text-gray-400">
                Zrušit
              </Button>
            </div>
          )}

          {/* Contents */}
          <ScrollArea className="flex-1">
            {currentContents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Folder className="h-8 w-8 text-amber-400/50" />
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">Prázdná složka</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Tato složka neobsahuje žádné soubory ani podsložky.
                  </p>
                  <Button
                    onClick={() => setShowNewFolder(true)}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Vytvořit složku
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Folders */}
                {folders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Složky ({folders.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {folders.map(folder => renderContentItem(folder))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Soubory ({files.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {files.map(file => renderContentItem(file))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default FilesModule;
