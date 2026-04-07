import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MeetMind — Ata de reunião automática com IA',
  description:
    'Envie o áudio da sua reunião e receba em segundos o resumo, as decisões e as tarefas de cada participante. Transcrição em PT-BR com Whisper + GPT-4o.',
  keywords: 'ata de reunião, transcrição automática, IA, GPT, Whisper, PT-BR',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}