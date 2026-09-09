import React from 'react';
import { ToolType, Tool } from '../utils/types';

interface ToolBarProps {
  tools: Tool[];
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({ tools, selectedTool, onToolSelect }) => {
  return (
    <div className="paint-tools" role="group" aria-label="Outils de dessin">
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onToolSelect(tool.name)}
          className={selectedTool === tool.name ? 'btn-selected' : 'btn-unselected'}
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={selectedTool === tool.name}
        >
          <tool.icon size={20} />
        </button>
      ))}
    </div>
  );
};
