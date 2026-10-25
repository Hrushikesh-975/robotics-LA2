'use client';

import React, { useState } from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  Play,
  Pause,
  Square,
  Activity,
  ChevronUp,
  ChevronDown,
  Terminal,
  LineChart,
} from 'lucide-react';

export const BottomDiagnostics: React.FC = () => {
  const {
    telemetry,
    cartesian,
    joints,
    endEffectorType,
    endEffectorActive,
    pauseExecution,
    resumeExecution,
    stopExecution,
  } = useDobotStore();

  const [expanded, setExpanded] = useState(false);

  return (
    <footer
      className={`border-t border-[#262b36] bg-[#14171d] text-xs transition-all duration-200 select-none flex flex-col shrink-0 ${
        expanded ? 'h-48' : 'h-10'
      }`}
    >
      {/* Mini status bar header */}
      <div className="h-10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.state === 'running'
                  ? 'bg-green-400 animate-pulse'
                  : telemetry.state === 'paused'
                  ? 'bg-amber-400'
                  : telemetry.state === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-400'
              }`}
            />
            <span className="font-mono text-[11px] text-white font-semibold uppercase">
              {telemetry.state}
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#262b36]" />

          {/* Current instruction readout */}
          <div className="flex items-center gap-1.5 text-[#b0bec5]">
            <Terminal className="w-3.5 h-3.5 text-[#1890ff]" />
            <span className="font-mono text-[11px] max-w-sm truncate text-[#e0e6ed]">
              {telemetry.currentInstruction}
            </span>
          </div>

          {/* Progress bar */}
          {telemetry.totalCommands > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-[#1f242d] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1890ff] transition-all duration-150"
                  style={{ width: `${telemetry.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#8c9ba5]">
                {telemetry.progressPercent}% ({telemetry.activeCommandIndex + 1}/
                {telemetry.totalCommands})
              </span>
            </div>
          )}
        </div>

        {/* Live Coordinate Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#8c9ba5]">
            <span className="text-red-400">X:{cartesian.x.toFixed(1)}</span>
            <span className="text-green-400">Y:{cartesian.y.toFixed(1)}</span>
            <span className="text-blue-400">Z:{cartesian.z.toFixed(1)}</span>
            <span className="text-amber-400">R:{cartesian.r.toFixed(1)}°</span>
          </div>

          <div className="h-3.5 w-px bg-[#262b36]" />

          {/* Quick playback controls if running/paused */}
          {telemetry.state === 'running' && (
            <button
              onClick={pauseExecution}
              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[10px] flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              <span>PAUSE</span>
            </button>
          )}
          {telemetry.state === 'paused' && (
            <button
              onClick={resumeExecution}
              className="px-2 py-0.5 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-semibold text-[10px] flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>RESUME</span>
            </button>
          )}
          {(telemetry.state === 'running' || telemetry.state === 'paused') && (
            <button
              onClick={stopExecution}
              className="px-2 py-0.5 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] font-semibold text-[10px] flex items-center gap-1 border border-[#262b36]"
            >
              <Square className="w-3 h-3" />
              <span>STOP</span>
            </button>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-[#8c9ba5] hover:text-white"
            title="Expand Diagnostics Drawer"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detailed diagnostics content */}
      {expanded && (
        <div className="flex-1 px-4 py-2 bg-[#101216] border-t border-[#262b36] overflow-y-auto grid grid-cols-3 gap-4 text-xs font-mono">
          {/* Joint State Details */}
          <div className="p-2.5 rounded bg-[#171a21] border border-[#262b36]">
            <div className="text-[11px] text-[#1890ff] font-bold mb-1.5 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>JOINT TELEMETRY</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[#b0bec5]">
              <div>J1 (Base): <span className="text-white">{joints.j1.toFixed(2)}°</span></div>
              <div>J2 (Rear): <span className="text-white">{joints.j2.toFixed(2)}°</span></div>
              <div>J3 (Fore): <span className="text-white">{joints.j3.toFixed(2)}°</span></div>
              <div>J4 (Tool): <span className="text-white">{joints.j4.toFixed(2)}°</span></div>
            </div>
          </div>

          {/* End-Effector & Tooling */}
          <div className="p-2.5 rounded bg-[#171a21] border border-[#262b36]">
            <div className="text-[11px] text-green-400 font-bold mb-1.5 flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>END-EFFECTOR STATE</span>
            </div>
            <div className="text-[#b0bec5] space-y-1">
              <div>Type: <span className="text-white uppercase">{endEffectorType}</span></div>
              <div>
                Output:{' '}
                <span className={endEffectorActive ? 'text-green-400 font-bold' : 'text-[#8c9ba5]'}>
                  {endEffectorActive ? 'ENGAGED (ACTIVE)' : 'DISENGAGED (IDLE)'}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Time & Errors */}
          <div className="p-2.5 rounded bg-[#171a21] border border-[#262b36]">
            <div className="text-[11px] text-amber-400 font-bold mb-1.5 flex items-center gap-1">
              <LineChart className="w-3.5 h-3.5" />
              <span>EXECUTION STATS</span>
            </div>
            <div className="text-[#b0bec5] space-y-1">
              <div>Elapsed Time: <span className="text-white">{telemetry.elapsedTimeMs} ms</span></div>
              <div>
                Cycle: <span className="text-white">#{telemetry.currentCycle} / {telemetry.totalCycles === Infinity ? '∞' : telemetry.totalCycles}</span>
              </div>
              <div>
                Workpiece Attachment:{' '}
                <span className={telemetry.isHoldingObject ? 'text-green-400 font-bold' : 'text-[#8c9ba5]'}>
                  {telemetry.isHoldingObject ? 'ATTACHED TO CUP' : 'NONE'}
                </span>
              </div>
              {telemetry.errorMessage ? (
                <div className="text-red-400">Error: {telemetry.errorMessage}</div>
              ) : (
                <div className="text-green-400">Status: Nominal (No faults)</div>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
