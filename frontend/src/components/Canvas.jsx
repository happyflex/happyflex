import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import DraggableModule from './DraggableModule';

// Snap zone preview component
const SnapPreview = ({ zone }) => {
  if (!zone) return null;
  
  const padding = 16;
  const rightSidebarWidth = 320;
  const bottomToolbarHeight = 80;
  
  const workspaceWidth = window.innerWidth - rightSidebarWidth;
  const workspaceHeight = window.innerHeight - bottomToolbarHeight;
  
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
  const { modules, activeWorkzone, restoreModule, snapPreview } = useWorkspace();

  // Map workzone color to Tailwind class
  const getIconColorClass = () => {
    switch (activeWorkzone?.color) {
      case 'orange':
        return 'text-orange-400';
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
      case 'orange':
        return 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30';
      case 'yellow':
        return 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 'green':
        return 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30';
      default:
        return 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'canvas-to-workspace' && data.moduleId) {
        restoreModule(data.moduleId);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div 
      className="flex-1 relative overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
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
        
        {/* Animated glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
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
