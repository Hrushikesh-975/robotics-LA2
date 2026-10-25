'use client';

import React from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Upload,
  RotateCcw,
  OctagonAlert,
  Gauge,
  Home,
  Check,
  Power,
  RotateCw,
} from 'lucide-react';

export const TopAppBar: React.FC = () => {
  const {
    homeRobot,
    isEmergencyStopped,
    setEmergencyStopped,
    speed,
    setSpeed,
    saveToLocalStorage,
    loadFromLocalStorage,
    exportToJson,
    importFromJson,
    resetObjects,
    statusNotification,
  } = useDobotStore();

  const handleExport = () => {
    const jsonStr = exportToJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dobot-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importFromJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-12 bg-[#171a21] border-b border-[#262b36] px-3 flex items-center justify-between select-none shrink-0 z-30 text-xs">
      {/* Left: Branding & Connection */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#1890ff] flex items-center justify-center font-bold text-white shadow-sm shadow-[#1890ff]/30 text-xs">
            D
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-wide">
              DOBOT <span className="text-[#1890ff]">Studio</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f242d] text-[#8c9ba5] border border-[#262b36]">
              Magician Sim v2.0
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#262b36] mx-1" />

        {/* Project Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => saveToLocalStorage()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white transition-colors"
            title="Save Project to Browser"
          >
            <Save className="w-3.5 h-3.5 text-[#1890ff]" />
            <span>Save</span>
          </button>
          <button
            onClick={() => loadFromLocalStorage()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white transition-colors"
            title="Load Project from Browser"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#1890ff]" />
            <span>Open</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white transition-colors"
            title="Export Project JSON"
          >
            <Download className="w-3.5 h-3.5 text-green-400" />
            <span>Export</span>
          </button>
          <label className="flex items-center gap-1 px-2 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
          <button
            onClick={() => resetObjects()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white transition-colors"
            title="Reset Workpieces & Scene"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Scene</span>
          </button>
        </div>
      </div>

      {/* Center: Live Status Notification */}
      <div className="flex items-center gap-2">
        {statusNotification && (
          <span className="text-[11px] text-[#00ffcc] font-mono flex items-center gap-1 bg-[#1f242d] px-2.5 py-0.5 rounded border border-[#00ffcc]/30">
            <Check className="w-3 h-3" />
            <span>{statusNotification}</span>
          </span>
        )}
      </div>

      {/* Right: Robot Hardware Controls & E-STOP */}
      <div className="flex items-center gap-3">
        {/* Speed Slider */}
        <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[#1f242d] border border-[#262b36]">
          <Gauge className="w-3.5 h-3.5 text-[#8c9ba5]" />
          <span className="text-[11px] text-[#b0bec5] font-mono w-7">{speed}%</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-16 h-1 bg-[#262b36] rounded appearance-none cursor-pointer accent-[#1890ff]"
            title="Master Velocity Override"
          />
        </div>

        {/* Home */}
        <button
          onClick={homeRobot}
          disabled={isEmergencyStopped}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1f242d] hover:bg-[#262b36] border border-[#262b36] text-white font-medium transition-colors disabled:opacity-40"
          title="Home Robot"
        >
          <Home className="w-3.5 h-3.5 text-[#1890ff]" />
          <span>Home</span>
        </button>

        {/* E-Stop */}
        <button
          onClick={() => setEmergencyStopped(!isEmergencyStopped)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all shadow-md ${
            isEmergencyStopped
              ? 'bg-white text-[#ff4d4f] border border-[#ff4d4f] animate-pulse'
              : 'bg-[#ff4d4f] hover:bg-[#d9363e] text-white shadow-[#ff4d4f]/30'
          }`}
          title="Emergency Stop: Halts all simulation execution immediately"
        >
          <OctagonAlert className="w-3.5 h-3.5" />
          <span>{isEmergencyStopped ? 'RESET E-STOP' : 'E-STOP'}</span>
        </button>
      </div>
    </header>
  );
};
