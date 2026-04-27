'use client'

import { Group, Line } from 'react-konva'
import type { LineShape } from './types'

interface Props {
  shape: LineShape
  draggable: boolean
  isSelected: boolean
  onClick: (addToSelection: boolean) => void
  onDragStart: () => void
  onDragMove: (e: any) => void
  onDragEnd: (pos: { x: number; y: number }) => void
}

export function LineRenderer({ shape, draggable, isSelected, onClick, onDragStart, onDragMove, onDragEnd }: Props) {
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
      {isSelected && (
        <Line
          points={shape.points}
          stroke='#93c5fd'
          strokeWidth={Math.max(4, shape.strokeWidth + 4)}
          dash={shape.dash ? [8, 4] : []}
          listening={false}
          hitStrokeWidth={0}
          perfectDrawEnabled={false}
        />
      )}
      <Line
        points={shape.points}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        dash={shape.dash ? [8, 4] : []}
      />
    </Group>
  )
}
