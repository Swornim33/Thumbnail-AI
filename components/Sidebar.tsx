
import React from 'react';
import { Tool } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ImageIcon } from './icons/ImageIcon';

interface SidebarProps {
  selectedTool: Tool;
  onSelectTool: (tool: Tool) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedTool, onSelectTool }) => {
  const navItems = [
    { id: 'prompt', label: 'Prompt Generator', icon: <SparklesIcon /> },
    { id: 'image', label: 'Image Generator', icon: <ImageIcon /> },
  ];

  return (
    <aside className="bg-gray-800 text-white w-20 md:w-64 flex flex-col transition-all duration-300">
      <div className="p-4 md:p-6 border-b border-gray-700 flex items-center justify-center md:justify-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.45 4.75L2 12l8.55 4.25L12 21l1.45-4.75L22 12l-8.55-4.25Z"/><path d="m5 3 1.45 4.75"/><path d="m17 3 1.45 4.75"/><path d="m5 21 1.45-4.75"/><path d="m17 21 1.45-4.75"/></svg>
        <h1 className="text-xl font-bold ml-3 hidden md:block">Thumbnail AI</h1>
      </div>
      <nav className="flex-1 p-2 md:p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectTool(item.id as Tool)}
            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${
              selectedTool === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="w-6 h-6">{item.icon}</div>
            <span className="ml-4 hidden md:block">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-500 hidden md:block">
        <p>&copy; 2024 Swornim</p>
      </div>
    </aside>
  );
};

export default Sidebar;
