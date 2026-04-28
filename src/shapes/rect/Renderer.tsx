'use client'

import { Rect } from 'react-konva'
import type { RectShape } from './types'

export function RectRenderer({ shape, isSelected }: { shape: RectShape; isSelected: boolean }) {
  const ow = Math.max(2, shape.width - 2)
  const oh = Math.max(2, shape.height - 2)
  return (
    <>
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
    </>
  )
}
