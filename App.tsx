
import React, { useState } from 'react';
import { Tool } from './types';
import Sidebar from './components/Sidebar';
import PromptGenerator from './components/PromptGenerator';
import ImageGenerator from './components/ImageGenerator';

const App: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<Tool>('prompt');

  const renderTool = () => {
    switch (selectedTool) {
      case 'prompt':
        return <PromptGenerator />;
      case 'image':
        return <ImageGenerator />;
      default:
        return <PromptGenerator />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar selectedTool={selectedTool} onSelectTool={setSelectedTool} />
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        {renderTool()}
      </main>
    </div>
  );
};

export default App;
