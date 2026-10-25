'use client';

import React, { useState } from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Settings2,
  Code,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { BlocklyProgramBlock, BlockType } from '@/lib/blockly/compiler';

const AVAILABLE_BLOCKS: { type: BlockType; label: string; color: string; desc: string }[] = [
  { type: 'movj', label: 'Move Joint (MOVJ)', color: 'border-blue-500 bg-blue-500/10', desc: 'Point-to-point motion' },
  { type: 'movl', label: 'Move Linear (MOVL)', color: 'border-cyan-500 bg-cyan-500/10', desc: 'Cartesian straight line' },
  { type: 'jump', label: 'Jump Movement', color: 'border-purple-500 bg-purple-500/10', desc: 'Lift-transfer-descend' },
  { type: 'set_speed', label: 'Set Speed', color: 'border-amber-500 bg-amber-500/10', desc: 'Adjust motion velocity' },
  { type: 'suction_on', label: 'Suction ON', color: 'border-green-500 bg-green-500/10', desc: 'Activate vacuum grasp' },
  { type: 'suction_off', label: 'Suction OFF', color: 'border-rose-500 bg-rose-500/10', desc: 'Release vacuum grasp' },
  { type: 'gripper_open', label: 'Gripper OPEN', color: 'border-emerald-500 bg-emerald-500/10', desc: 'Open gripper fingers' },
  { type: 'gripper_close', label: 'Gripper CLOSE', color: 'border-teal-500 bg-teal-500/10', desc: 'Close gripper fingers' },
  { type: 'wait', label: 'Wait Delay', color: 'border-orange-500 bg-orange-500/10', desc: 'Pause program execution' },
];

export const BlocklyPanel: React.FC = () => {
  const {
    blocklyBlocks,
    setBlocklyBlocks,
    addBlocklyBlock,
    removeBlocklyBlock,
    updateBlocklyBlock,
    runBlocklyProgram,
    pauseExecution,
    stopExecution,
    telemetry,
    cartesian,
  } = useDobotStore();

  const handleAddBlock = (type: BlockType) => {
    const id = `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let params: BlocklyProgramBlock['params'] = {};

    if (type === 'movj' || type === 'movl' || type === 'jump') {
      params = {
        x: Math.round(cartesian.x),
        y: Math.round(cartesian.y),
        z: Math.round(cartesian.z),
        r: 0,
        jumpHeight: 25,
      };
    } else if (type === 'set_speed') {
      params = { speed: 60 };
    } else if (type === 'wait') {
      params = { durationMs: 500 };
    }

    addBlocklyBlock({ id, type, params });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocklyBlocks.length) return;
    const newBlocks = [...blocklyBlocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIdx, 0, moved);
    setBlocklyBlocks(newBlocks);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      {/* ---------------- EXECUTION CONTROLS ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#1890ff]" />
          <span className="font-semibold text-white uppercase tracking-wider">
            Blockly Workspace ({blocklyBlocks.length} Blocks)
          </span>
        </div>

        <div className="flex items-center gap-2">
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
              onClick={runBlocklyProgram}
              disabled={blocklyBlocks.length === 0}
              className="py-1.5 px-3 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN PROGRAM</span>
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

      {/* ---------------- BLOCK PALETTE ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md">
        <div className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider mb-2">
          Add Instruction Blocks
        </div>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_BLOCKS.map((blk) => (
            <button
              key={blk.type}
              onClick={() => handleAddBlock(blk.type)}
              className="py-2 px-2.5 rounded-lg bg-[#1f242d] hover:bg-[#262b36] border border-[#262b36] hover:border-[#1890ff]/50 text-left transition-all group"
            >
              <div className="font-semibold text-white text-[11px] group-hover:text-[#1890ff] truncate">
                + {blk.label}
              </div>
              <div className="text-[10px] text-[#8c9ba5] line-clamp-1">{blk.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- PROGRAM SEQUENCE LIST ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex-1 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#262b36]">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            Program Routine
          </span>
          <span className="text-[10px] text-[#8c9ba5]">Drag or click arrows to reorder</span>
        </div>

        {blocklyBlocks.length === 0 ? (
          <div className="p-8 text-center text-[#8c9ba5] border border-dashed border-[#262b36] rounded-lg">
            No blocks in program. Click blocks in the palette above to build your automation workflow.
          </div>
        ) : (
          <div className="space-y-2">
            {blocklyBlocks.map((block, idx) => {
              const isHighlight =
                telemetry.state === 'running' && telemetry.activeCommandId?.includes(block.id);

              return (
                <div
                  key={block.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isHighlight
                      ? 'bg-[#1890ff]/20 border-[#1890ff] shadow-lg ring-1 ring-[#1890ff]'
                      : 'bg-[#1f242d] border-[#262b36]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#8c9ba5] bg-[#14171d] px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white uppercase text-xs">
                        {block.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveBlock(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#8c9ba5] hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveBlock(idx, 'down')}
                        disabled={idx === blocklyBlocks.length - 1}
                        className="p-1 rounded text-[#8c9ba5] hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeBlocklyBlock(block.id)}
                        className="p-1 rounded text-[#8c9ba5] hover:text-[#ff4d4f]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Block parameter inputs */}
                  {(block.type === 'movj' || block.type === 'movl' || block.type === 'jump') && (
                    <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-red-400 font-bold mr-1">X:</span>
                        <input
                          type="number"
                          value={block.params.x ?? 0}
                          onChange={(e) =>
                            updateBlocklyBlock(block.id, {
                              params: { ...block.params, x: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-14 bg-[#14171d] border border-[#262b36] rounded px-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-green-400 font-bold mr-1">Y:</span>
                        <input
                          type="number"
                          value={block.params.y ?? 0}
                          onChange={(e) =>
                            updateBlocklyBlock(block.id, {
                              params: { ...block.params, y: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-14 bg-[#14171d] border border-[#262b36] rounded px-1 text-white"
                        />
                      </div>
                      <div>
                        <span className="text-blue-400 font-bold mr-1">Z:</span>
                        <input
                          type="number"
                          value={block.params.z ?? 0}
                          onChange={(e) =>
                            updateBlocklyBlock(block.id, {
                              params: { ...block.params, z: parseFloat(e.target.value) || 0 },
                            })
                          }
                          className="w-14 bg-[#14171d] border border-[#262b36] rounded px-1 text-white"
                        />
                      </div>
                      {block.type === 'jump' && (
                        <div>
                          <span className="text-purple-400 font-bold mr-1">H:</span>
                          <input
                            type="number"
                            value={block.params.jumpHeight ?? 25}
                            onChange={(e) =>
                              updateBlocklyBlock(block.id, {
                                params: { ...block.params, jumpHeight: parseFloat(e.target.value) || 25 },
                              })
                            }
                            className="w-14 bg-[#14171d] border border-[#262b36] rounded px-1 text-white"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === 'set_speed' && (
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#8c9ba5]">Speed (%):</span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={block.params.speed ?? 50}
                        onChange={(e) =>
                          updateBlocklyBlock(block.id, {
                            params: { ...block.params, speed: parseInt(e.target.value, 10) || 50 },
                          })
                        }
                        className="w-16 bg-[#14171d] border border-[#262b36] rounded px-1.5 py-0.5 text-white"
                      />
                    </div>
                  )}

                  {block.type === 'wait' && (
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#8c9ba5]">Duration (ms):</span>
                      <input
                        type="number"
                        step="100"
                        value={block.params.durationMs ?? 500}
                        onChange={(e) =>
                          updateBlocklyBlock(block.id, {
                            params: { ...block.params, durationMs: parseInt(e.target.value, 10) || 500 },
                          })
                        }
                        className="w-20 bg-[#14171d] border border-[#262b36] rounded px-1.5 py-0.5 text-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
