'use client';

import React from 'react';
import { useDobotStore, TabType } from '@/lib/store/useDobotStore';
import {
  Sliders,
  Box,
  GraduationCap,
  Code2,
  FileCode,
  PenTool,
  Activity,
  Settings,
  Home,
  OctagonAlert,
  Gauge,
} from 'lucide-react';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { id: 'operation', label: 'Operation', icon: <Sliders className="w-4 h-4" /> },
  { id: 'teaching', label: 'Teaching', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'blockly', label: 'Blockly', icon: <Code2 className="w-4 h-4" /> },
  { id: 'script', label: 'Script', icon: <FileCode className="w-4 h-4" /> },
  { id: 'objects', label: 'Objects', icon: <Box className="w-4 h-4" /> },
  { id: 'draw', label: 'Draw', icon: <PenTool className="w-4 h-4" /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <Activity className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    homeRobot,
    isEmergencyStopped,
    setEmergencyStopped,
    speed,
    setSpeed,
  } = useDobotStore();

  return (
    <header className="h-12 bg-[#171a21] border-b border-[#262b36] px-3 flex items-center justify-between select-none shrink-0 z-30">
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#1890ff] text-white shadow-sm'
                  : 'text-[#8c9ba5] hover:text-white hover:bg-[#1f242d]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1f242d] border border-[#262b36]">
          <Gauge className="w-3.5 h-3.5 text-[#8c9ba5]" />
          <span className="text-[11px] text-[#b0bec5] font-mono">{speed}%</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-14 h-1 bg-[#262b36] rounded appearance-none cursor-pointer accent-[#1890ff]"
          />
        </div>

        <button
          onClick={homeRobot}
          disabled={isEmergencyStopped}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] border border-[#262b36] text-white text-xs font-medium disabled:opacity-40"
        >
          <Home className="w-3.5 h-3.5 text-[#1890ff]" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setEmergencyStopped(!isEmergencyStopped)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
            isEmergencyStopped
              ? 'bg-white text-[#ff4d4f] border border-[#ff4d4f] animate-pulse'
              : 'bg-[#ff4d4f] hover:bg-[#d9363e] text-white'
          }`}
        >
          <OctagonAlert className="w-3.5 h-3.5" />
          <span>{isEmergencyStopped ? 'RESET' : 'E-STOP'}</span>
        </button>
      </div>
    </header>
  );
};
