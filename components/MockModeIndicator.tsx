import React, { useSyncExternalStore } from 'react';
import { isMockMode, subscribeMockMode } from '../lib/api';

const MockModeIndicator: React.FC = () => {
  const mockMode = useSyncExternalStore(subscribeMockMode, isMockMode, isMockMode);

  if (!mockMode) return null;

  return (
    <div
      role="status"
      className="fixed bottom-3 right-3 z-50 rounded-md border border-border-strong bg-popover/95 px-3 py-1.5 text-[12px] font-medium text-muted-foreground shadow-[var(--shadow-control)] backdrop-blur-xs"
    >
      离线演示 · 数据仅保存在本机
    </div>
  );
};

export default MockModeIndicator;
