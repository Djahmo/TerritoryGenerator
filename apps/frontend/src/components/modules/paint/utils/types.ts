// Types for the Paint component
import React from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface PanStart {
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export interface DrawBrush {
  id: string;
  type: 'brush';
  color: string;
  strokeWidth: number;
  points: Point[];
}

export interface DrawLine {
  id: string;
  type: 'line';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawParking {
  id: string;
  type: 'parking';
  color: string;
  x: number;
  y: number;
}

export interface DrawText {
  id: string;
  type: 'text';
  color: string;
  fontSize: number;
  x: number;
  y: number;
  content: string;
}

export interface DrawRectangle {
  id: string;
  type: 'rectangle';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawCircle {
  id: string;
  type: 'circle';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawArrow {
  id: string;
  type: 'arrow';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawSelection {
  id: string;
  type: 'selection';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type DrawObject = DrawBrush | DrawLine | DrawParking | DrawText | DrawRectangle | DrawCircle | DrawArrow | DrawSelection;

export type ToolType = 'brush' | 'line' | 'parking' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'selection';

export interface Tool {
  name: ToolType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}
