import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GeoCanvas',
  description: 'A minimalist geometric shape editor — create, edit, and export geometric compositions in your browser.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
