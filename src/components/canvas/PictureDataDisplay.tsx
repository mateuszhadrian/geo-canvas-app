'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/store/use-canvas-store'
import { encodeDocument } from '@/lib/documentCodec'

export function PictureDataDisplay() {
  const shapes = useCanvasStore((s) => s.shapes)
  const layers = useCanvasStore((s) => s.layers)
  const [visible, setVisible] = useState(false)

  const json = useMemo(
    () => JSON.stringify(
      { layers: encodeDocument({ shapes, layers, stickyDefaults: {} }).layers },
      null,
      2,
    ),
    [shapes, layers],
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const stop = (e: WheelEvent) => e.stopPropagation()
    el.addEventListener('wheel', stop, { passive: false })
    return () => el.removeEventListener('wheel', stop)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 z-20 rounded"
      style={{
        right: '276px',  // clear the 256px right sidebar
        backgroundColor: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-toolbar-border)',
        maxWidth: '380px',
        maxHeight: visible ? '60vh' : 'none',
        overflowY: visible ? 'auto' : 'hidden',
      }}
    >
      <div
        className="sticky top-0 flex items-center justify-between px-3 py-1.5"
        style={{
          backgroundColor: 'var(--color-toolbar-bg)',
          borderBottom: visible ? '1px solid var(--color-toolbar-border)' : 'none',
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">JSON</span>
        <button
          onClick={() => setVisible((v) => !v)}
          className="rounded px-1.5 py-0.5 text-[10px] font-mono text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
        >
          {visible ? 'hide' : 'show'}
        </button>
      </div>
      {visible && (
        <pre className="px-3 py-2 text-xs font-mono text-gray-300" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {json}
        </pre>
      )}
    </div>
  )
}
