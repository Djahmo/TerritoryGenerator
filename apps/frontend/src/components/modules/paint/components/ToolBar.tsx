import React from 'react';
import { ToolType, Tool } from '../utils/types';

interface ToolBarProps {
  tools: Tool[];
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({ tools, selectedTool, onToolSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-2 justify-items-center w-full">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onToolSelect(tool.name)}
          className={selectedTool === tool.name ? 'btn-selected' : 'btn-unselected'}
          title={tool.label}
        >
          <tool.icon size={20} />
        </button>
      ))}
    </div>
  );
};
