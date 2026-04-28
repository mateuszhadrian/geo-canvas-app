'use client'

import { useState, useCallback } from 'react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { parseDocument, decodeDocument } from '@/lib/documentCodec'

const LEFT_OFFSET = 68

export function JsonImportInput() {
  const [value, setValue] = useState('')
  const [hasError, setHasError] = useState(false)

  const setShapes = useCanvasStore((s) => s.setShapes)
  const setLayers = useCanvasStore((s) => s.setLayers)
  const setSelectedShapeIds = useCanvasStore((s) => s.setSelectedShapeIds)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      e.preventDefault()

      try {
        const doc = parseDocument(value.trim())
        const { shapes, layers, activeLayerId } = decodeDocument(doc)
        setShapes(shapes)
        setLayers(layers, activeLayerId)
        setSelectedShapeIds([])
        setValue('')
        setHasError(false)
      } catch {
        setHasError(true)
        setTimeout(() => { setValue(''); setHasError(false) }, 700)
      }
    },
    [value, setShapes, setLayers, setSelectedShapeIds],
  )

  return (
    <div className="fixed bottom-4 z-20" style={{ left: LEFT_OFFSET }}>
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); if (hasError) setHasError(false) }}
        onKeyDown={handleKeyDown}
        placeholder={'Paste JSON… Enter to restore'}
        className="resize rounded px-2 py-1.5 text-xs font-mono text-gray-300 outline-none transition-[border-color,box-shadow] placeholder:text-gray-600"
        style={{
          backgroundColor: 'var(--color-toolbar-bg)',
          border: `1px solid ${hasError ? '#ef4444' : 'var(--color-toolbar-border)'}`,
          boxShadow: hasError ? '0 0 0 2px rgba(239, 68, 68, 0.35)' : 'none',
          width: '260px',
          minWidth: '160px',
          minHeight: '62px',
        }}
      />
    </div>
  )
}
