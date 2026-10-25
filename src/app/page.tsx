'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDobotStore, TabType } from '@/lib/store/useDobotStore';
import { TopAppBar } from '@/components/layout/TopAppBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { BottomDiagnostics } from '@/components/layout/BottomDiagnostics';
import { StatusBanner } from '@/components/panels/StatusBanner';
import { OperationPanel } from '@/components/panels/OperationPanel';
import { ObjectsPanel } from '@/components/panels/ObjectsPanel';
import { TeachingPanel } from '@/components/panels/TeachingPanel';
import { BlocklyPanel } from '@/components/panels/BlocklyPanel';
import { ScriptPanel } from '@/components/panels/ScriptPanel';
import { DrawPanel } from '@/components/panels/DrawPanel';
import { DiagnosticsPanel } from '@/components/panels/DiagnosticsPanel';
import { SettingsPanel } from '@/components/panels/SettingsPanel';

// Dynamic import for Viewport3D to ensure WebGL/Canvas loads strictly client-side
const Viewport3D = dynamic(
  () => import('@/components/viewport/Viewport3D').then((mod) => mod.Viewport3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#101216] text-[#8c9ba5]">
        <div className="w-8 h-8 border-2 border-[#1890ff] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono">Initializing Three.js Simulation Viewport...</span>
      </div>
    ),
  }
);

export default function SimulatorPage() {
  const { activeTab, setActiveTab, loadFromLocalStorage } = useDobotStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFromLocalStorage();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabType;
    if (tabParam && [
      'operation',
      'teaching',
      'blockly',
      'script',
      'objects',
      'draw',
      'diagnostics',
      'settings',
    ].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [loadFromLocalStorage, setActiveTab]);

  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab, mounted]);

  if (!mounted) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#101216] text-white">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#1890ff] rounded-full animate-ping" />
          <span className="text-xs font-mono">Loading DobotStudio Simulation Environment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#101216] text-[#e0e6ed] select-none font-sans">
      {/* ---------------- 1. TOP APPLICATION BAR ---------------- */}
      <TopAppBar />

      {/* ---------------- 2. MAIN WORKSPACE (LEFT NAV + VIEWPORT + CONTEXT PANEL) ---------------- */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <LeftSidebar />

        {/* Center 3D Interactive Viewport */}
        <main className="flex-1 h-full relative overflow-hidden bg-[#101216]">
          <Viewport3D />
        </main>

        {/* Right Contextual Control Panel */}
        <aside className="w-[420px] max-w-[45vw] h-full flex flex-col bg-[#14171d] border-l border-[#262b36] overflow-hidden shrink-0 z-10 shadow-2xl">
          <StatusBanner />

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'operation' && <OperationPanel />}
            {activeTab === 'teaching' && <TeachingPanel />}
            {activeTab === 'blockly' && <BlocklyPanel />}
            {activeTab === 'script' && <ScriptPanel />}
            {activeTab === 'objects' && <ObjectsPanel />}
            {activeTab === 'draw' && <DrawPanel />}
            {activeTab === 'diagnostics' && <DiagnosticsPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </aside>
      </div>

      {/* ---------------- 3. BOTTOM DIAGNOSTICS & TIMELINE BAR ---------------- */}
      <BottomDiagnostics />
    </div>
  );
}
