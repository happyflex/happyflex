import React, { useState } from 'react';
import { TrendingUp, Users, Calendar, ExternalLink } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import ProjectWorldModule from './ProjectWorldModule';

const ProjectsModule = () => {
  const { projects } = useWorkspace();
  const [selectedProject, setSelectedProject] = useState(null);

  // If project is selected, show Project World
  if (selectedProject) {
    return (
      <ProjectWorldModule 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
      />
    );
  }

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
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Projekty</h3>
        <p className="text-xs text-gray-400">{projects.length} projektů</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group p-4 bg-[#0a1628] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-white mb-1">{project.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded border ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">{project.progress}%</div>
                </div>
              </div>

              <Progress value={project.progress} className="h-2 mb-3" />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>Deadline: {new Date(project.deadline).toLocaleDateString('cs-CZ')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Users className="h-3 w-3" />
                  <span>Tým: {project.team.join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectsModule;
