import type { Shape, ShapeType, ShapeProperties } from '@/shapes'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './canvasConstants'

// Bump this whenever the schema changes in a breaking way.
export const SCHEMA_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface DocumentMeta {
  /** Schema version — used for future migrations. */
  schemaVersion: string
  /** Stable document UUID, preserved across saves. */
  id: string
  /** Human-readable document name. */
  name: string
  /** ISO 8601 — set once on creation, never changed. */
  createdAt: string
  /** ISO 8601 — updated on every save. */
  updatedAt: string
}

export interface GridSettings {
  visible: boolean
  /** Grid cell size in logical pixels at scale 1. */
  size: number
  /** CSS colour string. */
  color: string
  snapEnabled: boolean
  /** Snap attraction radius in logical pixels. */
  snapThreshold: number
}

export interface CanvasSettings {
  /** CSS colour string for canvas background. */
  background: string
  /** Logical canvas width in pixels. */
  width: number
  /** Logical canvas height in pixels. */
  height: number
  grid: GridSettings
}

/**
 * A layer groups shapes and controls their collective visibility / lock state.
 * MVP uses exactly one layer ("Layer 1"); the array exists so multi-layer
 * support can be added without changing the document schema.
 */
export interface DocumentLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  /** Layer-level opacity multiplier, 0–1. */
  opacity: number
  /** Ordered list of shapes — first = bottom of the z-stack. */
  shapes: Shape[]
}

/**
 * Root document type.  Every field needed to reconstruct an identical canvas
 * is stored here.  The structure is intentionally flat and JSON-serialisable
 * (all values are strings, numbers, booleans, or arrays/objects of those).
 *
 * Extensibility notes:
 * - Add new shape-level properties inside the specific shape type in
 *   `src/shapes/<name>/types.ts` — they will automatically appear here.
 * - Add new canvas-level settings to `CanvasSettings` or `DocumentMeta`.
 * - Add new layers to the `layers` array; consumers iterate them so order
 *   matters (index 0 = bottom-most layer).
 * - Bump `SCHEMA_VERSION` and add a migration in `documentCodec.ts` when a
 *   breaking change is made.
 */
export interface CanvasDocument {
  meta: DocumentMeta
  canvas: CanvasSettings
  layers: DocumentLayer[]
  /**
   * Last-used property defaults per shape type, so new shapes inherit the
   * style the user was working with when the file was saved.
   */
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
}

// ---------------------------------------------------------------------------
// Default values (used by codec when creating a new document)
// ---------------------------------------------------------------------------

export const DEFAULT_GRID: GridSettings = {
  visible: true,
  size: 20,
  color: '#e5e7eb',
  snapEnabled: false,
  snapThreshold: 8,
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  background: '#ffffff',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  grid: DEFAULT_GRID,
}

export const DEFAULT_LAYER_META: Omit<DocumentLayer, 'id' | 'shapes'> = {
  name: 'Layer 1',
  visible: true,
  locked: false,
  opacity: 1,
}
