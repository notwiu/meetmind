'use client'

import { useState } from 'react'

export default function Home() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [emailDestino, setEmailDestino] = useState('')
  const [transcricao, setTranscricao] = useState('')
  const [resumo, setResumo] = useState<any>(null)
  const [etapa, setEtapa] = useState<'idle' | 'transcrevendo' | 'resumindo' | 'enviando' | 'pronto'>('idle')
  const [erro, setErro] = useState('')

  async function processarReuniao() {
    if (!arquivo) return setErro('Selecione um arquivo de áudio')
    if (!emailDestino) return setErro('Digite um email para receber a ata')
    setErro('')

    try {
      // Etapa 1: transcrever
      setEtapa('transcrevendo')
      const form = new FormData()
      form.append('audio', arquivo)
      const r1 = await fetch('/api/transcribe', { method: 'POST', body: form })
      const d1 = await r1.json()
      if (d1.error) throw new Error(d1.error)
      setTranscricao(d1.transcript)

      // Etapa 2: resumir
      setEtapa('resumindo')
      const r2 = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: d1.transcript }),
      })
      const d2 = await r2.json()
      if (d2.error) throw new Error(d2.error)
      setResumo(d2)

      // Etapa 3: enviar email
      setEtapa('enviando')
      const r3 = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: [emailDestino],
          dadosReuniao: { ...d2, data_reuniao: new Date().toLocaleDateString('pt-BR') },
        }),
      })
      const d3 = await r3.json()
      if (d3.error) throw new Error(d3.error)

      setEtapa('pronto')
    } catch (e: any) {
      setErro(e.message)
      setEtapa('idle')
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-medium mb-1">MeetMind</h1>
      <p className="text-gray-400 text-sm mb-8">Envie um áudio de reunião e receba a ata por email</p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Arquivo de áudio</label>
          <input
            type="file"
            accept="audio/*,video/mp4"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-200 file:rounded file:text-sm file:bg-white hover:file:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Email para receber a ata</label>
          <input
            type="email"
            value={emailDestino}
            onChange={(e) => setEmailDestino(e.target.value)}
            placeholder="seu@email.com"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>

        <button
          onClick={processarReuniao}
          disabled={etapa !== 'idle' && etapa !== 'pronto'}
          className="w-full bg-black text-white py-2 px-4 rounded text-sm hover:bg-gray-800 disabled:opacity-40 transition-opacity"
        >
          {etapa === 'idle' && 'Processar reunião'}
          {etapa === 'transcrevendo' && 'Transcrevendo o áudio...'}
          {etapa === 'resumindo' && 'Gerando resumo com IA...'}
          {etapa === 'enviando' && 'Enviando email...'}
          {etapa === 'pronto' && '✓ Pronto — processar outro'}
        </button>

        {erro && <p className="text-red-500 text-sm">{erro}</p>}
      </div>

      {transcricao && (
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Transcrição</p>
          <div className="bg-gray-50 rounded p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{transcricao}</div>
        </div>
      )}

      {resumo && (
        <div className="space-y-5">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Título</p>
            <p className="text-lg font-medium">{resumo.titulo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Resumo</p>
            <p className="text-sm text-gray-600 leading-relaxed">{resumo.resumo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Tarefas</p>
            <div className="space-y-2">
              {resumo.tarefas?.map((t: any, i: number) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{t.descricao}</p>
                    {t.responsavel && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.responsavel}{t.prazo ? ` · ${t.prazo}` : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {etapa === 'pronto' && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-700">Ata enviada para {emailDestino}</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}