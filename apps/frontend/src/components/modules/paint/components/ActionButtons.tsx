import React from 'react';
import { Undo, Redo, Trash2, Download } from 'lucide-react';

interface ActionButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  selectedObjectsLength: number;
  isLarge: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onGoCrop: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ canUndo, canRedo, isLarge, selectedObjectsLength, onUndo, onRedo, onClear, onExport, onGoCrop }) => {
  return (
    <div className="space-y-2">
      {isLarge && <button
        onClick={onGoCrop}
        className="p-2 rounded border cursor-pointer w-full border-accent/50 hover:bg-accent/10 text-accent flex items-center justify-center"
        title="Recadrer"
      >
        <span className="text-sm">Recadrer</span>
      </button>}
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
