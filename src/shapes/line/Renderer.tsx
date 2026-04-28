'use client'

import { Line } from 'react-konva'
import type { LineShape } from './types'

export function LineRenderer({ shape, isSelected }: { shape: LineShape; isSelected: boolean }) {
  return (
    <>
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
        hitStrokeWidth={60}
      />
    </>
  )
}
