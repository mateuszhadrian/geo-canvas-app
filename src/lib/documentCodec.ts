import { generateId } from './generateId'
import {
  SCHEMA_VERSION,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_LAYER_META,
} from './document'
import type { CanvasDocument, DocumentLayer, DocumentMeta } from './document'
import type { Shape, ShapeType, ShapeProperties } from '@/shapes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncodeInput {
  shapes: Shape[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  /** Displayed document name. Defaults to "Untitled". */
  name?: string
  /**
   * Pass back the original meta when re-saving an existing document so that
   * `id` and `createdAt` are preserved while `updatedAt` is refreshed.
   */
  existingMeta?: Pick<CanvasDocument['meta'], 'id' | 'createdAt' | 'name'>
}

// ---------------------------------------------------------------------------
// Encode  (in-memory state → CanvasDocument)
// ---------------------------------------------------------------------------

export function encodeDocument(input: EncodeInput): CanvasDocument {
  const now = new Date().toISOString()

  const layer: DocumentLayer = {
    id: 'layer_default',
    ...DEFAULT_LAYER_META,
    shapes: input.shapes,
  }

  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      id: input.existingMeta?.id ?? generateId(),
      name: input.existingMeta?.name ?? input.name ?? 'Untitled',
      createdAt: input.existingMeta?.createdAt ?? now,
      updatedAt: now,
    },
    canvas: DEFAULT_CANVAS_SETTINGS,
    layers: [layer],
    stickyDefaults: input.stickyDefaults,
  }
}

// ---------------------------------------------------------------------------
// Decode  (CanvasDocument → in-memory state)
// ---------------------------------------------------------------------------

export interface DecodeResult {
  shapes: Shape[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  meta: CanvasDocument['meta']
}

export function decodeDocument(doc: CanvasDocument): DecodeResult {
  const shapes = doc.layers.flatMap((l) => l.shapes)
  return {
    shapes,
    stickyDefaults: doc.stickyDefaults ?? {},
    meta: doc.meta,
  }
}

// ---------------------------------------------------------------------------
// Serialise / parse  (CanvasDocument ↔ JSON string)
// ---------------------------------------------------------------------------

export function serializeDocument(doc: CanvasDocument): string {
  return JSON.stringify(doc, null, 2)
}

function buildDefaultMeta(): DocumentMeta {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: generateId(),
    name: 'Untitled',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Parse a JSON string and return a `CanvasDocument`.
 * Accepts three formats:
 *   1. Full CanvasDocument (meta + canvas + layers)
 *   2. Object with just `layers` — meta and canvas filled with defaults
 *   3. Bare array — treated as the layers array directly
 */
export function parseDocument(json: string): CanvasDocument {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('Invalid document: not valid JSON.')
  }

  // Format 3: bare layers array
  if (Array.isArray(raw)) {
    return {
      meta: buildDefaultMeta(),
      canvas: DEFAULT_CANVAS_SETTINGS,
      layers: raw as DocumentLayer[],
      stickyDefaults: {},
    }
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid document: root must be a JSON object or a layers array.')
  }

  const doc = raw as Record<string, unknown>

  if (!Array.isArray(doc.layers)) {
    throw new Error('Invalid document: "layers" must be an array.')
  }

  // Format 1 & 2: fill meta/canvas with defaults if absent
  return {
    meta: (doc.meta as DocumentMeta) ?? buildDefaultMeta(),
    canvas: (doc.canvas as CanvasDocument['canvas']) ?? DEFAULT_CANVAS_SETTINGS,
    layers: doc.layers as DocumentLayer[],
    stickyDefaults: (doc.stickyDefaults as CanvasDocument['stickyDefaults']) ?? {},
  }
}
