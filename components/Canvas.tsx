import React from 'react';
import { Layout } from 'lucide-react';

interface CanvasProps {
  device?: 'desktop' | 'tablet' | 'mobile';
}

const Canvas: React.FC<CanvasProps> = ({ device = 'desktop' }) => {
  
  const getDimensions = () => {
    switch(device) {
        case 'mobile': return 'w-[375px] min-h-[667px]';
        case 'tablet': return 'w-[768px] min-h-[1024px]';
        case 'desktop': default: return 'w-[1024px] min-h-[800px]';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-ide-bg min-w-0 overflow-hidden transition-colors">
      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-8 flex justify-center relative">
         {/* The Page Sheet */}
         <div className={`${getDimensions()} bg-white shadow-lg border border-gray-200 dark:border-gray-700/50 relative transition-all duration-300 ease-in-out`}>
            {/* Mock Content */}
            <div className="absolute top-8 left-8 right-8 h-24 bg-blue-50 border border-blue-100 border-dashed rounded flex items-center justify-center">
                <span className="text-blue-300 font-medium flex items-center gap-2"><Layout size={20}/> Header Section</span>
            </div>

            <div className="absolute top-40 left-8 w-64 h-32 bg-gray-50 border border-gray-200 border-dashed rounded p-4">
               <div className="h-4 w-20 bg-gray-200 rounded mb-3"></div>
               <div className="h-8 w-full bg-blue-500 rounded opacity-20"></div>
            </div>

            <div className="absolute top-40 left-80 right-8 h-96 bg-white border border-gray-200 rounded shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-6 w-32 bg-gray-100 rounded"></div>
                    <div className="h-8 w-24 bg-blue-600 rounded"></div>
                </div>
                <div className="space-y-4">
                    <div className="h-12 bg-gray-50 rounded w-full border border-gray-100"></div>
                    <div className="h-12 bg-gray-50 rounded w-full border border-gray-100"></div>
                    <div className="h-12 bg-gray-50 rounded w-full border border-gray-100"></div>
                    <div className="h-12 bg-gray-50 rounded w-full border border-gray-100"></div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Canvas;