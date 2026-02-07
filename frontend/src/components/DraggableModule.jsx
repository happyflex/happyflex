import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2 } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import NotesModule from './modules/NotesModule';
import TasksModule from './modules/TasksModule';
import ContactsModule from './modules/ContactsModule';
import ProjectsModule from './modules/ProjectsModule';
import ChartModule from './modules/ChartModule';
import TimerModule from './modules/TimerModule';

const moduleComponents = {
  notes: NotesModule,
  tasks: TasksModule,
  contacts: ContactsModule,
  projects: ProjectsModule,
  chart: ChartModule,
  timer: TimerModule
};

const DraggableModule = ({ module }) => {
  const { removeModule, updateModulePosition, bringToFront, deferModule } = useWorkspace();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const moduleRef = useRef(null);

  const ModuleComponent = moduleComponents[module.type];

  const handleMouseDown = (e) => {
    if (e.target.closest('.module-content')) return;
    
    // Prevent text selection during drag
    e.preventDefault();
    
    setIsDragging(true);
    bringToFront(module.id);
    
    const rect = moduleRef.current.getBoundingClientRect();
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
      
      updateModulePosition(module.id, {
        x: Math.max(0, Math.min(newX, window.innerWidth - module.size.width)),
        y: Math.max(0, Math.min(newY, window.innerHeight - module.size.height - 80))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, module.id, module.size, updateModulePosition]);

  if (!ModuleComponent) return null;

  return (
    <div
      ref={moduleRef}
      className={`absolute bg-[#0f1d35]/95 backdrop-blur-lg rounded-xl border border-cyan-500/30 shadow-2xl overflow-hidden transition-shadow ${
        isDragging ? 'shadow-cyan-500/50' : ''
      }`}
      style={{
        left: module.position.x,
        top: module.position.y,
        width: module.size.width,
        height: module.size.height,
        zIndex: module.zIndex
      }}
    >
      <div
        className="h-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 flex items-center justify-between px-4 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-sm font-medium text-white">
            {module.type === 'notes' && 'Poznámky'}
            {module.type === 'tasks' && 'Úkoly'}
            {module.type === 'contacts' && 'Kontakty'}
            {module.type === 'projects' && 'Projekty'}
            {module.type === 'chart' && 'Statistiky'}
            {module.type === 'timer' && 'Časovač'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => deferModule(module.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => removeModule(module.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="module-content p-4 h-[calc(100%-3rem)] overflow-auto">
        <ModuleComponent />
      </div>
    </div>
  );
};

export default DraggableModule;
