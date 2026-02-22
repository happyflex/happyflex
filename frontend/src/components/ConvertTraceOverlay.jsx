/**
 * ConvertTraceOverlay
 * 
 * Global overlay for Stark-style convert trace effects.
 * Renders above all module content, uses CSS transforms only.
 * 
 * Effects:
 * 1. Morph Trace: pulse → trace line → materialize
 * 2. Navigation Trace: subtle glow lines between linked items
 */

import React, { useEffect, useState } from 'react';
import { useConvertTrace } from '../context/ConvertTraceContext';

// Animation keyframes as inline styles (avoid global CSS)
const pulseKeyframes = `
  @keyframes stark-pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 20px 4px rgba(34, 211, 238, 0.6); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
  }
  @keyframes stark-materialize {
    0% { transform: scale(0.8); opacity: 0; box-shadow: 0 0 30px 8px rgba(34, 211, 238, 0.8); }
    60% { transform: scale(1.02); opacity: 1; box-shadow: 0 0 15px 4px rgba(34, 211, 238, 0.4); }
    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
  }
  @keyframes stark-trace-draw {
    0% { stroke-dashoffset: 1000; opacity: 0.8; }
    50% { stroke-dashoffset: 0; opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: 0; }
  }
  @keyframes stark-nav-glow {
    0% { opacity: 0; }
    30% { opacity: 0.8; }
    70% { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @keyframes stark-badge-highlight {
    0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
    50% { box-shadow: 0 0 15px 3px rgba(34, 211, 238, 0.8); }
    100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
  }
`;

const ConvertTraceOverlay = () => {
  const { 
    activeEffects, 
    MORPH_PULSE_DURATION, 
    TRACE_LINE_DURATION, 
    MATERIALIZE_DURATION,
    NAV_TRACE_DURATION 
  } = useConvertTrace();
  
  const [effectPhases, setEffectPhases] = useState({});

  // Track effect phases for morph animation sequence
  useEffect(() => {
    activeEffects.forEach(effect => {
      if (effect.type === 'morph' && !effectPhases[effect.id]) {
        // Start pulse phase
        setEffectPhases(prev => ({ ...prev, [effect.id]: 'pulse' }));
        
        // Transition to trace phase
        setTimeout(() => {
          setEffectPhases(prev => ({ ...prev, [effect.id]: 'trace' }));
        }, MORPH_PULSE_DURATION);
        
        // Transition to materialize phase
        setTimeout(() => {
          setEffectPhases(prev => ({ ...prev, [effect.id]: 'materialize' }));
        }, MORPH_PULSE_DURATION + TRACE_LINE_DURATION);
      }
    });
    
    // Cleanup phases for removed effects
    const activeIds = new Set(activeEffects.map(e => e.id));
    setEffectPhases(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (!activeIds.has(id)) delete next[id];
      });
      return next;
    });
  }, [activeEffects, MORPH_PULSE_DURATION, TRACE_LINE_DURATION, effectPhases]);

  if (activeEffects.length === 0) return null;

  return (
    <>
      {/* Inject keyframes */}
      <style>{pulseKeyframes}</style>
      
      {/* Overlay container - fixed position, pointer-events none */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        style={{ isolation: 'isolate' }}
      >
        {activeEffects.map(effect => {
          if (effect.type === 'morph') {
            return (
              <MorphTraceEffect
                key={effect.id}
                effect={effect}
                phase={effectPhases[effect.id] || 'pulse'}
                pulseDuration={MORPH_PULSE_DURATION}
                traceDuration={TRACE_LINE_DURATION}
                materializeDuration={MATERIALIZE_DURATION}
              />
            );
          }
          
          if (effect.type === 'navigation') {
            return (
              <NavigationTraceEffect
                key={effect.id}
                effect={effect}
                duration={NAV_TRACE_DURATION}
              />
            );
          }
          
          return null;
        })}
      </div>
    </>
  );
};

/**
 * Morph Trace Effect Component
 * Three phases: pulse → trace → materialize
 */
const MorphTraceEffect = ({ 
  effect, 
  phase, 
  pulseDuration, 
  traceDuration, 
  materializeDuration 
}) => {
  const { originRect, targetRect, originVisible, targetVisible } = effect;
  
  // Fallback: pulse only if one item not visible
  const showTrace = originVisible && targetVisible && originRect && targetRect;
  
  return (
    <>
      {/* 1. Pulse on origin */}
      {phase === 'pulse' && originRect && originVisible && (
        <div
          className="absolute rounded-lg"
          style={{
            left: originRect.x - originRect.width / 2 - 4,
            top: originRect.y - originRect.height / 2 - 4,
            width: originRect.width + 8,
            height: originRect.height + 8,
            animation: `stark-pulse ${pulseDuration}ms ease-out forwards`,
            border: '2px solid rgba(34, 211, 238, 0.6)',
            background: 'rgba(34, 211, 238, 0.1)'
          }}
        />
      )}
      
      {/* 2. Trace line between origin and target */}
      {phase === 'trace' && showTrace && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`trace-gradient-${effect.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0.8)" />
              <stop offset="50%" stopColor="rgba(34, 211, 238, 1)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0.8)" />
            </linearGradient>
            <filter id={`glow-${effect.id}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <line
            x1={originRect.x}
            y1={originRect.y}
            x2={targetRect.x}
            y2={targetRect.y}
            stroke={`url(#trace-gradient-${effect.id})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1000"
            filter={`url(#glow-${effect.id})`}
            style={{
              animation: `stark-trace-draw ${traceDuration}ms ease-in-out forwards`
            }}
          />
        </svg>
      )}
      
      {/* 3. Materialize effect on target */}
      {phase === 'materialize' && targetRect && targetVisible && (
        <div
          className="absolute rounded-lg"
          style={{
            left: targetRect.x - targetRect.width / 2 - 4,
            top: targetRect.y - targetRect.height / 2 - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            animation: `stark-materialize ${materializeDuration}ms ease-out forwards`,
            border: '2px solid rgba(34, 211, 238, 0.8)',
            background: 'rgba(34, 211, 238, 0.15)'
          }}
        />
      )}
      
      {/* Fallback: badge highlight when items not both visible */}
      {!showTrace && phase !== 'pulse' && (
        <>
          {originRect && originVisible && (
            <div
              className="absolute rounded-lg"
              style={{
                left: originRect.x - originRect.width / 2 - 2,
                top: originRect.y - originRect.height / 2 - 2,
                width: originRect.width + 4,
                height: originRect.height + 4,
                animation: `stark-badge-highlight ${traceDuration}ms ease-out forwards`
              }}
            />
          )}
          {targetRect && targetVisible && (
            <div
              className="absolute rounded-lg"
              style={{
                left: targetRect.x - targetRect.width / 2 - 2,
                top: targetRect.y - targetRect.height / 2 - 2,
                width: targetRect.width + 4,
                height: targetRect.height + 4,
                animation: `stark-materialize ${materializeDuration}ms ease-out forwards`,
                border: '2px solid rgba(34, 211, 238, 0.6)'
              }}
            />
          )}
        </>
      )}
    </>
  );
};

/**
 * Navigation Trace Effect Component
 * Shows subtle glow lines to linked items when opening converted object
 */
const NavigationTraceEffect = ({ effect, duration }) => {
  const { originRect, linkedItems } = effect;
  const [visibleLinks, setVisibleLinks] = useState([]);
  
  // Stagger link appearances for multi-convert
  useEffect(() => {
    linkedItems.forEach((item, index) => {
      setTimeout(() => {
        setVisibleLinks(prev => [...prev, item.id]);
      }, index * 150);
    });
  }, [linkedItems]);
  
  if (!originRect) return null;
  
  return (
    <>
      {linkedItems.map((linked, index) => {
        if (!visibleLinks.includes(linked.id)) return null;
        
        const isVisible = linked.visible && linked.rect;
        const directionColor = linked.direction === 'from' 
          ? 'rgba(168, 85, 247, 0.8)' // Purple for "from" links
          : 'rgba(34, 211, 238, 0.8)'; // Cyan for "to" links
        
        if (isVisible) {
          // Draw trace line
          return (
            <svg
              key={linked.id}
              className="absolute inset-0 w-full h-full"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id={`nav-gradient-${linked.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={directionColor} stopOpacity="0.3" />
                  <stop offset="50%" stopColor={directionColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={directionColor} stopOpacity="0.3" />
                </linearGradient>
                <filter id={`nav-glow-${linked.id}`}>
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <line
                x1={originRect.x}
                y1={originRect.y}
                x2={linked.rect.x}
                y2={linked.rect.y}
                stroke={`url(#nav-gradient-${linked.id})`}
                strokeWidth="2"
                strokeLinecap="round"
                filter={`url(#nav-glow-${linked.id})`}
                style={{
                  animation: `stark-nav-glow ${duration}ms ease-in-out forwards`,
                  animationDelay: `${index * 150}ms`
                }}
              />
            </svg>
          );
        } else {
          // Fallback: highlight badge only
          return (
            <div
              key={linked.id}
              className="absolute rounded-full"
              style={{
                left: originRect.x - 8,
                top: originRect.y - 8,
                width: 16,
                height: 16,
                animation: `stark-badge-highlight ${duration}ms ease-out forwards`,
                animationDelay: `${index * 150}ms`,
                background: directionColor
              }}
            />
          );
        }
      })}
    </>
  );
};

export default ConvertTraceOverlay;
