import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

const CursorHUD = () => {
  const { snapPreview, activeWorkzone, focusedModuleId, isDraggingWindow } = useWorkspace();
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [workzonePulse, setWorkzonePulse] = useState(null);
  const [focusPulse, setFocusPulse] = useState(false);
  const prevWorkzone = useRef(activeWorkzone);
  const prevFocused = useRef(focusedModuleId);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Detect workzone change - trigger pulse
  useEffect(() => {
    if (activeWorkzone && activeWorkzone !== prevWorkzone.current) {
      setWorkzonePulse(activeWorkzone.color);
      const timer = setTimeout(() => setWorkzonePulse(null), 200);
      prevWorkzone.current = activeWorkzone;
      return () => clearTimeout(timer);
    }
    prevWorkzone.current = activeWorkzone;
  }, [activeWorkzone]);

  // Detect focus mode activation - trigger pulse
  useEffect(() => {
    if (focusedModuleId && focusedModuleId !== prevFocused.current) {
      setFocusPulse(true);
      const timer = setTimeout(() => setFocusPulse(false), 200);
      prevFocused.current = focusedModuleId;
      return () => clearTimeout(timer);
    }
    prevFocused.current = focusedModuleId;
  }, [focusedModuleId]);

  // Determine visibility
  const isVisible = isDraggingWindow || snapPreview || workzonePulse || focusPulse;
  
  // Determine which snap segment is active
  const getActiveSegment = () => {
    if (!snapPreview) return null;
    if (snapPreview === 'left-half' || snapPreview === 'top-left' || snapPreview === 'bottom-left') return 'left';
    if (snapPreview === 'right-half' || snapPreview === 'top-right' || snapPreview === 'bottom-right') return 'right';
    if (snapPreview === 'maximized' || snapPreview === 'top-half') return 'top';
    if (snapPreview === 'bottom-half') return 'bottom';
    return null;
  };

  const activeSegment = getActiveSegment();

  // Get color based on state
  const getColor = () => {
    if (workzonePulse) {
      switch (workzonePulse) {
        case 'orange': return '#f97316';
        case 'yellow': return '#eab308';
        case 'green': return '#22c55e';
        default: return '#06b6d4';
      }
    }
    if (focusPulse) return '#a855f7';
    return '#06b6d4'; // cyan
  };

  const color = getColor();
  
  // Ring dimensions
  const size = 36;
  const strokeWidth = 1.5;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Calculate segment paths (arcs)
  const getArcPath = (startAngle, endAngle) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  };

  // Segment definitions (degrees)
  const segments = {
    top: { start: 315, end: 45 },      // Top arc
    right: { start: 45, end: 135 },     // Right arc  
    bottom: { start: 135, end: 225 },   // Bottom arc
    left: { start: 225, end: 315 }      // Left arc
  };

  return (
    <div
      className="fixed pointer-events-none z-[99999] transition-opacity duration-150"
      style={{
        left: mousePos.x - size / 2,
        top: mousePos.y - size / 2,
        opacity: isVisible ? 1 : 0,
        transform: `scale(${isVisible ? 1 : 0.8})`,
        transition: 'opacity 150ms ease-out, transform 150ms ease-out'
      }}
    >
      <svg width={size} height={size} className="overflow-visible">
        {/* Glow filter */}
        <defs>
          <filter id="cursor-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cursor-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Inner ring (very subtle) */}
        <circle
          cx={center}
          cy={center}
          r={radius - 4}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={workzonePulse || focusPulse ? 0.4 : 0.15}
          style={{ transition: 'opacity 150ms ease-out' }}
        />

        {/* Main segmented ring */}
        {Object.entries(segments).map(([key, { start, end }]) => {
          const isActive = activeSegment === key;
          const baseOpacity = isDragging ? 0.3 : 0.15;
          const activeOpacity = 0.9;
          
          return (
            <path
              key={key}
              d={getArcPath(start, end)}
              fill="none"
              stroke={color}
              strokeWidth={isActive ? 2 : strokeWidth}
              strokeLinecap="round"
              opacity={isActive ? activeOpacity : baseOpacity}
              filter={isActive ? 'url(#cursor-glow-strong)' : 'url(#cursor-glow)'}
              style={{ 
                transition: 'opacity 150ms ease-out, stroke-width 150ms ease-out'
              }}
            />
          );
        })}

        {/* Pulse ring for workzone/focus changes */}
        {(workzonePulse || focusPulse) && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.6}
            filter="url(#cursor-glow-strong)"
            style={{
              animation: 'cursor-pulse 200ms ease-out forwards'
            }}
          />
        )}
      </svg>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes cursor-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CursorHUD;
