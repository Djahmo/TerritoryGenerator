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

export interface DrawingMetadata {
  visible?: boolean;
  locked?: boolean;
  timestamp?: number;
  name?: string;
}

export interface DrawBrush extends DrawingMetadata {
  id: string;
  type: 'brush';
  color: string;
  strokeWidth: number;
  points: Point[];
}

export interface DrawLine extends DrawingMetadata {
  id: string;
  type: 'line';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawParking extends DrawingMetadata {
  id: string;
  type: 'parking';
  color: string;
  x: number;
  y: number;
}

export interface DrawCompass extends DrawingMetadata {
  id: string;
  type: 'compass';
  color: string;
  x: number;
  y: number;
  rotation?: number; // Rotation en radians pour orienter la rose des vents
}

export interface DrawText extends DrawingMetadata {
  id: string;
  type: 'text';
  color: string;
  fontSize: number;
  x: number;
  y: number;
  content: string;
}

export interface DrawRectangle extends DrawingMetadata {
  id: string;
  type: 'rectangle';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawCircle extends DrawingMetadata {
  id: string;
  type: 'circle';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawArrow extends DrawingMetadata {
  id: string;
  type: 'arrow';
  color: string;
  strokeWidth: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface DrawSelection extends DrawingMetadata {
  id: string;
  type: 'selection';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type DrawObject = DrawBrush | DrawLine | DrawParking | DrawCompass | DrawText | DrawRectangle | DrawCircle | DrawArrow | DrawSelection;

export type ToolType = 'brush' | 'line' | 'parking' | 'compass' | 'text' | 'rectangle' | 'circle' | 'arrow' | 'selection';

export interface Tool {
  name: ToolType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}
