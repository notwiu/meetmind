'use client'

import { useState } from 'react'

export default function Home() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [emailDestino, setEmailDestino] = useState('')
  const [transcricao, setTranscricao] = useState('')
  const [resumo, setResumo] = useState<any>(null)
  const [etapa, setEtapa] = useState<
    'idle' | 'transcrevendo' | 'resumindo' | 'enviando' | 'pronto'
  >('idle')
  const [erro, setErro] = useState('')
  const processando = etapa !== 'idle' && etapa !== 'pronto'

  async function processarReuniao() {
    if (!arquivo) return setErro('Selecione um arquivo de áudio')
    if (!emailDestino) return setErro('Digite um email para receber a ata')
    setErro('')

    try {
      setEtapa('transcrevendo')
      const form = new FormData()
      form.append('audio', arquivo)
      const r1 = await fetch('/api/transcribe', { method: 'POST', body: form })
      const d1 = await r1.json()
      if (d1.error) throw new Error(d1.error)
      setTranscricao(d1.transcript)

      setEtapa('resumindo')
      const r2 = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: d1.transcript }),
      })
      const d2 = await r2.json()
      if (d2.error) throw new Error(d2.error)
      setResumo(d2)

      setEtapa('enviando')
      const r3 = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: [emailDestino],
          dadosReuniao: {
            ...d2,
            data_reuniao: new Date().toLocaleDateString('pt-BR'),
          },
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
    <div className="min-h-screen bg-[#fafaf9]">

      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-medium text-sm">MeetMind</span>
          </div>
          <span className="text-xs text-gray-400">IA para reuniões</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* Hero */}
        {!resumo && (
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-500 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
              Transcrição em PT-BR · Powered by OpenAI
            </div>
            <h1 className="text-4xl font-medium text-gray-900 mb-4 leading-tight">
              Sua reunião acabou.<br />
              <span className="text-gray-400">A ata já está no email.</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-md mx-auto">
              Envie o áudio da reunião e receba em segundos o resumo,
              as decisões e as tarefas de cada participante.
            </p>
          </div>
        )}

        {/* Card principal */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

            {etapa === 'pronto' ? (
              /* Tela de sucesso */
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium mb-1">Ata enviada!</h2>
                <p className="text-sm text-gray-400 mb-6">Chegou para {emailDestino}</p>
                <button
                  onClick={() => {
                    setArquivo(null)
                    setEmailDestino('')
                    setTranscricao('')
                    setResumo(null)
                    setEtapa('idle')
                  }}
                  className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-800"
                >
                  Processar outra reunião
                </button>
              </div>
            ) : (
              /* Formulário */
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo de áudio
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {arquivo ? (
                        <span className="text-sm font-medium text-gray-700">{arquivo.name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Clique para selecionar ou arraste o arquivo
                        </span>
                      )}
                      <span className="text-xs text-gray-300">MP3, MP4, WAV, M4A · máx. 25MB</span>
                    </div>
                    <input
                      type="file"
                      accept="audio/*,video/mp4"
                      className="hidden"
                      onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para receber a ata
                  </label>
                  <input
                    type="email"
                    value={emailDestino}
                    onChange={(e) => setEmailDestino(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  />
                </div>

                {erro && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                    </svg>
                    <p className="text-sm text-red-600">{erro}</p>
                  </div>
                )}

                <button
                  onClick={processarReuniao}
                  disabled={processando}
                  className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {processando && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {etapa === 'idle' && 'Gerar ata da reunião'}
                  {etapa === 'transcrevendo' && 'Transcrevendo o áudio...'}
                  {etapa === 'resumindo' && 'Gerando resumo com IA...'}
                  {etapa === 'enviando' && 'Enviando email...'}
                </button>
              </div>
            )}
          </div>

          {/* Indicadores de etapa */}
          {processando && (
            <div className="mt-6 flex items-center justify-center gap-6">
              {[
                { id: 'transcrevendo', label: 'Transcrição' },
                { id: 'resumindo', label: 'Resumo IA' },
                { id: 'enviando', label: 'Envio' },
              ].map((item, i) => {
                const ordens = ['transcrevendo', 'resumindo', 'enviando']
                const idx = ordens.indexOf(etapa)
                const itemIdx = ordens.indexOf(item.id)
                const ativo = etapa === item.id
                const concluido = idx > itemIdx
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    {i > 0 && <div className={`w-8 h-px ${concluido ? 'bg-gray-400' : 'bg-gray-200'}`} />}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full transition-colors ${
                        concluido ? 'bg-gray-400' : ativo ? 'bg-gray-900 animate-pulse' : 'bg-gray-200'
                      }`} />
                      <span className={`text-xs ${
                        ativo ? 'text-gray-700 font-medium' : 'text-gray-300'
                      }`}>{item.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resultado */}
        {resumo && etapa === 'pronto' && (
          <div className="max-w-2xl mx-auto mt-12 space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs text-gray-300 uppercase tracking-wider">Resumo da reunião</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="text-xl font-medium mb-3">{resumo.titulo}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{resumo.resumo}</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6">
              <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-4">Tarefas</p>
              <div className="space-y-3">
                {resumo.tarefas?.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded border border-gray-200 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-700">{t.descricao}</p>
                      {t.responsavel && (
                        <p className="text-xs text-gray-300 mt-0.5">
                          {t.responsavel}{t.prazo ? ` · ${t.prazo}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {resumo.proximos_passos && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-3">Próximos passos</p>
                <p className="text-sm text-gray-500 leading-relaxed">{resumo.proximos_passos}</p>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com features */}
        {!resumo && (
          <div className="mt-20 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { title: 'Transcrição PT-BR', desc: 'Whisper da OpenAI, otimizado para português brasileiro' },
              { title: 'Resumo com IA', desc: 'GPT-4o extrai decisões, tarefas e responsáveis' },
              { title: 'Email automático', desc: 'Ata formatada para todos os participantes em segundos' },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-1">{f.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}