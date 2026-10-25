'use client';

import React, { useState } from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import {
  PenTool,
  Play,
  Square,
  Upload,
  RotateCcw,
  Sliders,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { parseSvgToDrawingPoints } from '@/lib/draw/svgDrawing';

const SAMPLE_SVGS: { label: string; svg: string }[] = [
  {
    label: 'Concentric Squares',
    svg: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 20 20 L 80 20 L 80 80 L 20 80 Z M 35 35 L 65 35 L 65 65 L 35 65 Z" fill="none" stroke="black"/>
</svg>`,
  },
  {
    label: 'Star Polygon',
    svg: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 50 15 L 61 38 L 86 42 L 68 59 L 72 84 L 50 72 L 28 84 L 32 59 L 14 42 L 39 38 Z" fill="none" stroke="black"/>
</svg>`,
  },
  {
    label: 'Dobot Hexagon Logo',
    svg: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 50 20 L 80 37 L 80 73 L 50 90 L 20 73 L 20 37 Z M 50 35 L 70 47 L 70 63 L 50 75 L 30 63 L 30 47 Z" fill="none" stroke="black"/>
</svg>`,
  },
];

export const DrawPanel: React.FC = () => {
  const {
    drawSvgContent,
    setDrawSvgContent,
    drawConfig,
    setDrawConfig,
    runDrawProgram,
    stopExecution,
    telemetry,
    setEndEffectorType,
  } = useDobotStore();

  const [svgStats, setSvgStats] = useState<{ count: number } | null>(null);

  const handlePreviewPoints = () => {
    const pts = parseSvgToDrawingPoints(drawSvgContent, drawConfig);
    setSvgStats({ count: pts.length });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDrawSvgContent(text);
        setSvgStats(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4 select-none text-xs">
      {/* ---------------- DRAW ACTIONS HEADER ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-[#1890ff]" />
          <span className="font-semibold text-white uppercase tracking-wider">
            Write & Draw Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEndEffectorType('pen');
              runDrawProgram();
            }}
            disabled={!drawSvgContent.trim()}
            className="py-1.5 px-3 rounded bg-[#1890ff] hover:bg-blue-600 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START DRAWING</span>
          </button>

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

      {/* ---------------- DRAW CONFIGURATION PARAMS ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#262b36] pb-1.5">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            Drawing Plane & Heights
          </span>
          <span className="text-[10px] text-[#8c9ba5]">Coordinate mapping (mm)</span>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Center X:</span>
            <input
              type="number"
              value={drawConfig.originX}
              onChange={(e) => setDrawConfig({ originX: parseFloat(e.target.value) || 240 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Center Y:</span>
            <input
              type="number"
              value={drawConfig.originY}
              onChange={(e) => setDrawConfig({ originY: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Scale (mm/px):</span>
            <input
              type="number"
              step="0.1"
              value={drawConfig.scale}
              onChange={(e) => setDrawConfig({ scale: parseFloat(e.target.value) || 0.5 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Pen Up Z:</span>
            <input
              type="number"
              value={drawConfig.penUpZ}
              onChange={(e) => setDrawConfig({ penUpZ: parseFloat(e.target.value) || 25 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Pen Down Z:</span>
            <input
              type="number"
              value={drawConfig.penDownZ}
              onChange={(e) => setDrawConfig({ penDownZ: parseFloat(e.target.value) || 10 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <span className="text-[#8c9ba5] block mb-0.5">Speed (%):</span>
            <input
              type="number"
              min="5"
              max="100"
              value={drawConfig.speed}
              onChange={(e) => setDrawConfig({ speed: parseInt(e.target.value, 10) || 40 })}
              className="w-full bg-[#14171d] border border-[#262b36] rounded px-2 py-1 text-white"
            />
          </div>
        </div>
      </div>

      {/* ---------------- SAMPLE SVG PRESETS & UPLOAD ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            Artwork Templates & Import
          </span>
          <label className="flex items-center gap-1 text-[11px] text-[#1890ff] hover:underline cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload SVG</span>
            <input type="file" accept=".svg" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_SVGS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => {
                setDrawSvgContent(sample.svg);
                setSvgStats(null);
              }}
              className="py-1.5 px-2 rounded bg-[#1f242d] hover:bg-[#262b36] border border-[#262b36] text-white text-[11px] font-medium transition-colors text-center truncate"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- SVG CODE / PREVIEW ---------------- */}
      <div className="p-3 rounded-lg bg-[#171a21] border border-[#262b36] shadow-md flex-1 flex flex-col space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#262b36]">
          <span className="text-[11px] font-semibold text-[#8c9ba5] uppercase tracking-wider">
            SVG Path XML
          </span>
          <button
            onClick={handlePreviewPoints}
            className="text-[11px] text-[#1890ff] hover:underline flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validate Toolpath</span>
          </button>
        </div>

        {svgStats && (
          <div className="text-[11px] text-green-400 font-mono">
            ✓ Successfully parsed {svgStats.count} waypoints on table plane.
          </div>
        )}

        <textarea
          value={drawSvgContent}
          onChange={(e) => {
            setDrawSvgContent(e.target.value);
            setSvgStats(null);
          }}
          spellCheck={false}
          className="w-full flex-1 bg-[#101216] border border-[#262b36] rounded-md p-2.5 font-mono text-[11px] text-white resize-none focus:outline-none focus:border-[#1890ff]"
          rows={8}
        />
      </div>
    </div>
  );
};
