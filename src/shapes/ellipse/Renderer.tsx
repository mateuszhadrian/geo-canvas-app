'use client'

import { Ellipse } from 'react-konva'
import type { EllipseShape } from './types'

export function EllipseRenderer({ shape, isSelected }: { shape: EllipseShape; isSelected: boolean }) {
  return (
    <>
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
    </>
  )
}
