'use client';

import React from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  Settings,
  Sliders,
  Palette,
  ShieldAlert,
  RotateCcw,
  Info,
} from 'lucide-react';
import { ROBOT_DIMENSIONS, ROBOT_LIMITS } from '@/lib/kinematics';

export const SettingsPanel: React.FC = () => {
  const {
    showReachDome,
    setShowReachDome,
    showTrajectory,
    setShowTrajectory,
    clearTrajectory,
    resetObjects,
  } = useDobotStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#1890ff]" />
          <span className="font-semibold text-white uppercase tracking-wider">
            Simulator Preferences & Geometry
          </span>
        </div>
      </div>

      {/* Visual Overlays */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-3">
        <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
          3D Viewport Overlays
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
          <div>
            <div className="text-white font-medium">Reachability Envelope Dome</div>
            <div className="text-[#8c9ba5] text-[10px]">Show translucent mechanical boundary shell</div>
          </div>
          <input
            type="checkbox"
            checked={showReachDome}
            onChange={(e) => setShowReachDome(e.target.checked)}
            className="w-4 h-4 accent-[#1890ff] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
          <div>
            <div className="text-white font-medium">End-Effector Trajectory Path</div>
            <div className="text-[#8c9ba5] text-[10px]">Render 3D continuous motion history trail</div>
          </div>
          <input
            type="checkbox"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
            className="w-4 h-4 accent-[#1890ff] cursor-pointer"
          />
        </div>
      </div>

      {/* Robot Physical Geometry Specifications (Read-Only) */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
        <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
          Dobot Magician Mechanical Specifications
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5] block text-[10px]">Base Height (L0):</span>
            <span className="text-white font-bold">{ROBOT_DIMENSIONS.baseHeight} mm</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5] block text-[10px]">Rear Arm (L1):</span>
            <span className="text-white font-bold">{ROBOT_DIMENSIONS.rearArmLength} mm</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5] block text-[10px]">Forearm (L2):</span>
            <span className="text-white font-bold">{ROBOT_DIMENSIONS.forearmLength} mm</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5] block text-[10px]">Default Wrist Offset:</span>
            <span className="text-white font-bold">R:{ROBOT_DIMENSIONS.toolOffsetR}mm, Z:{ROBOT_DIMENSIONS.toolOffsetZ}mm</span>
          </div>
        </div>
      </div>

      {/* Joint Physical Limits */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
        <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
          Mechanical Joint Travel Range
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-purple-400 font-bold">J1 Base: </span>
            <span className="text-white">[{ROBOT_LIMITS.j1[0]}°, +{ROBOT_LIMITS.j1[1]}°]</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-purple-400 font-bold">J2 Rear: </span>
            <span className="text-white">[{ROBOT_LIMITS.j2[0]}°, +{ROBOT_LIMITS.j2[1]}°]</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-purple-400 font-bold">J3 Forearm: </span>
            <span className="text-white">[{ROBOT_LIMITS.j3[0]}°, +{ROBOT_LIMITS.j3[1]}°]</span>
          </div>
          <div className="p-2 rounded bg-[#101216]">
            <span className="text-purple-400 font-bold">J4 Tool R: </span>
            <span className="text-white">[{ROBOT_LIMITS.j4[0]}°, +{ROBOT_LIMITS.j4[1]}°]</span>
          </div>
        </div>
      </div>

      {/* Factory Reset */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
        <div className="text-[11px] font-semibold text-[#ff4d4f] uppercase border-b border-[#262b36] pb-1">
          Factory Reset Scene
        </div>
        <button
          onClick={() => {
            resetObjects();
            clearTrajectory();
          }}
          className="w-full py-2 px-3 rounded bg-[#ff4d4f]/20 hover:bg-[#ff4d4f] text-[#ff4d4f] hover:text-white border border-[#ff4d4f]/40 font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Objects to Default Positions</span>
        </button>
      </div>
    </div>
  );
};
