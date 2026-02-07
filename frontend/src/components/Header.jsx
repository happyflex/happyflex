import React from 'react';
import { Search, Bell, Settings, Layers, Grid3x3 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Header = () => {
  return (
    <header className="h-16 bg-[#0a1628] border-b border-cyan-500/20 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">STEWARD</h1>
          <p className="text-xs text-cyan-400 uppercase tracking-widest">Workspace Cockpit</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Layers className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Grid3x3 className="h-5 w-5" />
        </Button>
        
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Hledat..."
            className="pl-10 bg-[#0f1d35] border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
