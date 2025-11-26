
import React, { useState } from 'react';
import Canvas from './Canvas';
import PropertyPanel from './PropertyPanel';
import { useResizable } from '../hooks/useResizable';
import { Undo2, Redo2, Monitor, Tablet, Smartphone, Save, Play, Rocket, MousePointer2, Hand } from 'lucide-react';

interface AppToolbarProps {
  device: 'desktop' | 'tablet' | 'mobile';
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
}

const AppToolbar: React.FC<AppToolbarProps> = ({ device, setDevice }) => {
  const [mode, setMode] = useState<'edit' | 'move'>('edit');

  return (
    <div className="h-12 border-b border-gray-200 dark:border-ide-border bg-white dark:bg-ide-panel flex items-center justify-between px-4 shrink-0 z-10 transition-colors">
        {/* Left: Modes & History Actions */}
        <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex bg-gray-100 dark:bg-[#151515] p-0.5 rounded-md">
                <button 
                    onClick={() => setMode('edit')}
                    className={`p-1.5 rounded-sm transition-all ${mode === 'edit' ? 'bg-white dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    title="Edit Mode"
                >
                    <MousePointer2 size={16} />
                </button>
                <button 
                    onClick={() => setMode('move')}
                    className={`p-1.5 rounded-sm transition-all ${mode === 'move' ? 'bg-white dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    title="Move Mode"
                >
                    <Hand size={16} />
                </button>
            </div>

            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>

            {/* History */}
            <div className="flex items-center gap-1">
                <button className="p-1.5 text-gray-500 hover:text-ide-text hover:bg-gray-100 dark:hover:bg-ide-hover rounded-md transition-colors disabled:opacity-40" title="Undo">
                    <Undo2 size={16} />
                </button>
                <button className="p-1.5 text-gray-500 hover:text-ide-text hover:bg-gray-100 dark:hover:bg-ide-hover rounded-md transition-colors disabled:opacity-40" title="Redo">
                    <Redo2 size={16} />
                </button>
            </div>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex bg-gray-100 dark:bg-[#151515] p-0.5 rounded-md">
            <button 
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded-sm transition-all ${device === 'desktop' ? 'bg-white dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                title="Desktop"
            >
                <Monitor size={16} />
            </button>
            <button 
                onClick={() => setDevice('tablet')}
                className={`p-1.5 rounded-sm transition-all ${device === 'tablet' ? 'bg-white dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                title="Tablet"
            >
                <Tablet size={16} />
            </button>
            <button 
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded-sm transition-all ${device === 'mobile' ? 'bg-white dark:bg-[#2b2b2b] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                title="Mobile"
            >
                <Smartphone size={16} />
            </button>
        </div>

        {/* Right: Main Actions */}
        <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-ide-hover rounded-md transition-colors" title="Save">
                <Save size={14} />
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-ide-hover rounded-md transition-colors" title="Preview">
                <Play size={14} />
            </button>
            <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm" title="Publish">
                <Rocket size={14} />
            </button>
        </div>
    </div>
  );
};

const AppBuilder: React.FC = () => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const { width, startResizing } = useResizable({
    initialWidth: 260,
    minWidth: 240,
    maxWidth: 600,
    edge: 'right'
  });

  return (
    <>
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <AppToolbar device={device} setDevice={setDevice} />
          <div className="flex-1 flex overflow-hidden relative">
             <Canvas device={device} />
          </div>
      </div>
      
      {/* PropertyPanel Resizer */}
      <div
        className="w-[1px] bg-ide-border hover:bg-blue-500 cursor-col-resize z-50 relative transition-colors"
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-50" />
      </div>

      <PropertyPanel width={width} />
    </>
  );
};

export default AppBuilder;
