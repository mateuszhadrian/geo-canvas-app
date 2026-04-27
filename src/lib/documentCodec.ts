import { generateId } from './generateId'
import {
  SCHEMA_VERSION,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_LAYER_META,
} from './document'
import type { CanvasDocument, DocumentLayer } from './document'
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

/**
 * Parse a JSON string and return a `CanvasDocument`.
 * Throws a descriptive `Error` if the string is not valid JSON or is missing
 * the required top-level fields.
 */
export function parseDocument(json: string): CanvasDocument {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('Invalid document: not valid JSON.')
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid document: root must be a JSON object.')
  }

  const doc = raw as Record<string, unknown>

  if (!doc.meta || typeof doc.meta !== 'object') {
    throw new Error('Invalid document: missing "meta" field.')
  }
  if (!doc.canvas || typeof doc.canvas !== 'object') {
    throw new Error('Invalid document: missing "canvas" field.')
  }
  if (!Array.isArray(doc.layers)) {
    throw new Error('Invalid document: "layers" must be an array.')
  }

  return doc as unknown as CanvasDocument
}
