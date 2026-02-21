/**
 * ConvertService - Centrální služba pro konverzi objektů
 * 
 * Princip:
 * - Convert vytváří NOVÝ objekt cílového typu
 * - Původní objekt ZŮSTÁVÁ na svém místě
 * - Mezi objekty vzniká bidirectional link
 * - Multi-convert je podporován (více cílových objektů)
 * - Každá konverze má timestamp
 * 
 * Convert NIKDY:
 * - Nemaže původní objekt
 * - Nepoužívá Trash pipeline
 */

import { v4 as uuidv4 } from 'uuid';

// Mapping of convert targets per source type
export const CONVERT_TARGETS = {
  note: ['task', 'goal', 'projectElement'],
  task: ['note', 'goal'],
  goal: ['task', 'note'],
  planArea: ['task', 'note'],
  processStep: ['task', 'note']
};

// Labels for UI
export const CONVERT_TARGET_LABELS = {
  task: { label: 'Úkol', icon: 'ListChecks' },
  goal: { label: 'Cíl', icon: 'Target' },
  note: { label: 'Poznámka', icon: 'FileText' },
  projectElement: { label: 'Projektový element', icon: 'Box' }
};

/**
 * Execute convert command
 * @param {Object} command - Convert command from MouseRing
 * @returns {Object} Result with success status and new object info
 */
export const executeConvert = (command) => {
  const { 
    sourceType, 
    sourceId, 
    targetType, 
    parentContext,
    moduleType 
  } = command;
  
  // Validate command
  if (!sourceId || !sourceType || !targetType) {
    console.warn('[ConvertService] Missing required fields:', { sourceId, sourceType, targetType });
    return { success: false, error: 'Missing required fields' };
  }
  
  // Validate convert path exists
  const allowedTargets = CONVERT_TARGETS[sourceType] || [];
  if (!allowedTargets.includes(targetType)) {
    console.warn('[ConvertService] Invalid convert target:', { sourceType, targetType, allowedTargets });
    return { success: false, error: 'Invalid convert target' };
  }
  
  // Get source object based on type
  let sourceObject = null;
  let sourceStorageKey = null;
  
  try {
    switch (sourceType) {
      case 'note':
        const notes = JSON.parse(localStorage.getItem('steward_notes') || '[]');
        sourceObject = notes.find(n => n.id === sourceId);
        sourceStorageKey = 'steward_notes';
        break;
        
      case 'task':
        const tasks = JSON.parse(localStorage.getItem('steward_tasks') || '[]');
        sourceObject = tasks.find(t => t.id === sourceId);
        sourceStorageKey = 'steward_tasks';
        break;
        
      case 'goal':
        const goals = JSON.parse(localStorage.getItem('steward_goals') || '[]');
        sourceObject = goals.find(g => g.id === sourceId);
        sourceStorageKey = 'steward_goals';
        break;
        
      case 'planArea':
        // Plan areas are nested inside goals
        const goalsForPlan = JSON.parse(localStorage.getItem('steward_goals') || '[]');
        for (const goal of goalsForPlan) {
          for (const plan of (goal.plans || [])) {
            const area = (plan.areas || []).find(a => a.id === sourceId);
            if (area) {
              sourceObject = area;
              sourceStorageKey = 'steward_goals';
              break;
            }
          }
          if (sourceObject) break;
        }
        break;
        
      case 'processStep':
        const processes = JSON.parse(localStorage.getItem('steward_processes') || '[]');
        for (const proc of processes) {
          const step = (proc.steps || []).find(s => s.id === sourceId);
          if (step) {
            sourceObject = step;
            sourceStorageKey = 'steward_processes';
            break;
          }
        }
        break;
        
      default:
        console.warn('[ConvertService] Unknown source type:', sourceType);
        return { success: false, error: 'Unknown source type' };
    }
    
    if (!sourceObject) {
      console.warn('[ConvertService] Source object not found:', sourceId);
      return { success: false, error: 'Source object not found' };
    }
    
    // Create new object
    const timestamp = new Date().toISOString();
    const newId = uuidv4();
    
    const newObject = createTargetObject(targetType, sourceObject, newId, timestamp, sourceId, sourceType);
    
    // Update source object with convertedTo metadata
    updateSourceWithConvertLink(sourceType, sourceId, {
      targetId: newId,
      targetType,
      convertedAt: timestamp
    });
    
    // Save new object
    saveNewObject(targetType, newObject, parentContext);
    
    // Dispatch events for UI updates
    dispatchConvertEvents(sourceType, targetType);
    
    return {
      success: true,
      newObject,
      sourceObject,
      timestamp
    };
    
  } catch (error) {
    console.error('[ConvertService] Convert failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create new object of target type from source
 */
const createTargetObject = (targetType, source, newId, timestamp, sourceId, sourceType) => {
  const baseObject = {
    id: newId,
    title: source.title || source.name || source.content?.substring(0, 50) || 'Bez názvu',
    content: source.content || source.description || '',
    createdAt: timestamp,
    // Convert metadata
    convertedFromId: sourceId,
    convertedFromType: sourceType,
    convertedAt: timestamp
  };
  
  switch (targetType) {
    case 'task':
      return {
        ...baseObject,
        completed: false,
        priority: source.priority || 'medium',
        dueDate: source.dueDate || null,
        tags: source.tags || []
      };
      
    case 'goal':
      return {
        ...baseObject,
        name: baseObject.title,
        status: 'active',
        progress: 0,
        color: source.color || 'cyan',
        plans: []
      };
      
    case 'note':
      return {
        ...baseObject,
        content: source.content || source.description || source.title || '',
        tags: source.tags || [],
        color: source.color || 'default'
      };
      
    case 'projectElement':
      return {
        ...baseObject,
        type: 'note', // Default element type
        position: { x: 100, y: 100 },
        color: source.color || 'default'
      };
      
    default:
      return baseObject;
  }
};

/**
 * Update source object with convert link
 */
const updateSourceWithConvertLink = (sourceType, sourceId, convertLink) => {
  switch (sourceType) {
    case 'note': {
      const notes = JSON.parse(localStorage.getItem('steward_notes') || '[]');
      const noteIndex = notes.findIndex(n => n.id === sourceId);
      if (noteIndex !== -1) {
        notes[noteIndex].convertedTo = notes[noteIndex].convertedTo || [];
        notes[noteIndex].convertedTo.push(convertLink);
        notes[noteIndex].isConverted = true;
        localStorage.setItem('steward_notes', JSON.stringify(notes));
      }
      break;
    }
    
    case 'task': {
      const tasks = JSON.parse(localStorage.getItem('steward_tasks') || '[]');
      const taskIndex = tasks.findIndex(t => t.id === sourceId);
      if (taskIndex !== -1) {
        tasks[taskIndex].convertedTo = tasks[taskIndex].convertedTo || [];
        tasks[taskIndex].convertedTo.push(convertLink);
        tasks[taskIndex].isConverted = true;
        localStorage.setItem('steward_tasks', JSON.stringify(tasks));
      }
      break;
    }
    
    case 'goal': {
      const goals = JSON.parse(localStorage.getItem('steward_goals') || '[]');
      const goalIndex = goals.findIndex(g => g.id === sourceId);
      if (goalIndex !== -1) {
        goals[goalIndex].convertedTo = goals[goalIndex].convertedTo || [];
        goals[goalIndex].convertedTo.push(convertLink);
        goals[goalIndex].isConverted = true;
        localStorage.setItem('steward_goals', JSON.stringify(goals));
      }
      break;
    }
    
    case 'planArea': {
      const goals = JSON.parse(localStorage.getItem('steward_goals') || '[]');
      for (const goal of goals) {
        for (const plan of (goal.plans || [])) {
          const areaIndex = (plan.areas || []).findIndex(a => a.id === sourceId);
          if (areaIndex !== -1) {
            plan.areas[areaIndex].convertedTo = plan.areas[areaIndex].convertedTo || [];
            plan.areas[areaIndex].convertedTo.push(convertLink);
            plan.areas[areaIndex].isConverted = true;
            localStorage.setItem('steward_goals', JSON.stringify(goals));
            return;
          }
        }
      }
      break;
    }
    
    case 'processStep': {
      const processes = JSON.parse(localStorage.getItem('steward_processes') || '[]');
      for (const proc of processes) {
        const stepIndex = (proc.steps || []).findIndex(s => s.id === sourceId);
        if (stepIndex !== -1) {
          proc.steps[stepIndex].convertedTo = proc.steps[stepIndex].convertedTo || [];
          proc.steps[stepIndex].convertedTo.push(convertLink);
          proc.steps[stepIndex].isConverted = true;
          localStorage.setItem('steward_processes', JSON.stringify(processes));
          return;
        }
      }
      break;
    }
  }
};

/**
 * Save new converted object to storage
 */
const saveNewObject = (targetType, newObject, parentContext) => {
  switch (targetType) {
    case 'task': {
      const tasks = JSON.parse(localStorage.getItem('steward_tasks') || '[]');
      tasks.push(newObject);
      localStorage.setItem('steward_tasks', JSON.stringify(tasks));
      break;
    }
    
    case 'goal': {
      const goals = JSON.parse(localStorage.getItem('steward_goals') || '[]');
      goals.push(newObject);
      localStorage.setItem('steward_goals', JSON.stringify(goals));
      break;
    }
    
    case 'note': {
      const notes = JSON.parse(localStorage.getItem('steward_notes') || '[]');
      notes.push(newObject);
      localStorage.setItem('steward_notes', JSON.stringify(notes));
      break;
    }
    
    case 'projectElement': {
      // Project elements need special handling - add to current project world if context available
      if (parentContext?.scopeId) {
        const projectWorldKey = `project_world_${parentContext.scopeId}`;
        const projectWorld = JSON.parse(localStorage.getItem(projectWorldKey) || '{}');
        
        if (projectWorld.structure?.root) {
          projectWorld.structure.root.items = projectWorld.structure.root.items || [];
          projectWorld.structure.root.items.push(newObject);
          localStorage.setItem(projectWorldKey, JSON.stringify(projectWorld));
        }
      }
      break;
    }
  }
};

/**
 * Dispatch update events for UI refresh
 */
const dispatchConvertEvents = (sourceType, targetType) => {
  // Source type events
  const sourceEvents = {
    note: 'steward-notes-updated',
    task: 'steward-tasks-updated',
    goal: 'steward-goals-updated',
    planArea: 'steward-goals-updated',
    processStep: 'steward-processes-updated'
  };
  
  // Target type events
  const targetEvents = {
    task: 'steward-tasks-updated',
    goal: 'steward-goals-updated',
    note: 'steward-notes-updated',
    projectElement: 'steward-project-world-updated'
  };
  
  if (sourceEvents[sourceType]) {
    window.dispatchEvent(new CustomEvent(sourceEvents[sourceType]));
  }
  
  if (targetEvents[targetType] && targetEvents[targetType] !== sourceEvents[sourceType]) {
    window.dispatchEvent(new CustomEvent(targetEvents[targetType]));
  }
};

/**
 * Get available convert targets for a source type
 */
export const getConvertTargets = (sourceType) => {
  const targets = CONVERT_TARGETS[sourceType] || [];
  return targets.map(t => ({
    type: t,
    ...CONVERT_TARGET_LABELS[t]
  }));
};

/**
 * Check if source object has been converted
 */
export const hasConversions = (object) => {
  return object?.isConverted || (object?.convertedTo && object.convertedTo.length > 0);
};

/**
 * Check if object was created from conversion
 */
export const isConvertedFrom = (object) => {
  return !!object?.convertedFromId;
};

export default {
  executeConvert,
  getConvertTargets,
  hasConversions,
  isConvertedFrom,
  CONVERT_TARGETS,
  CONVERT_TARGET_LABELS
};
