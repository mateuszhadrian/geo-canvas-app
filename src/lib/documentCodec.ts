import { generateId } from './generateId'
import {
  SCHEMA_VERSION,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_LAYER_META,
} from './document'
import type { CanvasDocument, DocumentLayer, DocumentMeta } from './document'
import type { Shape, ShapeType, ShapeProperties } from '@/shapes'
import type { Layer } from '@/store/slices/layers'
import { DEFAULT_LAYER_ID, INITIAL_LAYER } from '@/store/slices/layers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EncodeInput {
  shapes: Shape[]
  layers: Layer[]
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  name?: string
  existingMeta?: Pick<CanvasDocument['meta'], 'id' | 'createdAt' | 'name'>
}

// ---------------------------------------------------------------------------
// Encode  (in-memory state → CanvasDocument)
// ---------------------------------------------------------------------------

export function encodeDocument(input: EncodeInput): CanvasDocument {
  const now = new Date().toISOString()

  // Group shapes by layerId, preserving layer order
  const docLayers: DocumentLayer[] = input.layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    shapes: input.shapes.filter((s) => (s.layerId ?? DEFAULT_LAYER_ID) === layer.id),
  }))

  // Safety: shapes with unknown layerId fall into the first layer
  const knownLayerIds = new Set(input.layers.map((l) => l.id))
  const orphans = input.shapes.filter((s) => s.layerId && !knownLayerIds.has(s.layerId))
  if (orphans.length > 0 && docLayers.length > 0) {
    docLayers[0].shapes.push(...orphans)
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
    layers: docLayers,
    stickyDefaults: input.stickyDefaults,
  }
}

// ---------------------------------------------------------------------------
// Decode  (CanvasDocument → in-memory state)
// ---------------------------------------------------------------------------

export interface DecodeResult {
  shapes: Shape[]
  layers: Layer[]
  activeLayerId: string
  stickyDefaults: Partial<Record<ShapeType, Partial<ShapeProperties>>>
  meta: CanvasDocument['meta']
}

export function decodeDocument(doc: CanvasDocument): DecodeResult {
  // Build layer metadata list (no shapes inline)
  const layers: Layer[] = doc.layers.map((dl) => ({
    id: dl.id,
    name: dl.name,
    visible: dl.visible,
    locked: dl.locked,
    opacity: dl.opacity,
  }))

  // Flatten shapes, injecting layerId from their parent document layer
  const shapes: Shape[] = doc.layers.flatMap((dl) =>
    dl.shapes.map((s) => ({ ...s, layerId: dl.id }))
  )

  // Ensure at least one layer exists
  if (layers.length === 0) {
    layers.push({ ...INITIAL_LAYER })
  }

  return {
    shapes,
    layers,
    activeLayerId: layers[layers.length - 1].id,
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
 * Parse a JSON string and return a CanvasDocument.
 * Accepts three formats:
 *   1. Full CanvasDocument (meta + canvas + layers)
 *   2. Object with just `layers` — meta and canvas filled with defaults
 *   3. Bare array — treated as a single default layer's shapes
 */
export function parseDocument(json: string): CanvasDocument {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('Invalid document: not valid JSON.')
  }

  // Format 3: bare shapes array
  if (Array.isArray(raw)) {
    return {
      meta: buildDefaultMeta(),
      canvas: DEFAULT_CANVAS_SETTINGS,
      layers: [{ id: DEFAULT_LAYER_ID, ...DEFAULT_LAYER_META, shapes: raw as Shape[] }],
      stickyDefaults: {},
    }
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid document: root must be a JSON object or a shapes array.')
  }

  const doc = raw as Record<string, unknown>

  if (!Array.isArray(doc.layers)) {
    throw new Error('Invalid document: "layers" must be an array.')
  }

  return {
    meta: (doc.meta as DocumentMeta) ?? buildDefaultMeta(),
    canvas: (doc.canvas as CanvasDocument['canvas']) ?? DEFAULT_CANVAS_SETTINGS,
    layers: doc.layers as DocumentLayer[],
    stickyDefaults: (doc.stickyDefaults as CanvasDocument['stickyDefaults']) ?? {},
  }
}
