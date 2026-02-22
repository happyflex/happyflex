/**
 * ConvertLinkBadge
 * 
 * Displays convert relationship info on items:
 * - Timeline (when conversion happened)
 * - Multi-convert links (clickable navigation)
 * - Defensive validation for missing/trashed links
 */

import React, { useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { useConvertTrace } from '../context/ConvertTraceContext';

// Type labels for display
const TYPE_LABELS = {
  note: 'Poznámka',
  task: 'Úkol',
  goal: 'Cíl',
  process: 'Proces',
  project: 'Projekt',
  person: 'Kontakt'
};

// Type colors
const TYPE_COLORS = {
  note: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  task: 'text-green-400 bg-green-500/20 border-green-500/30',
  goal: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  process: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  project: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  person: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30'
};

/**
 * Format ISO date to local display format
 * @param {string} isoDate - ISO UTC date string
 * @returns {string} Formatted date string
 */
const formatConvertDate = (isoDate) => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Neplatné datum';
    
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return 'Neplatné datum';
  }
};

/**
 * Check if an item exists (not deleted or in trash)
 * @param {string} itemId
 * @param {string} itemType
 * @returns {Object} { exists: boolean, inTrash: boolean }
 */
const checkItemExists = (itemId, itemType) => {
  if (!itemId || !itemType) return { exists: false, inTrash: false };
  
  // Check trash first
  try {
    const trashData = localStorage.getItem('steward_trash');
    if (trashData) {
      const trashItems = JSON.parse(trashData);
      const inTrash = trashItems.some(t => 
        t.originalData?.id === itemId || t.id === itemId
      );
      if (inTrash) return { exists: true, inTrash: true };
    }
  } catch (e) {
    console.warn('Error checking trash:', e);
  }
  
  // Check appropriate storage based on type
  const storageKeyMap = {
    note: 'steward_notes',
    task: 'steward_tasks',
    goal: 'steward_goals',
    process: 'steward_processes',
    project: 'steward_projects',
    person: 'steward_contacts'
  };
  
  const storageKey = storageKeyMap[itemType];
  if (!storageKey) return { exists: false, inTrash: false };
  
  try {
    const data = localStorage.getItem(storageKey);
    if (data) {
      const items = JSON.parse(data);
      const exists = items.some(item => item.id === itemId);
      return { exists, inTrash: false };
    }
  } catch (e) {
    console.warn('Error checking item existence:', e);
  }
  
  return { exists: false, inTrash: false };
};

/**
 * ConvertLinkBadge Component
 * 
 * @param {Object} props
 * @param {Object} props.item - The item to show convert info for
 * @param {string} props.itemType - Type of the item (note, task, etc.)
 * @param {Function} props.onNavigate - Callback to navigate to linked item
 * @param {boolean} props.compact - Use compact display mode
 */
const ConvertLinkBadge = ({ 
  item, 
  itemType, 
  onNavigate,
  compact = false 
}) => {
  const { triggerNavigationTrace } = useConvertTrace();
  const [hoveredLink, setHoveredLink] = useState(null);
  
  // Extract convert data from item
  const convertedTo = item?.convertedTo || [];
  const convertedFrom = item?.convertedFromId ? {
    id: item.convertedFromId,
    type: item.convertedFromType,
    convertedAt: item.convertedAt
  } : null;
  
  const hasConvertLinks = convertedTo.length > 0 || convertedFrom;
  
  // Handle click on linked item - must be before conditional return
  const handleLinkClick = useCallback((linkedId, linkedType, e) => {
    e?.stopPropagation();
    
    // Check if item exists
    const { exists, inTrash } = checkItemExists(linkedId, linkedType);
    
    if (!exists) {
      // Item doesn't exist - can't navigate
      return;
    }
    
    if (inTrash) {
      // Item is in trash - can't navigate directly
      return;
    }
    
    // Trigger navigation trace effect
    triggerNavigationTrace({
      itemId: item?.id,
      itemType,
      convertedTo,
      convertedFrom,
      moduleType: `${itemType}s`
    });
    
    // Navigate to linked item
    if (onNavigate) {
      onNavigate(linkedId, linkedType);
    }
  }, [item?.id, itemType, convertedTo, convertedFrom, triggerNavigationTrace, onNavigate]);
  
  if (!hasConvertLinks) return null;
  
  // Render single link badge
  const renderLinkBadge = (linkData, direction) => {
    const { exists, inTrash } = checkItemExists(linkData.id, linkData.type);
    const typeColor = TYPE_COLORS[linkData.type] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    const typeLabel = TYPE_LABELS[linkData.type] || linkData.type;
    
    const isHovered = hoveredLink === linkData.id;
    
    return (
      <div
        key={linkData.id}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs
          transition-all duration-200 cursor-pointer
          ${typeColor}
          ${isHovered ? 'ring-1 ring-cyan-400/50 scale-[1.02]' : ''}
          ${!exists || inTrash ? 'opacity-50' : 'hover:opacity-90'}
        `}
        onClick={(e) => handleLinkClick(linkData.id, linkData.type, e)}
        onMouseEnter={() => setHoveredLink(linkData.id)}
        onMouseLeave={() => setHoveredLink(null)}
      >
        {direction === 'from' ? (
          <ArrowLeft className="h-3 w-3 text-purple-400" />
        ) : (
          <ArrowRight className="h-3 w-3 text-cyan-400" />
        )}
        
        <span className="font-medium">{typeLabel}</span>
        
        {!compact && linkData.convertedAt && (
          <span className="text-gray-500 ml-1">
            {formatConvertDate(linkData.convertedAt)}
          </span>
        )}
        
        {inTrash && (
          <Trash2 className="h-3 w-3 text-red-400 ml-1" title="V koši" />
        )}
        
        {!exists && !inTrash && (
          <AlertCircle className="h-3 w-3 text-orange-400 ml-1" title="Chybějící vazba" />
        )}
        
        {exists && !inTrash && (
          <ExternalLink className="h-3 w-3 opacity-50 ml-1" />
        )}
      </div>
    );
  };
  
  if (compact) {
    // Compact mode: single line with icons only
    return (
      <div className="flex items-center gap-1 mt-1">
        {convertedFrom && (
          <div
            className="flex items-center gap-0.5 text-purple-400 text-xs cursor-pointer hover:opacity-80"
            onClick={(e) => handleLinkClick(convertedFrom.id, convertedFrom.type, e)}
            title={`Vytvořeno z: ${TYPE_LABELS[convertedFrom.type] || convertedFrom.type}`}
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="text-[10px]">{TYPE_LABELS[convertedFrom.type]?.slice(0, 3)}</span>
          </div>
        )}
        {convertedTo.length > 0 && (
          <div className="flex items-center gap-0.5 text-cyan-400 text-xs">
            <ArrowRight className="h-3 w-3" />
            <span className="text-[10px]">{convertedTo.length}×</span>
          </div>
        )}
      </div>
    );
  }
  
  // Full mode: detailed list
  return (
    <div className="mt-2 pt-2 border-t border-gray-700/50">
      {/* Converted FROM section */}
      {convertedFrom && (
        <div className="mb-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <ArrowLeft className="h-2.5 w-2.5" />
            Vytvořeno z
          </div>
          {renderLinkBadge(convertedFrom, 'from')}
        </div>
      )}
      
      {/* Converted TO section */}
      {convertedTo.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <ArrowRight className="h-2.5 w-2.5" />
            Převedeno na
          </div>
          <div className="flex flex-wrap gap-1">
            {convertedTo.map(link => renderLinkBadge({
              id: link.targetId,
              type: link.targetType,
              convertedAt: link.convertedAt
            }, 'to'))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvertLinkBadge;
