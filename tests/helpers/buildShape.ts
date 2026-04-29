import type { RectShape } from '@/shapes/rect/types'
import type { CircleShape } from '@/shapes/circle/types'
import type { EllipseShape } from '@/shapes/ellipse/types'
import type { TriangleShape, TriangleVertices } from '@/shapes/triangle/types'
import type { LineShape } from '@/shapes/line/types'

export function buildRect(overrides: Partial<RectShape> & { id: string }): RectShape {
  return {
    type: 'rect',
    x: 100, y: 100,
    width: 100, height: 70,
    fill: '#4A90D9', cornerRadius: 0,
    rotation: 0, opacity: 1, stroke: '#333333', strokeWidth: 2,
    ...overrides,
  }
}

export function buildCircle(overrides: Partial<CircleShape> & { id: string }): CircleShape {
  return {
    type: 'circle',
    x: 200, y: 200,
    radius: 45,
    fill: '#E8A838',
    rotation: 0, opacity: 1, stroke: '#333333', strokeWidth: 2,
    ...overrides,
  }
}

export function buildEllipse(overrides: Partial<EllipseShape> & { id: string }): EllipseShape {
  return {
    type: 'ellipse',
    x: 200, y: 200,
    radiusX: 60, radiusY: 40,
    fill: '#E8A838',
    rotation: 0, opacity: 1, stroke: '#333333', strokeWidth: 2,
    ...overrides,
  }
}

export function buildTriangle(overrides: Partial<TriangleShape> & { id: string }): TriangleShape {
  return {
    type: 'triangle',
    x: 0, y: 0,
    vertices: [0, -50, 50, 50, -50, 50] as TriangleVertices,
    fill: '#6AB04C',
    rotation: 0, opacity: 1, stroke: '#333333', strokeWidth: 2,
    ...overrides,
  }
}

export function buildLine(overrides: Partial<LineShape> & { id: string }): LineShape {
  return {
    type: 'line',
    x: 0, y: 0,
    points: [0, 0, 100, 0],
    dash: false,
    rotation: 0, opacity: 1, stroke: '#333333', strokeWidth: 2,
    ...overrides,
  }
}
