import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ollama Chat',
  description: 'Local AI Chatbot powered by Ollama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

