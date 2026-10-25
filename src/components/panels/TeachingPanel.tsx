'use client';

import React, { useState } from 'react';
import { useDobotStore, TeachingPoint } from '@/lib/store/useDobotStore';
import { OBJECT_REGISTRY } from '@/lib/objects/types';
import { MotionType } from '@/lib/simulation/types';
import {
  Play,
  Pause,
  Square,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';

export const TeachingPanel: React.FC = () => {
  const {
    cartesian,
    teachingPoints,
    addTeachingPoint,
    updateTeachingPoint,
    deleteTeachingPoint,
    reorderTeachingPoints,
    telemetry,
    runTeachingProgram,
    pauseExecution,
    resumeExecution,
    stopExecution,
    objects,
    selectedObjectId,
    cycleMode,
    setCycleMode,
    repeatCount,
    setRepeatCount,
    autoResetObjectsOnCycle,
    setAutoResetObjectsOnCycle,
    resetObjects,
  } = useDobotStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formX, setFormX] = useState('250');
  const [formY, setFormY] = useState('0');
  const [formZ, setFormZ] = useState('100');
  const [formR, setFormR] = useState('0');
  const [formMotionType, setFormMotionType] = useState<MotionType>('MOVJ');
  const [formSpeed, setFormSpeed] = useState('50');
  const [formPauseMs, setFormPauseMs] = useState('200');
  const [formToolAction, setFormToolAction] = useState<'none' | 'on' | 'off' | 'open' | 'close'>('none');

  const handleRecordCurrent = () => {
    addTeachingPoint({
      name: `Point ${teachingPoints.length + 1}`,
      x: Number(cartesian.x.toFixed(1)),
      y: Number(cartesian.y.toFixed(1)),
      z: Number(cartesian.z.toFixed(1)),
      r: Number(cartesian.r.toFixed(1)),
      motionType: 'MOVJ',
      speed: 60,
      pauseMs: 200,
      toolAction: 'none',
    });
  };

  const handleOpenAddDialog = () => {
    setEditingPointId(null);
    setFormName(`Target Pt ${teachingPoints.length + 1}`);
    setFormX(cartesian.x.toFixed(1));
    setFormY(cartesian.y.toFixed(1));
    setFormZ(cartesian.z.toFixed(1));
    setFormR(cartesian.r.toFixed(1));
    setFormMotionType('MOVJ');
    setFormSpeed('50');
    setFormPauseMs('200');
    setFormToolAction('none');
    setIsDialogOpen(true);
  };

  const handleCopyFromSelectedObject = () => {
    if (!selectedObjectId) return;
    const obj = objects.find((o) => o.id === selectedObjectId);
    if (!obj) return;
    const def = OBJECT_REGISTRY[obj.typeId];
    const topZ = obj.position[2] + (def ? def.dimensions.height : 0);

    setFormX(obj.position[0].toFixed(1));
    setFormY(obj.position[1].toFixed(1));
    setFormZ(topZ.toFixed(1));
    setFormName(`Pick ${obj.name}`);
    setFormMotionType('JUMP');
    setFormToolAction('on');
  };

  const handleSaveDialog = () => {
    const ptData: Omit<TeachingPoint, 'id'> = {
      name: formName.trim() || `Point ${teachingPoints.length + 1}`,
      x: parseFloat(formX) || 0,
      y: parseFloat(formY) || 0,
      z: parseFloat(formZ) || 0,
      r: parseFloat(formR) || 0,
      motionType: formMotionType,
      speed: parseInt(formSpeed, 10) || 50,
      pauseMs: parseInt(formPauseMs, 10) || 0,
      toolAction: formToolAction,
    };

    if (editingPointId) {
      updateTeachingPoint(editingPointId, ptData);
    } else {
      addTeachingPoint(ptData);
    }
    setIsDialogOpen(false);
  };

  const handleEditPoint = (pt: TeachingPoint) => {
    setEditingPointId(pt.id);
    setFormName(pt.name);
    setFormX(pt.x.toString());
    setFormY(pt.y.toString());
    setFormZ(pt.z.toString());
    setFormR(pt.r.toString());
    setFormMotionType(pt.motionType || 'MOVJ');
    setFormSpeed((pt.speed || 50).toString());
    setFormPauseMs((pt.pauseMs || 0).toString());
    setFormToolAction(pt.toolAction || 'none');
    setIsDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      {/* ---------------- SEQUENCE EXECUTION CONTROLLER ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white uppercase tracking-wider">
            Teaching Playback Engine
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              telemetry.state === 'running'
                ? 'bg-green-500/20 text-green-400 animate-pulse'
                : telemetry.state === 'paused'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-[#1f242d] text-[#8c9ba5]'
            }`}
          >
            {telemetry.state.toUpperCase()}
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
          ) : telemetry.state === 'paused' ? (
            <button
              onClick={resumeExecution}
              className="py-1.5 px-3 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </button>
          ) : (
            <button
              onClick={runTeachingProgram}
              disabled={teachingPoints.length === 0}
              className="py-1.5 px-3 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm shadow-[#1890ff]/20 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START PLAYBACK</span>
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

          <button
            onClick={resetObjects}
            className="py-1.5 px-2.5 rounded bg-[#1f242d] hover:bg-[#262b36] text-[#b0bec5] hover:text-white font-medium flex items-center gap-1 border border-[#262b36]"
            title="Reset scene objects to their initial positions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET OBJECTS</span>
          </button>
        </div>
      </div>

      {/* ---------------- CYCLE REPEAT & AUTOMATION CONFIGURATION ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#262b36] pb-1.5">
          <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
            Cycle Execution & Repeat Settings
          </span>
          <span className="font-mono text-[10px] text-[#1890ff]">
            Cycle #{telemetry.currentCycle} / {telemetry.totalCycles === Infinity ? '∞' : telemetry.totalCycles}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-[#8c9ba5] mb-1 text-[11px]">Repeat Mode</label>
            <div className="flex rounded bg-[#101216] border border-[#262b36] p-0.5">
              <button
                type="button"
                onClick={() => setCycleMode('once')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                  cycleMode === 'once'
                    ? 'bg-[#1890ff] text-white shadow-sm'
                    : 'text-[#8c9ba5] hover:text-white'
                }`}
              >
                Play Once
              </button>
              <button
                type="button"
                onClick={() => setCycleMode('repeat')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                  cycleMode === 'repeat'
                    ? 'bg-[#1890ff] text-white shadow-sm'
                    : 'text-[#8c9ba5] hover:text-white'
                }`}
              >
                Repeat N
              </button>
              <button
                type="button"
                onClick={() => setCycleMode('infinite')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all ${
                  cycleMode === 'infinite'
                    ? 'bg-[#1890ff] text-white shadow-sm'
                    : 'text-[#8c9ba5] hover:text-white'
                }`}
              >
                Continuous (∞)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cycleMode === 'repeat' && (
              <div className="w-24">
                <label className="block text-[#8c9ba5] mb-1 text-[11px]">Count</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#101216] border border-[#262b36] rounded px-2 py-1 text-white font-mono text-xs"
                />
              </div>
            )}

            <div className="flex-1">
              <label className="flex items-center gap-2 cursor-pointer mt-3">
                <input
                  type="checkbox"
                  checked={autoResetObjectsOnCycle}
                  onChange={(e) => setAutoResetObjectsOnCycle(e.target.checked)}
                  className="w-4 h-4 accent-[#1890ff] rounded cursor-pointer"
                />
                <span className="text-[11px] text-[#b0bec5]">Reset objects before each cycle</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- TEACHING POINTS TABLE ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex-1">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#262b36]">
          <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
            Taught Points ({teachingPoints.length})
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRecordCurrent}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[#1890ff] hover:bg-blue-600 text-white font-medium shadow-sm transition-all"
              title="Capture current arm pose"
            >
              <Sparkles className="w-3 h-3" />
              <span>Record Pose</span>
            </button>

            <button
              onClick={handleOpenAddDialog}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#1f242d] hover:bg-[#262b36] border border-[#262b36] text-[#b0bec5] hover:text-white transition-all"
              title="Add point manually"
            >
              <Plus className="w-3 h-3" />
              <span>Manual</span>
            </button>
          </div>
        </div>

        {teachingPoints.length === 0 ? (
          <div className="p-8 text-center text-[#8c9ba5] text-xs border border-dashed border-[#262b36] rounded-lg">
            No teaching points recorded. Use 'Record Pose' or 'Manual' to add coordinates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262b36] text-[#8c9ba5] font-mono text-[11px]">
                  <th className="py-1.5 px-2">#</th>
                  <th className="py-1.5 px-2">Name</th>
                  <th className="py-1.5 px-2">Type</th>
                  <th className="py-1.5 px-2">X</th>
                  <th className="py-1.5 px-2">Y</th>
                  <th className="py-1.5 px-2">Z</th>
                  <th className="py-1.5 px-2">Tool</th>
                  <th className="py-1.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262b36]/50 font-mono">
                {teachingPoints.map((pt, idx) => {
                  const isCurrent =
                    telemetry.state === 'running' && telemetry.activeCommandIndex === idx;

                  return (
                    <tr
                      key={pt.id}
                      className={`transition-colors ${
                        isCurrent
                          ? 'bg-[#1890ff]/20 font-bold border-l-2 border-[#1890ff] text-white'
                          : 'hover:bg-[#1f242d]/50 text-[#b0bec5]'
                      }`}
                    >
                      <td className="py-2 px-2 text-[#8c9ba5] text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-2 font-sans font-medium text-white max-w-[100px] truncate">
                        {pt.name}
                      </td>
                      <td className="py-2 px-2 text-purple-300 font-sans">{pt.motionType || 'MOVJ'}</td>
                      <td className="py-2 px-2 text-red-300">{pt.x.toFixed(1)}</td>
                      <td className="py-2 px-2 text-green-300">{pt.y.toFixed(1)}</td>
                      <td className="py-2 px-2 text-blue-300">{pt.z.toFixed(1)}</td>
                      <td className="py-2 px-2 font-sans">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            pt.toolAction === 'on' || pt.toolAction === 'close'
                              ? 'bg-green-500/20 text-green-400'
                              : pt.toolAction === 'off' || pt.toolAction === 'open'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-[#14171d] text-[#8c9ba5]'
                          }`}
                        >
                          {pt.toolAction ? pt.toolAction.toUpperCase() : 'NONE'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-sans">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => reorderTeachingPoints(idx, Math.max(0, idx - 1))}
                            disabled={idx === 0}
                            className="p-1 rounded text-[#8c9ba5] hover:text-white disabled:opacity-20"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() =>
                              reorderTeachingPoints(
                                idx,
                                Math.min(teachingPoints.length - 1, idx + 1)
                              )
                            }
                            disabled={idx === teachingPoints.length - 1}
                            className="p-1 rounded text-[#8c9ba5] hover:text-white disabled:opacity-20"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleEditPoint(pt)}
                            className="p-1 rounded text-[#8c9ba5] hover:text-[#1890ff]"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTeachingPoint(pt.id)}
                            className="p-1 rounded text-[#8c9ba5] hover:text-[#ff4d4f]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- EDIT/ADD MODAL DIALOG ---------------- */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171a21] border border-[#262b36] rounded-xl shadow-2xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#262b36] pb-2">
              <span className="font-bold text-sm text-white">
                {editingPointId ? 'Edit Teaching Point' : 'Add Teaching Point'}
              </span>
              <button
                onClick={() => setIsDialogOpen(false)}
                className="text-[#8c9ba5] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[#8c9ba5] mb-1">Point Label</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#14171d] border border-[#262b36] rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {selectedObjectId && (
                <button
                  type="button"
                  onClick={handleCopyFromSelectedObject}
                  className="w-full py-1.5 px-2 rounded bg-[#1f242d] hover:bg-[#262b36] border border-[#1890ff]/40 text-[#1890ff] flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Coordinates from Selected Object</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-red-400 font-mono mb-0.5">X (mm)</label>
                  <input
                    type="number"
                    value={formX}
                    onChange={(e) => setFormX(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-green-400 font-mono mb-0.5">Y (mm)</label>
                  <input
                    type="number"
                    value={formY}
                    onChange={(e) => setFormY(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-blue-400 font-mono mb-0.5">Z (mm)</label>
                  <input
                    type="number"
                    value={formZ}
                    onChange={(e) => setFormZ(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 font-mono mb-0.5">R (deg)</label>
                  <input
                    type="number"
                    value={formR}
                    onChange={(e) => setFormR(e.target.value)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#8c9ba5] mb-0.5">Motion Type</label>
                  <select
                    value={formMotionType}
                    onChange={(e) => setFormMotionType(e.target.value as MotionType)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
                  >
                    <option value="MOVJ">MOVJ (Joint)</option>
                    <option value="MOVL">MOVL (Linear)</option>
                    <option value="JUMP">JUMP (Arch)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8c9ba5] mb-0.5">Tool Action</label>
                  <select
                    value={formToolAction}
                    onChange={(e) => setFormToolAction(e.target.value as any)}
                    className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
                  >
                    <option value="none">None</option>
                    <option value="on">Suction ON</option>
                    <option value="off">Suction OFF</option>
                    <option value="close">Gripper Close</option>
                    <option value="open">Gripper Open</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262b36]">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-3 py-1.5 rounded bg-[#1f242d] text-[#8c9ba5] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDialog}
                className="px-4 py-1.5 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-semibold shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
