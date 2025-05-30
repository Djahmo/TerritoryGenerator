import React from 'react';
import { Undo, Redo, Trash2, Download } from 'lucide-react';

interface ActionButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  selectedObjectsLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ canUndo, canRedo, selectedObjectsLength, onUndo, onRedo, onClear, onExport, }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded border cursor-pointer border-muted/50 hover:bg-muted/10 text-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Annuler"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded border cursor-pointer border-muted/50 hover:bg-muted/10 text-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Refaire"
        >
          <Redo size={16} />
        </button>
      </div>
      <button
        onClick={onClear}
        className="w-full p-2 rounded border cursor-pointer border-negative text-negative hover:bg-negative-hover/20 flex items-center justify-center gap-1"
        title="Effacer la sélection"
        hidden={selectedObjectsLength === 0}
      >
        <Trash2 size={16} />
        <span className="text-sm">Effacer {selectedObjectsLength} objet{selectedObjectsLength > 1 ? "s" : ""}</span>
      </button>
      <button
        onClick={onExport}
        className="w-full p-2 rounded border cursor-pointer border-success text-success hover:bg-success-hover/20 flex items-center justify-center gap-1"
        title="Exporter"
      >
        <Download size={16} />
        <span className="text-sm">Sauvegarder</span>
      </button>
    </div>
  );
};
