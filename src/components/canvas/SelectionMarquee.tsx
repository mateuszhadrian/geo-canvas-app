'use client'

import { Rect } from 'react-konva'

interface Props {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function SelectionMarquee({ x1, y1, x2, y2 }: Props) {
  return (
    <Rect
      x={Math.min(x1, x2)}
      y={Math.min(y1, y2)}
      width={Math.abs(x2 - x1)}
      height={Math.abs(y2 - y1)}
      stroke='black'
      strokeWidth={1}
      strokeScaleEnabled={false}
      dash={[4, 4]}
      fillEnabled={false}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}
