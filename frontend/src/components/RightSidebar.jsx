import React from 'react';
import { Plus, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

const moduleTypeLabels = {
  notes: 'Poznámky',
  tasks: 'Úkoly',
  contacts: 'Kontakty',
  projects: 'Projekty',
  chart: 'Graf',
  timer: 'Časovač'
};

const RightSidebar = () => {
  const { deferredModules, restoreModule, modules } = useWorkspace();

  return (
    <div className="w-80 bg-[#0a1628]/80 backdrop-blur-lg border-l border-cyan-500/20 flex flex-col">
      <div className="p-6 border-b border-cyan-500/20">
        <h2 className="text-lg font-semibold text-white mb-1">Canvas</h2>
        <p className="text-sm text-gray-400">
          {modules.length > 0 
            ? `${modules.length} ${modules.length === 1 ? 'modul' : modules.length < 5 ? 'moduly' : 'modulů'} aktivních` 
            : 'Odložené moduly – klikni pro přidání'
          }
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-cyan-400 mb-3">Odložené moduly</h3>
            {deferredModules.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-cyan-400/50" />
                </div>
                <p className="text-sm text-gray-500">Zatím žádné odložené moduly</p>
                <p className="text-xs text-gray-600 mt-1">Přetáhni modul z canvasu sem</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deferredModules.map((module) => (
                  <div
                    key={module.id}
                    className="group p-3 bg-[#0f1d35] rounded-lg border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer"
                    onClick={() => restoreModule(module.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">
                        {moduleTypeLabels[module.type] || module.type}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreModule(module.id);
                        }}
                      >
                        <Plus className="h-4 w-4 text-cyan-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RightSidebar;
