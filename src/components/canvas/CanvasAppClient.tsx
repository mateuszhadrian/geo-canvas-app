'use client'

import dynamic from 'next/dynamic'

const CanvasApp = dynamic(() => import('@/components/canvas/CanvasApp'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">Loading...</div>
  ),
})

export default function CanvasAppClient() {
  return <CanvasApp />
}
