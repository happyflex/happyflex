import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import DraggableModule from './DraggableModule';

// Snap zone preview component
const SnapPreview = ({ zone }) => {
  if (!zone) return null;
  
  const padding = 16;
  const rightSidebarWidth = 320;
  const bottomToolbarHeight = 80;
  const headerHeight = 64;
  
  // Canvas is positioned below header, so we calculate available space within Canvas
  const workspaceWidth = window.innerWidth - rightSidebarWidth;
  const workspaceHeight = window.innerHeight - headerHeight - bottomToolbarHeight;
  
  const styles = {
    'top-left': {
      left: padding, top: padding,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight / 2 - padding * 1.5
    },
    'top-right': {
      left: workspaceWidth / 2 + padding / 2, top: padding,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight / 2 - padding * 1.5
    },
    'bottom-left': {
      left: padding, top: workspaceHeight / 2 + padding / 2,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight / 2 - padding * 1.5
    },
    'bottom-right': {
      left: workspaceWidth / 2 + padding / 2, top: workspaceHeight / 2 + padding / 2,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight / 2 - padding * 1.5
    },
    'left-half': {
      left: padding, top: padding,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight - padding * 2
    },
    'right-half': {
      left: workspaceWidth / 2 + padding / 2, top: padding,
      width: workspaceWidth / 2 - padding * 1.5,
      height: workspaceHeight - padding * 2
    },
    'maximized': {
      left: padding, top: padding,
      width: workspaceWidth - padding * 2,
      height: workspaceHeight - padding * 2
    }
  };
  
  const style = styles[zone];
  if (!style) return null;
  
  return (
    <div
      className="absolute bg-cyan-500/20 border-2 border-cyan-400/50 rounded-xl pointer-events-none z-[9998] transition-all duration-150"
      style={style}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-cyan-400 text-sm font-medium bg-[#0a1628]/80 px-3 py-1 rounded-lg">
          {zone === 'maximized' ? 'Maximalizovat' : 
           zone === 'left-half' ? 'Levá polovina' :
           zone === 'right-half' ? 'Pravá polovina' :
           zone === 'top-left' ? 'Vlevo nahoře' :
           zone === 'top-right' ? 'Vpravo nahoře' :
           zone === 'bottom-left' ? 'Vlevo dole' :
           zone === 'bottom-right' ? 'Vpravo dole' : zone}
        </span>
      </div>
    </div>
  );
};

const Canvas = () => {
  const { 
    modules, 
    activeWorkzone, 
    restoreModule, 
    snapPreview, 
    addModule, 
    bringToFront,
    setNotes,
    setTasks,
    setProjects,
    notes,
    tasks,
    projects
  } = useWorkspace();
  const [isDragOverWorkspace, setIsDragOverWorkspace] = useState(false);

  // Map workzone color to Tailwind class
  const getIconColorClass = () => {
    switch (activeWorkzone?.color) {
      case 'purple':
        return 'text-purple-400';
      case 'yellow':
        return 'text-yellow-400';
      case 'green':
        return 'text-green-400';
      default:
        return 'text-cyan-400';
    }
  };

  const getIconBackgroundClass = () => {
    switch (activeWorkzone?.color) {
      case 'purple':
        return 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30';
      case 'yellow':
        return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 'green':
        return 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30';
      default:
        return 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30';
    }
  };

  // Get background pulse color based on active workzone
  const getPulseColorClass = () => {
    switch (activeWorkzone?.color) {
      case 'purple':
        return 'bg-purple-500/10';
      case 'yellow':
        return 'bg-yellow-500/10';
      case 'green':
        return 'bg-green-500/10';
      default:
        return 'bg-cyan-500/10';
    }
  };

  // Handle restoring content items from trash
  const handleTrashContentRestore = (data) => {
    const { itemType, originalData, trashId, sourceModule } = data;
    
    // Validate originalData before restore
    if (!originalData || typeof originalData !== 'object' || !originalData.id) {
      console.warn('Invalid originalData for restore:', originalData);
      return false;
    }
    
    // Get the module type for opening
    const moduleTypeMap = {
      'note': 'notes',
      'task': 'tasks',
      'person': 'people',
      'project': 'projects',
      'goal': 'goals',
      'process': 'processes'
    };
    
    const moduleType = moduleTypeMap[itemType] || sourceModule;
    
    // Restore data based on type - use React state setters for immediate update
    switch (itemType) {
      case 'note':
        // Use React state setter for immediate UI update
        if (!notes.some(n => n && n.id === originalData.id)) {
          setNotes(prev => [...(prev || []).filter(n => n && n.id), originalData]);
        }
        break;
        
      case 'task':
        // Use React state setter for immediate UI update
        if (!tasks.some(t => t && t.id === originalData.id)) {
          setTasks(prev => [...(prev || []).filter(t => t && t.id), originalData]);
        }
        break;
        
      case 'project':
        // Use React state setter for immediate UI update
        if (!projects.some(p => p && p.id === originalData.id)) {
          setProjects(prev => [...(prev || []).filter(p => p && p.id), originalData]);
        }
        break;
        
      case 'person':
        // People use independent state in PeopleModule - update localStorage and dispatch event
        const peopleData = localStorage.getItem('steward_contacts');
        const people = peopleData ? JSON.parse(peopleData) : [];
        const validPeople = people.filter(p => p && p.id);
        if (!validPeople.some(p => p.id === originalData.id)) {
          validPeople.push(originalData);
          localStorage.setItem('steward_contacts', JSON.stringify(validPeople));
          window.dispatchEvent(new CustomEvent('steward-people-updated'));
        }
        break;
        
      case 'goal':
        // Goals use independent state in GoalsModule - update localStorage and dispatch event
        const goalsData = localStorage.getItem('steward_goals');
        const goals = goalsData ? JSON.parse(goalsData) : [];
        const validGoals = goals.filter(g => g && g.id);
        if (!validGoals.some(g => g.id === originalData.id)) {
          validGoals.push(originalData);
          localStorage.setItem('steward_goals', JSON.stringify(validGoals));
          window.dispatchEvent(new CustomEvent('steward-goals-updated'));
        }
        break;
        
      case 'process':
        // Processes use independent state in ProcessesModule - update localStorage and dispatch event
        const processesData = localStorage.getItem('steward_processes');
        const processes = processesData ? JSON.parse(processesData) : [];
        const validProcesses = processes.filter(p => p && p.id);
        if (!validProcesses.some(p => p.id === originalData.id)) {
          validProcesses.push(originalData);
          localStorage.setItem('steward_processes', JSON.stringify(validProcesses));
          window.dispatchEvent(new CustomEvent('steward-processes-updated'));
        }
        break;
    }
    
    // Open or focus the module
    if (moduleType) {
      const existingModule = modules.find(m => m.type === moduleType);
      if (existingModule) {
        bringToFront(existingModule.id);
      } else {
        addModule(moduleType);
      }
      
      // Dispatch event to select the restored item in the module
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('steward-select-item', {
          detail: { moduleType, itemId: originalData.id }
        }));
      }, 300);
    }
    
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOverWorkspace(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Handle canvas-to-workspace restore
      if (data.type === 'canvas-to-workspace' && data.moduleId) {
        restoreModule(data.moduleId);
        return;
      }
      
      // Handle trash-to-workspace restore
      if (data.type === 'trash-restore') {
        const { itemType, trashId, itemName, originalData, metadata } = data;
        
        // Remove from trash
        window.dispatchEvent(new CustomEvent('steward-trash-remove', {
          detail: { trashId }
        }));
        
        if (itemType === 'window') {
          // Restore window
          const position = {
            x: e.clientX - 200,
            y: e.clientY - 100
          };
          addModule(originalData.type, position);
          
          // Show toast
          window.dispatchEvent(new CustomEvent('steward-toast', {
            detail: {
              title: 'Okno obnoveno',
              description: `${itemName} bylo obnoveno z koše`
            }
          }));
        } else {
          // Restore content item
          handleTrashContentRestore(data);
          
          // Show toast
          window.dispatchEvent(new CustomEvent('steward-toast', {
            detail: {
              title: 'Obnoveno z koše',
              description: `${itemName} byl/a obnoven/a`
            }
          }));
        }
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if it's a trash restore drag
    try {
      const types = e.dataTransfer.types;
      if (types.includes('application/json')) {
        setIsDragOverWorkspace(true);
      }
    } catch (error) {
      // Ignore errors during dragover
    }
  };

  const handleDragLeave = (e) => {
    // Only set to false if we're actually leaving the workspace
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOverWorkspace(false);
  };

  return (
    <div 
      className="flex-1 relative overflow-hidden"
      data-workspace="main"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drop zone overlay */}
      {isDragOverWorkspace && (
        <div className="absolute inset-0 z-[100] pointer-events-none">
          <div className="absolute inset-4 border-2 border-dashed border-cyan-400/50 rounded-2xl bg-cyan-500/5 flex items-center justify-center">
            <div className="text-center">
              <div className="text-cyan-400 text-lg font-medium mb-1">Pusť pro obnovení</div>
              <div className="text-cyan-400/60 text-sm">Položka bude obnovena z koše</div>
            </div>
          </div>
        </div>
      )}

      {/* Futuristic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1b3a] to-[#1a1f3a]">
        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Animated glow effects - slow subtle pulse */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          style={{ animation: 'slow-pulse 8s ease-in-out infinite' }}
        ></div>
        <div 
          className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${getPulseColorClass()} rounded-full blur-3xl transition-colors duration-500`}
          style={{ animation: 'slow-pulse 8s ease-in-out infinite', animationDelay: '4s' }}
        ></div>
        
        {/* Slow pulse animation */}
        <style>{`
          @keyframes slow-pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
          }
        `}</style>
      </div>

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              <div className={`w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center border transition-all duration-300 ${getIconBackgroundClass()}`}>
                <svg viewBox="0 0 24 24" className={`w-12 h-12 ${getIconColorClass()} transition-colors duration-300`} fill="currentColor">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Vítejte v S.T.E.W.A.R.D. Workspace</h2>
            <p className="text-gray-400 mb-6">Klikni na nástroj v dolním panelu pro přidání modulu</p>
            <div className="flex items-center justify-center gap-4 text-sm text-cyan-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span>100% Připraven</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{modules.length} modulů</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snap Preview Overlay */}
      <SnapPreview zone={snapPreview} />

      {/* Modules */}
      {modules.map((module) => (
        <DraggableModule key={module.id} module={module} />
      ))}
    </div>
  );
};

export default Canvas;
