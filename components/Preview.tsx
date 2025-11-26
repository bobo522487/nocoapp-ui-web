import React from 'react';
import { RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface PreviewProps {
  url?: string;
}

const Preview: React.FC<PreviewProps> = ({ url = 'https://localhost:3000' }) => {
  return (
    <div className="flex flex-col h-full bg-white border-l border-ide-border">
      {/* Browser Toolbar */}
      <div className="h-10 bg-[#f0f0f0] border-b border-[#ddd] flex items-center px-2 gap-2">
        <div className="flex gap-1">
            <button className="p-1 text-gray-500 hover:text-gray-700"><ChevronLeft size={14} /></button>
            <button className="p-1 text-gray-500 hover:text-gray-700"><ChevronRight size={14} /></button>
            <button className="p-1 text-gray-500 hover:text-gray-700"><RefreshCw size={12} /></button>
        </div>
        
        <div className="flex-1 bg-white border border-[#ddd] rounded h-6 flex items-center px-2 text-xs text-gray-600 overflow-hidden">
           {url}
        </div>

        <button className="p-1 text-gray-500 hover:text-gray-700"><ExternalLink size={14} /></button>
      </div>

      {/* Preview Content (Mock) */}
      <div className="flex-1 bg-white p-8 overflow-auto relative">
        {/* Using an iframe pointing to a data uri or just mocked content */}
        <div className="font-sans text-center mt-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Hello CodeSandbox</h1>
            <h2 className="text-xl text-gray-600">Start editing to see some magic happen!</h2>
            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-md inline-block text-blue-800">
                This is a static preview component simulating the browser output.
            </div>
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Preview;