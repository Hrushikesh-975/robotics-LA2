'use client';

import React from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  Activity,
  Gauge,
  Compass,
  Cpu,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const DiagnosticsPanel: React.FC = () => {
  const {
    cartesian,
    joints,
    telemetry,
    clearTrajectory,
    trajectoryPoints,
    speed,
    endEffectorType,
    endEffectorActive,
    isEmergencyStopped,
  } = useDobotStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#1890ff]" />
          <span className="font-semibold text-white uppercase tracking-wider">
            Real-Time Diagnostics & Telemetry
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">
          100% Simulator Derived
        </span>
      </div>

      {/* Numerical Robot Telemetry Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cartesian Coordinates */}
        <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
          <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
            Cartesian Pose (World Frame)
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-red-400">X: </span>
              <span className="text-white font-bold">{cartesian.x.toFixed(2)} mm</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-green-400">Y: </span>
              <span className="text-white font-bold">{cartesian.y.toFixed(2)} mm</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-blue-400">Z: </span>
              <span className="text-white font-bold">{cartesian.z.toFixed(2)} mm</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-amber-400">R: </span>
              <span className="text-white font-bold">{cartesian.r.toFixed(2)}°</span>
            </div>
          </div>
        </div>

        {/* Joint Angles */}
        <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
          <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
            Joint Configuration (4-DOF)
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-purple-400">J1: </span>
              <span className="text-white font-bold">{joints.j1.toFixed(2)}°</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-purple-400">J2: </span>
              <span className="text-white font-bold">{joints.j2.toFixed(2)}°</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-purple-400">J3: </span>
              <span className="text-white font-bold">{joints.j3.toFixed(2)}°</span>
            </div>
            <div className="p-1.5 rounded bg-[#101216]">
              <span className="text-purple-400">J4: </span>
              <span className="text-white font-bold">{joints.j4.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Buffer Inspection */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
        <div className="flex items-center justify-between border-b border-[#262b36] pb-1.5">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            Trajectory History Buffer ({trajectoryPoints.length} points)
          </span>
          <button
            onClick={() => clearTrajectory()}
            className="flex items-center gap-1 text-[11px] text-[#ff4d4f] hover:underline"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Buffer</span>
          </button>
        </div>

        <div className="max-h-36 overflow-y-auto font-mono text-[10px] space-y-1 bg-[#101216] p-2 rounded border border-[#262b36]">
          {trajectoryPoints.slice(-10).reverse().map((pt, idx) => (
            <div key={idx} className="flex justify-between text-[#8c9ba5]">
              <span>Sample #{trajectoryPoints.length - idx}</span>
              <span className="text-white">
                [{pt[0].toFixed(1)}, {pt[1].toFixed(1)}, {pt[2].toFixed(1)}] mm
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* System Status Flags */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] space-y-2">
        <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase border-b border-[#262b36] pb-1">
          Simulator Controller State
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5]">Emergency Stop:</span>
            <span className={isEmergencyStopped ? 'text-red-400 font-bold' : 'text-green-400'}>
              {isEmergencyStopped ? 'ENGAGED' : 'CLEAR'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5]">Tool Actuator:</span>
            <span className={endEffectorActive ? 'text-green-400 font-bold' : 'text-[#8c9ba5]'}>
              {endEffectorType.toUpperCase()} ({endEffectorActive ? 'ON' : 'OFF'})
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5]">Simulation Clock:</span>
            <span className="text-white font-mono">{telemetry.elapsedTimeMs} ms</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#101216]">
            <span className="text-[#8c9ba5]">Motion Execution:</span>
            <span className="text-[#1890ff] font-bold uppercase">{telemetry.state}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
