'use client';

import React from 'react';
import { useDobotStore, TabType } from '@/lib/store/useDobotStore';
import {
  Sliders,
  GraduationCap,
  Code2,
  FileCode,
  Box,
  PenTool,
  Activity,
  Settings,
} from 'lucide-react';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'operation', label: 'Operation', icon: <Sliders className="w-4 h-4" /> },
  { id: 'teaching', label: 'Teach & Play', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'blockly', label: 'Blockly', icon: <Code2 className="w-4 h-4" /> },
  { id: 'script', label: 'Script', icon: <FileCode className="w-4 h-4" /> },
  { id: 'objects', label: 'Objects', icon: <Box className="w-4 h-4" /> },
  { id: 'draw', label: 'Write & Draw', icon: <PenTool className="w-4 h-4" /> },
  { id: 'diagnostics', label: 'Diagnostics', icon: <Activity className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useDobotStore();

  return (
    <aside className="w-16 h-full bg-[#14171d] border-r border-[#262b36] flex flex-col items-center py-2 shrink-0 select-none z-20">
      <div className="flex flex-col gap-1 w-full px-1.5">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              className={`w-full py-2.5 px-1 rounded-md flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-[#1890ff] text-white shadow-md shadow-[#1890ff]/20'
                  : 'text-[#8c9ba5] hover:text-white hover:bg-[#1f242d]'
              }`}
            >
              <div>{item.icon}</div>
              <span className="truncate w-full text-center tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
