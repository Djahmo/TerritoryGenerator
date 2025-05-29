import { DrawText, Point } from '../utils/types';
import { memo, useEffect, useRef } from 'react';
import { createBaseShapeWithPosition, updatePosition, withCanvasContext, configureFillStyle } from '../utils/toolFactory';

export class TextTool {  static draw(ctx: CanvasRenderingContext2D, text: DrawText): void {
    if (!text.content.trim()) return;

    withCanvasContext(ctx, (ctx) => {
      configureFillStyle(ctx, text.color);
      ctx.font = `${text.fontSize * 4}px Arial`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = text.content.split('\n');
      const lineHeight = text.fontSize * 1.2 * 4;

      lines.forEach((line, index) => {
        ctx.fillText(line, text.x, text.y + (index * lineHeight));
      });
    });
  }  static createNew(color: string, fontSize: number, position: Point, content: string = ''): DrawText {
    return {
      type: 'text',
      fontSize,
      content,
      ...createBaseShapeWithPosition(color, position)
    };
  }

  static updateContent(text: DrawText, content: string): DrawText {
    return {
      ...text,
      content
    };
  }
  static updatePosition(text: DrawText, position: Point): DrawText {
    return updatePosition(text, position);
  }
}


export const TextInputComponent = memo(({ screenPos, textInput, fontSize, zoom, onTextChange, onSubmit, onCancel }: { screenPos: Point; textInput: string; fontSize: number, zoom:number, onTextChange: (value: string) => void; onSubmit: () => void; onCancel: () => void; }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleBlur = () => {
    if (textInput.trim()) {
      onSubmit();
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (textInput.trim()) {
        onSubmit();
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-50"
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`
      }}
    >
      <input
        ref={inputRef}
        value={textInput}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-0 outline-0 text-black min-w-32"        style={{
          fontSize: `${fontSize * 4 * zoom}px`,
          fontFamily: 'Arial',
          lineHeight: 1.2
        }}
        autoFocus
      />
    </div>
  );
});
