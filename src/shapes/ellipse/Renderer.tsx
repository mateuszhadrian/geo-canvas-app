'use client'

import { Group, Ellipse } from 'react-konva'
import type { EllipseShape } from './types'

interface Props {
  shape: EllipseShape
  draggable: boolean
  isSelected: boolean
  onClick: (addToSelection: boolean) => void
  onDragStart: () => void
  onDragMove: (e: any) => void
  onDragEnd: (pos: { x: number; y: number }) => void
}

export function EllipseRenderer({ shape, draggable, isSelected, onClick, onDragStart, onDragMove, onDragEnd }: Props) {
  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={draggable}
      onClick={(e) => onClick(e.evt.metaKey || e.evt.ctrlKey)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
    >
      <Ellipse
        radiusX={shape.radiusX}
        radiusY={shape.radiusY}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
      {isSelected && (
        <Ellipse
          radiusX={Math.max(1, shape.radiusX - 1)}
          radiusY={Math.max(1, shape.radiusY - 1)}
          fillEnabled={false}
          stroke='#93c5fd'
          strokeWidth={2}
          listening={false}
          hitStrokeWidth={0}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  )
}
