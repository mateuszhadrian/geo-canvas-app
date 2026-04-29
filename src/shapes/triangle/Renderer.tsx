'use client'

import { Line } from 'react-konva'
import type { TriangleShape } from './types'

export function TriangleRenderer({
  shape,
  isSelected,
}: {
  shape: TriangleShape
  isSelected: boolean
}) {
  return (
    <>
      <Line
        points={[...shape.vertices]}
        closed
        fill={shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
      {isSelected && (
        <Line
          points={[...shape.vertices]}
          closed
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
