'use client'

import { Group, Rect } from 'react-konva'
import type { RectShape } from './types'

interface Props {
  shape: RectShape
  draggable: boolean
  isSelected: boolean
  onClick: (addToSelection: boolean) => void
  onDragStart: () => void
  onDragMove: (e: any) => void
  onDragEnd: (pos: { x: number; y: number }) => void
}

export function RectRenderer({ shape, draggable, isSelected, onClick, onDragStart, onDragMove, onDragEnd }: Props) {
  const ow = Math.max(2, shape.width - 2)
  const oh = Math.max(2, shape.height - 2)
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
      <Rect
        offsetX={shape.width / 2}
        offsetY={shape.height / 2}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        cornerRadius={shape.cornerRadius}
      />
      {isSelected && (
        <Rect
          width={ow}
          height={oh}
          offsetX={ow / 2}
          offsetY={oh / 2}
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
