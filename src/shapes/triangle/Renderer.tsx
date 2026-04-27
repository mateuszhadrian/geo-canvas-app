'use client'

import { Group, RegularPolygon } from 'react-konva'
import type { TriangleShape } from './types'

interface Props {
  shape: TriangleShape
  draggable: boolean
  isSelected: boolean
  onClick: (addToSelection: boolean) => void
  onDragStart: () => void
  onDragMove: (e: any) => void
  onDragEnd: (pos: { x: number; y: number }) => void
}

export function TriangleRenderer({ shape, draggable, isSelected, onClick, onDragStart, onDragMove, onDragEnd }: Props) {
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
      <RegularPolygon
        sides={3}
        radius={shape.radius}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
      {isSelected && (
        <RegularPolygon
          sides={3}
          radius={Math.max(1, shape.radius - 1)}
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
