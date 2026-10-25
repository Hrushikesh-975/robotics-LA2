'use client';

import React, { useState } from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  Play,
  Pause,
  Square,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { parseDobotScript } from '@/lib/script/parser';

export const ScriptPanel: React.FC = () => {
  const {
    scriptCode,
    setScriptCode,
    runScriptProgram,
    pauseExecution,
    stopExecution,
    telemetry,
    cartesian,
  } = useDobotStore();

  const [parseInfo, setParseInfo] = useState<{
    valid: boolean;
    commandCount: number;
    errors: { line: number; message: string }[];
  } | null>(null);

  const handleValidate = () => {
    const res = parseDobotScript(scriptCode, cartesian);
    setParseInfo({
      valid: res.success,
      commandCount: res.commands.length,
      errors: res.errors,
    });
  };

  const handleInsertTemplate = () => {
    const template = `// Pick-and-Place Script Routine
SPEED 60
MOVJ X 250 Y 0 Z 100 R 0
JUMP X 240 Y 100 Z 35 R 0 H 30
SUCTION ON
WAIT 350
JUMP X 240 Y -100 Z 53 R 0 H 35
SUCTION OFF
WAIT 300
MOVJ X 250 Y 0 Z 100 R 0
`;
    setScriptCode(template);
    setParseInfo(null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      {/* ---------------- SCRIPT ACTIONS HEADER ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#1890ff]" />
          <span className="font-semibold text-white uppercase tracking-wider">
            Dobot Script Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleValidate}
            className="py-1.5 px-2.5 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white font-medium border border-[#262b36]"
          >
            Check Syntax
          </button>

          {telemetry.state === 'running' ? (
            <button
              onClick={pauseExecution}
              className="py-1.5 px-3 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={runScriptProgram}
              disabled={!scriptCode.trim()}
              className="py-1.5 px-3 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN SCRIPT</span>
            </button>
          )}

          <button
            onClick={stopExecution}
            disabled={telemetry.state === 'idle'}
            className="py-1.5 px-2.5 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white font-medium flex items-center gap-1 border border-[#262b36] disabled:opacity-40"
          >
            <Square className="w-3.5 h-3.5" />
            <span>STOP</span>
          </button>
        </div>
      </div>

      {/* ---------------- SYNTAX FEEDBACK BADGE ---------------- */}
      {parseInfo && (
        <div
          className={`p-2.5 rounded-lg border flex items-center justify-between ${
            parseInfo.valid
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {parseInfo.valid ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>
              {parseInfo.valid
                ? `Valid: ${parseInfo.commandCount} executable instructions compiled.`
                : `Syntax Error line ${parseInfo.errors[0]?.line}: ${parseInfo.errors[0]?.message}`}
            </span>
          </div>
        </div>
      )}

      {/* ---------------- SCRIPT CODE EDITOR ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex-1 flex flex-col space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#262b36]">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            Source Code (Dobot DSL)
          </span>
          <button
            onClick={handleInsertTemplate}
            className="text-[11px] text-[#1890ff] hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Load Pick & Place Demo</span>
          </button>
        </div>

        <textarea
          value={scriptCode}
          onChange={(e) => {
            setScriptCode(e.target.value);
            setParseInfo(null);
          }}
          spellCheck={false}
          className="w-full flex-1 bg-[#101216] border border-[#262b36] rounded-md p-3 font-mono text-xs text-white leading-relaxed resize-none focus:outline-none focus:border-[#1890ff]"
          rows={14}
        />
      </div>

      {/* ---------------- COMMAND QUICK REFERENCE ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21]/80 border border-[#262b36] text-[11px] text-[#8c9ba5] space-y-1">
        <div className="font-semibold text-white flex items-center gap-1 mb-1">
          <BookOpen className="w-3.5 h-3.5 text-[#1890ff]" />
          <span>Script Grammar Quick Reference</span>
        </div>
        <div className="font-mono text-[10px] space-y-0.5 text-[#b0bec5]">
          <div>• <code>SPEED &lt;1-100&gt;</code> — Set motion speed percentage</div>
          <div>• <code>MOVJ X &lt;val&gt; Y &lt;val&gt; Z &lt;val&gt; [R &lt;val&gt;]</code> — Joint interpolation to target</div>
          <div>• <code>MOVL X &lt;val&gt; Y &lt;val&gt; Z &lt;val&gt; [R &lt;val&gt;]</code> — Linear Cartesian interpolation</div>
          <div>• <code>JUMP X &lt;val&gt; Y &lt;val&gt; Z &lt;val&gt; [H &lt;val&gt;]</code> — Lift, transfer, descend motion</div>
          <div>• <code>SUCTION ON | OFF</code> — Activate/release vacuum tool</div>
          <div>• <code>WAIT &lt;ms&gt;</code> — Pause sequence</div>
        </div>
      </div>
    </div>
  );
};
