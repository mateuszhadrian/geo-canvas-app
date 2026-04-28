import { generateId } from '@/lib/generateId'

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
}

export const DEFAULT_LAYER_ID = 'layer_default'

export const INITIAL_LAYER: Layer = {
  id: DEFAULT_LAYER_ID,
  name: 'Layer 1',
  visible: true,
  locked: false,
  opacity: 1,
}

export function createLayer(name?: string): Layer {
  return {
    id: generateId(),
    name: name ?? 'Layer',
    visible: true,
    locked: false,
    opacity: 1,
  }
}

export interface LayersSlice {
  layers: Layer[]
  activeLayerId: string

  addLayer: (name?: string) => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  setLayerOpacity: (id: string, opacity: number) => void
  setActiveLayer: (id: string) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  setLayers: (layers: Layer[], activeLayerId: string) => void
}
