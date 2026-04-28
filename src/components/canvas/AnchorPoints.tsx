'use client'

import { RegularPolygon } from 'react-konva'
import type { AnchorPoint } from '@/shapes/_base/types'

const ANCHOR_R = 5

interface Props {
  anchors: AnchorPoint[]
}

/**
 * Renders anchor points as small green diamonds in LOCAL shape coords.
 * Must be placed inside the shape's Konva Group so the group transform applies.
 */
export function AnchorPoints({ anchors }: Props) {
  return (
    <>
      {anchors.map((a) => (
        <RegularPolygon
          key={a.id}
          x={a.x}
          y={a.y}
          sides={4}
          radius={ANCHOR_R}
          rotation={45}
          fill='#22c55e'
          stroke='#15803d'
          strokeWidth={1}
          opacity={0.85}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  )
}
