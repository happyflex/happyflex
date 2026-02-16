import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { mockTimerSessions } from '../../data/mockData';
import ModuleHeader from './ModuleHeader';

const TimerModule = () => {
  const { timerActive, timerSeconds, setTimerActive, setTimerSeconds } = useWorkspace();
  const [currentTask, setCurrentTask] = useState('');

  useEffect(() => {
    let interval;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, setTimerSeconds]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleReset = () => {
    setTimerActive(false);
    setTimerSeconds(0);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Časovač</h3>
        
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-white mb-4 font-mono">
            {formatTime(timerSeconds)}
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => setTimerActive(!timerActive)}
              className={`${
                timerActive 
                  ? 'bg-red-500 hover:bg-red-400' 
                  : 'bg-green-500 hover:bg-green-400'
              } text-white`}
            >
              {timerActive ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pauza
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleReset}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {timerActive && (
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 text-center">
            <div className="w-2 h-2 bg-green-400 rounded-full inline-block mr-2 animate-pulse"></div>
            <span className="text-sm text-cyan-400">Probíhá měření...</span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h4 className="text-sm font-medium text-cyan-400 mb-3">Poslední relace</h4>
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {mockTimerSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 bg-[#0a1628] rounded-lg border border-cyan-500/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{session.task}</p>
                    <p className="text-xs text-gray-500">{session.date}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-cyan-400">
                      {formatDuration(session.duration)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TimerModule;
