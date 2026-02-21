/**
 * ConvertedBadge - Visual indicator for converted objects
 * 
 * Shows:
 * - Badge when object has been converted (source)
 * - Link to converted targets
 * - Badge when object was created from conversion (target)
 * - Link back to original source
 */

import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Shuffle, Trash2 } from 'lucide-react';
import { CONVERT_TARGET_LABELS } from '../../services/ConvertService';

/**
 * Badge for source object that was converted
 */
export const ConvertedFromBadge = ({ convertedTo = [], onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!convertedTo || convertedTo.length === 0) return null;
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="relative">
      {/* Main badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-colors"
      >
        <Shuffle className="w-2.5 h-2.5" />
        <span>Převedeno</span>
        {convertedTo.length > 1 && (
          <span className="ml-0.5 px-1 rounded-full bg-violet-500/30 text-[9px]">
            {convertedTo.length}
          </span>
        )}
      </button>
      
      {/* Expanded list */}
      {expanded && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[160px] p-1.5 rounded-lg bg-gray-900/95 border border-violet-500/30 shadow-lg backdrop-blur-sm"
          style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }}
        >
          <div className="text-[9px] text-gray-400 px-1 mb-1">Převedeno na:</div>
          {convertedTo.map((conversion, idx) => {
            const targetInfo = CONVERT_TARGET_LABELS[conversion.targetType] || { label: conversion.targetType };
            const isInTrash = conversion.isInTrash;
            
            return (
              <button
                key={idx}
                onClick={() => !isInTrash && onNavigate?.(conversion.targetId, conversion.targetType)}
                disabled={isInTrash}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] transition-colors ${
                  isInTrash 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-violet-300 hover:bg-violet-500/20'
                }`}
              >
                <ArrowRight className="w-2.5 h-2.5" />
                <span className="flex-1 text-left">{targetInfo.label}</span>
                <span className="text-[9px] text-gray-500">
                  {formatDate(conversion.convertedAt)}
                </span>
                {isInTrash && <Trash2 className="w-2.5 h-2.5 text-red-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Badge for target object created from conversion
 */
export const ConvertedToBadge = ({ 
  convertedFromId, 
  convertedFromType, 
  convertedAt,
  isSourceInTrash = false,
  onNavigate 
}) => {
  if (!convertedFromId || !convertedFromType) return null;
  
  const sourceInfo = CONVERT_TARGET_LABELS[convertedFromType] || { label: convertedFromType };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <button
      onClick={() => !isSourceInTrash && onNavigate?.(convertedFromId, convertedFromType)}
      disabled={isSourceInTrash}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
        isSourceInTrash
          ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed'
          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30'
      }`}
      title={`Vytvořeno z: ${sourceInfo.label} · ${formatDate(convertedAt)}`}
    >
      <ArrowLeft className="w-2.5 h-2.5" />
      <span>z {sourceInfo.label}</span>
      {isSourceInTrash && <Trash2 className="w-2.5 h-2.5 text-red-400 ml-1" />}
    </button>
  );
};

/**
 * Compact inline indicator (for list views)
 */
export const ConvertedIndicator = ({ hasConversions, wasConverted }) => {
  if (!hasConversions && !wasConverted) return null;
  
  return (
    <div 
      className="w-1.5 h-1.5 rounded-full"
      style={{
        background: hasConversions 
          ? 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
          : 'linear-gradient(135deg, #22d3ee 0%, #67e8f9 100%)',
        boxShadow: hasConversions 
          ? '0 0 4px rgba(139, 92, 246, 0.6)'
          : '0 0 4px rgba(34, 211, 238, 0.6)'
      }}
      title={hasConversions ? 'Objekt byl převeden' : 'Vytvořeno konverzí'}
    />
  );
};

export default {
  ConvertedFromBadge,
  ConvertedToBadge,
  ConvertedIndicator
};
