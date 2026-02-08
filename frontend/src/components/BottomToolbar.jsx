import React, { useState } from 'react';
import { 
  BarChart3, 
  Lightbulb, 
  Monitor, 
  Timer, 
  Search, 
  Edit3, 
  TrendingUp, 
  FileText, 
  Users, 
  Key, 
  Maximize2, 
  Clock, 
  Video,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from './ui/button';
import { useWorkspace } from '../context/WorkspaceContext';
import { toast } from '../hooks/use-toast';
import WorkspaceLayoutManager from './WorkspaceLayoutManager';

const toolbarItems = [
  { id: 'chart', icon: BarChart3, label: 'Graf', type: 'chart' },
  { id: 'idea', icon: Lightbulb, label: 'Nápad', type: 'notes' },
  { id: 'screen', icon: Monitor, label: 'Monitor', type: 'monitor' },
  { id: 'timer', icon: Timer, label: 'Časovač', type: 'timer' },
  { id: 'search', icon: Search, label: 'Hledat', type: 'search' },
  { id: 'edit', icon: Edit3, label: 'Poznámky', type: 'notes' },
  { id: 'trend', icon: TrendingUp, label: 'Projekty', type: 'projects' },
  { id: 'file', icon: FileText, label: 'Úkoly', type: 'tasks' },
  { id: 'people', icon: Users, label: 'Lidi', type: 'people' },
  { id: 'key', icon: Key, label: 'Přístup', type: 'access' },
  { id: 'maximize', icon: Maximize2, label: 'Rozšířit', type: 'expand' },
  { id: 'clock', icon: Clock, label: 'Čas', type: 'clock' },
  { id: 'video', icon: Video, label: 'Video', type: 'video' },
  { id: 'ai', icon: Sparkles, label: 'AI Asistent', type: 'ai', highlight: true }
];

const BottomToolbar = () => {
  const { addModule } = useWorkspace();
  const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);

  const handleToolClick = (item) => {
    if (['notes', 'tasks', 'contacts', 'projects', 'chart', 'timer'].includes(item.type)) {
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

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a1628]/95 backdrop-blur-lg border-t border-cyan-500/20 flex items-center justify-between px-8 z-50">
        {/* Left side - Layout Manager */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLayoutManagerOpen(true)}
            className="h-12 w-12 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-300"
            title="Správa Layoutů"
          >
            <Layers className="h-5 w-5" />
          </Button>
          <div className="text-xs text-gray-500 ml-2">
            <div className="text-cyan-400 font-medium">Layouty</div>
            <div>Workspace</div>
          </div>
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
