import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, Users, Calendar, ExternalLink, Layout, Plus, X, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTrash } from '../../context/TrashContext';
import { useItemActions, ITEM_ACTIONS, ITEM_TYPES } from '../../context/ItemActionContext';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ProjectWorldModule from './ProjectWorldModule';
import ModuleHeader from './ModuleHeader';
import { toast } from '../../hooks/use-toast';

const ProjectsModule = ({ initialViewState, onViewStateChange }) => {
  const { projects, setProjects } = useWorkspace();
  const { addToTrash, TRASH_TYPES } = useTrash();
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentNodePath, setCurrentNodePath] = useState(null); // Track current path from ProjectWorld
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    status: 'active',
    deadline: '',
    team: ''
  });
  
  // VIEW STATE GUARDS: Prevent infinite loops
  const didApplyInitialViewState = useRef(false);
  const lastEmittedViewState = useRef(null);
  const isInitialized = useRef(false);

  // VIEW STATE: Apply initial viewState (once on mount or layout load)
  useEffect(() => {
    if (!initialViewState || didApplyInitialViewState.current) return;
    
    // Apply viewState from layout - find project by ID
    if (initialViewState.openProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === initialViewState.openProjectId);
      if (project) {
        setSelectedProject(project);
        // Set initial node path for deep restore
        if (initialViewState.nodePath && Array.isArray(initialViewState.nodePath)) {
          setCurrentNodePath(initialViewState.nodePath);
        }
      }
    }
    
    didApplyInitialViewState.current = true;
  }, [initialViewState, projects]);

  // VIEW STATE: Emit changes (with deep-equal guard)
  useEffect(() => {
    if (!onViewStateChange || !isInitialized.current) return;
    
    const nextViewState = {
      openProjectId: selectedProject?.id || undefined,
      nodePath: currentNodePath || undefined,
      selectedNodeId: currentNodePath && currentNodePath.length > 0 
        ? currentNodePath[currentNodePath.length - 1] 
        : undefined
    };
    
    // Deep-equal guard: only emit if changed
    const nextJson = JSON.stringify(nextViewState);
    if (lastEmittedViewState.current === nextJson) return;
    
    lastEmittedViewState.current = nextJson;
    onViewStateChange(nextViewState);
  }, [selectedProject, currentNodePath, onViewStateChange]);

  // Mark as initialized
  useEffect(() => {
    isInitialized.current = true;
  }, []);

  // Handle path change from ProjectWorldModule
  const handlePathChange = useCallback((newPath) => {
    setCurrentNodePath(newPath);
  }, []);

  // Listen for project element restore events to open the correct project
  useEffect(() => {
    const handleElementRestored = (event) => {
      const { projectId, nodePath } = event.detail || {};
      if (projectId) {
        // Find and select the project
        const project = projects.find(p => p.id === projectId);
        if (project) {
          // Store the nodePath to pass to ProjectWorldModule
          setCurrentNodePath(nodePath || null);
          setSelectedProject(project);
        }
      }
    };

    window.addEventListener('steward-project-element-restored', handleElementRestored);
    return () => {
      window.removeEventListener('steward-project-element-restored', handleElementRestored);
    };
  }, [projects]);

  // Delete project function
  const deleteProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      addToTrash({
        type: TRASH_TYPES.PROJECT,
        name: project.name,
        data: project,
        sourceModule: 'Projekty'
      });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({
        title: "Projekt přesunut do koše",
        description: project.name
      });
    }
  };

  // If project is selected, show Project World
  if (selectedProject) {
    return (
      <ProjectWorldModule 
        project={selectedProject} 
        onBack={() => {
          setSelectedProject(null);
          setCurrentNodePath(null);
        }}
        initialPath={currentNodePath}
        onPathChange={handlePathChange}
      />
    );
  }

  const handleAddProject = () => {
    if (!newProject.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadejte název projektu',
        variant: 'destructive'
      });
      return;
    }

    const project = {
      id: `proj-${Date.now()}`,
      name: newProject.name.trim(),
      progress: 0,
      status: newProject.status,
      deadline: newProject.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      team: newProject.team ? newProject.team.split(',').map(t => t.trim()).filter(t => t) : []
    };

    setProjects(prev => [...prev, project]);
    setNewProject({ name: '', status: 'active', deadline: '', team: '' });
    setShowAddDialog(false);
    
    toast({
      title: 'Projekt vytvořen',
      description: `${project.name} byl přidán`
    });
  };

  const statusColors = {
    active: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    completed: 'text-green-400 bg-green-500/10 border-green-500/30',
    paused: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  };

  const statusLabels = {
    active: 'Aktivní',
    completed: 'Dokončený',
    paused: 'Pozastavený'
  };

  return (
    <div className="h-full flex flex-col">
      <ModuleHeader
        icon={Layout}
        title="Projekty"
        subtitle={`${projects.length} projektů`}
        iconColor="text-blue-400"
        actions={
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nový projekt
          </Button>
        }
      />

      {/* Add Project Dialog */}
      {showAddDialog && (
        <div className="mb-4 p-4 bg-[#0a1628] rounded-lg border border-cyan-500/30">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Nový projekt</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddDialog(false)}
              className="h-6 w-6 text-gray-400 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Název projektu *</label>
              <Input
                placeholder="Název projektu..."
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="bg-[#0f1d35] border-cyan-500/30 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Status</label>
                <select
                  value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f1d35] border border-cyan-500/30 rounded-md text-white text-sm"
                >
                  <option value="active">Aktivní</option>
                  <option value="paused">Pozastavený</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Deadline</label>
                <Input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  className="bg-[#0f1d35] border-cyan-500/30 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tým (oddělte čárkou)</label>
              <Input
                placeholder="Jan, Marie, Petr..."
                value={newProject.team}
                onChange={(e) => setNewProject({ ...newProject, team: e.target.value })}
                className="bg-[#0f1d35] border-cyan-500/30 text-white"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDialog(false)}
                className="text-gray-400"
              >
                Zrušit
              </Button>
              <Button
                size="sm"
                onClick={handleAddProject}
                className="bg-cyan-500 hover:bg-cyan-400 text-white"
              >
                Vytvořit projekt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Get valid projects for rendering */}
      {(() => {
        const validProjects = (projects || []).filter(p => p && typeof p === 'object' && p.id);
        
        if (validProjects.length === 0 && !showAddDialog) {
          return (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Layout className="h-8 w-8 text-blue-400/50" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">Žádné projekty</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Vytvořte svůj první projekt a začněte organizovat práci.
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Vytvořit první projekt
                </Button>
              </div>
            </div>
          );
        }
        
        return (
          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {validProjects.map((project) => (
                <div
                  key={project.id}
                  className="group p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{project.name || '(Bez názvu)'}</h4>
                      <span className={`text-xs px-2 py-1 rounded border ${statusColors[project.status] || statusColors.active}`}>
                        {statusLabels[project.status] || 'Aktivní'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-400">{project.progress ?? 0}%</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedProject(project)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Otevřít
                      </Button>
                    </div>
                  </div>

                  <Progress value={project.progress ?? 0} className="h-2 mb-3" />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString('cs-CZ') : 'Neurčeno'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Users className="h-3 w-3" />
                      <span>Tým: {Array.isArray(project.team) ? project.team.join(', ') : '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        );
      })()}
    </div>
  );
};

export default ProjectsModule;
