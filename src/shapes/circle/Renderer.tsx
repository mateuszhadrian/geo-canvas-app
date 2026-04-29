'use client'

import { Circle } from 'react-konva'
import type { CircleShape } from './types'

export function CircleRenderer({ shape, isSelected }: { shape: CircleShape; isSelected: boolean }) {
  return (
    <>
      <Circle
        radius={shape.radius}
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
      {isSelected && (
        <Circle
          radius={Math.max(1, shape.radius - 1)}
          fillEnabled={false}
          stroke="#93c5fd"
          strokeWidth={2}
          listening={false}
          hitStrokeWidth={0}
          perfectDrawEnabled={false}
        />
      )}
    </>
  )
}
