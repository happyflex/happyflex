import React, { useState } from 'react';
import { 
  BarChart3, 
  Timer, 
  Edit3, 
  FileText, 
  Users, 
  Video,
  Sparkles,
  Layers,
  Target,
  GitBranch,
  Layout,
  ListChecks,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { useWorkspace } from '../context/WorkspaceContext';
import { toast } from '../hooks/use-toast';
import WorkspaceLayoutManager from './WorkspaceLayoutManager';

// Workzones definition
const WORKZONES = [
  { 
    id: 'problem-solving', 
    name: 'Problem Solving Zóna', 
    color: 'orange',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-400',
    glowColor: 'shadow-orange-500/50',
    dotColor: 'bg-orange-500'
  },
  { 
    id: 'planning', 
    name: 'Plánovací Zóna', 
    color: 'yellow',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    textColor: 'text-yellow-400',
    glowColor: 'shadow-yellow-500/50',
    dotColor: 'bg-yellow-500'
  },
  { 
    id: 'executive', 
    name: 'Exekutivní Zóna', 
    color: 'green',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
    textColor: 'text-green-400',
    glowColor: 'shadow-green-500/50',
    dotColor: 'bg-green-500'
  }
];

const toolbarItems = [
  { id: 'chart', icon: BarChart3, label: 'Graf', type: 'chart' },
  { id: 'timer', icon: Timer, label: 'Časovač', type: 'timer' },
  { id: 'edit', icon: Edit3, label: 'Poznámky', type: 'notes' },
  { id: 'goals', icon: Target, label: 'Cíle', type: 'goals' },
  { id: 'processes', icon: GitBranch, label: 'Procesy', type: 'processes' },
  { id: 'trend', icon: Layout, label: 'Projekty', type: 'projects' },
  { id: 'file', icon: ListChecks, label: 'Úkoly', type: 'tasks' },
  { id: 'people', icon: Users, label: 'Lidi', type: 'people' },
  { id: 'video', icon: Video, label: 'Video', type: 'video' },
  { id: 'ai', icon: Sparkles, label: 'AI Asistent', type: 'ai', highlight: true }
];

const BottomToolbar = () => {
  const { addModule, activeWorkzone, setActiveWorkzone } = useWorkspace();
  const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
  const [workzonePopoverOpen, setWorkzonePopoverOpen] = useState(false);

  // Close popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (workzonePopoverOpen && !e.target.closest('.workzone-popover-trigger') && !e.target.closest('.workzone-popover')) {
        setWorkzonePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [workzonePopoverOpen]);

  const handleToolClick = (item) => {
    if (['notes', 'tasks', 'people', 'projects', 'goals', 'processes', 'chart', 'timer'].includes(item.type)) {
      addModule(item.type);
      toast({
        title: 'Modul přidán',
        description: `${item.label} byl přidán na canvas`,
      });
    } else {
      toast({
        title: item.label,
        description: 'Tato funkce bude dostupná brzy',
      });
    }
  };

  const handleWorkzoneChange = (workzone) => {
    setActiveWorkzone(workzone);
    setWorkzonePopoverOpen(false);
    toast({
      title: 'Workzone změněna',
      description: `Přepnuto na ${workzone.name}`,
    });
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a1628]/95 backdrop-blur-lg border-t border-cyan-500/20 flex items-center justify-between px-8 z-50">
        {/* Left side - Workzones */}
        <div className="flex items-center gap-3">
          <div className="relative workzone-popover-trigger">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWorkzonePopoverOpen(!workzonePopoverOpen)}
              className={`
                h-12 w-12 rounded-xl transition-all duration-300
                ${activeWorkzone 
                  ? `${activeWorkzone.bgColor} ${activeWorkzone.borderColor} border ${activeWorkzone.textColor}` 
                  : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/30 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/30'
                }
                hover:scale-110
              `}
              title="Workzones"
            >
              <Zap className="h-5 w-5" />
            </Button>

            {/* Workzone Popover */}
            {workzonePopoverOpen && (
              <div className="workzone-popover absolute bottom-16 left-0 bg-[#0f1d35] border border-cyan-500/30 rounded-lg shadow-2xl p-2 min-w-[220px] z-50">
                <div className="text-xs text-gray-400 px-2 py-1 mb-1">Přepnout kontext</div>
                {WORKZONES.map(zone => (
                  <button
                    key={zone.id}
                    onClick={() => handleWorkzoneChange(zone)}
                    className={`
                      w-full px-3 py-2 rounded-lg text-left transition-all
                      ${activeWorkzone?.id === zone.id 
                        ? `${zone.bgColor} ${zone.borderColor} border ${zone.textColor}` 
                        : 'hover:bg-cyan-500/10 text-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${zone.dotColor}`} />
                      <span className="text-sm font-medium whitespace-nowrap">{zone.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layouts icon only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayoutManagerOpen(true)}
            className="h-12 w-12 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-300 bg-cyan-500/5 border border-cyan-500/20"
            title="Layouty"
          >
            <Layers className="h-5 w-5" />
          </Button>
        </div>

        {/* Center - Module Tools */}
        <div className="flex items-center gap-2">
          {toolbarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                onClick={() => handleToolClick(item)}
                className={`
                  relative h-12 w-12 rounded-xl transition-all duration-300
                  ${item.highlight 
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-500/50' 
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:scale-110'
                  }
                `}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                {item.id === 'search' && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Right side - Placeholder for future features */}
        <div className="w-32"></div>
      </div>

      <WorkspaceLayoutManager 
        isOpen={layoutManagerOpen} 
        onClose={() => setLayoutManagerOpen(false)} 
      />
    </>
  );
};

export default BottomToolbar;
