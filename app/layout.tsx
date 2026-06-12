import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Torneio Futsal 2025',
  description: 'Gestão de Torneio Futsal 5x5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: '#0f1419' }}>
        {children}
      </body>
    </html>
  )
}
