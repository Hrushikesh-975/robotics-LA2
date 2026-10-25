'use client';

import React, { useEffect } from 'react';
import { useDobotStore } from '@/lib/store/useDobotStore';
import { AlertTriangle, Info, X } from 'lucide-react';

export const StatusBanner: React.FC = () => {
  const {
    jogWarning,
    setJogWarning,
    statusNotification,
    setStatusNotification,
    isEmergencyStopped,
  } = useDobotStore();

  useEffect(() => {
    if (jogWarning && !isEmergencyStopped) {
      const timer = setTimeout(() => {
        setJogWarning(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [jogWarning, isEmergencyStopped, setJogWarning]);

  useEffect(() => {
    if (statusNotification) {
      const timer = setTimeout(() => {
        setStatusNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusNotification, setStatusNotification]);

  if (!jogWarning && !statusNotification) return null;

  return (
    <div className="px-4 py-2 space-y-1.5 shrink-0 z-20">
      {/* Jog / Limit / Safety Warning */}
      {jogWarning && (
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md text-xs border transition-all ${
            isEmergencyStopped
              ? 'bg-[#ff4d4f]/20 border-[#ff4d4f]/60 text-[#ff4d4f] font-semibold'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{jogWarning}</span>
          </div>
          {!isEmergencyStopped && (
            <button
              onClick={() => setJogWarning(null)}
              className="text-[#8c9ba5] hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Status Notification / Tool Action Hint */}
      {statusNotification && !jogWarning && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md text-xs bg-[#1890ff]/15 border border-[#1890ff]/40 text-sky-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#1890ff] shrink-0" />
            <span>{statusNotification}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-[#8c9ba5] hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
