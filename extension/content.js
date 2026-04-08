// URL da sua API no Vercel (ou localhost para testes)
const API_URL = 'https://meetmind.vercel.app' // troque pelo seu domínio

let mediaRecorder = null
let audioChunks = []
let transcricaoCompleta = ''
let emailDestino = ''
let intervalId = null
let gravando = false

// ─── Injetar o botão na interface do Meet ───────────────────────────────────

function injetarBotao() {
  // Evita injetar o botão duas vezes
  if (document.getElementById('meetmind-btn')) return

  // Aguarda a barra de controles do Meet carregar
  const barra = document.querySelector('[data-call-ended]')?.parentElement
    ?? document.querySelector('div[jsname="CmRyGd"]')
    ?? document.querySelector('[data-panel-id="goog-ws-caf-id"]')?.parentElement

  if (!barra) {
    // Se a barra ainda não carregou, tenta de novo em 2 segundos
    setTimeout(injetarBotao, 2000)
    return
  }

  const btn = document.createElement('button')
  btn.id = 'meetmind-btn'
  btn.innerHTML = `
    <span id="meetmind-status" style="
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1a1a1a;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 13px;
      font-family: -apple-system, sans-serif;
      cursor: pointer;
      font-weight: 500;
    ">
      <span style="width:8px;height:8px;border-radius:50%;background:#666;display:inline-block"></span>
      Iniciar ata
    </span>
  `
  btn.style.cssText = 'border:none;background:none;cursor:pointer;margin: 0 8px;'
  btn.onclick = toggleGravacao

  barra.appendChild(btn)
  console.log('[MeetMind] Botão injetado com sucesso')
}

// ─── Ligar/desligar a gravação ───────────────────────────────────────────────

async function toggleGravacao() {
  if (!gravando) {
    await iniciarGravacao()
  } else {
    await encerrarGravacao()
  }
}

async function iniciarGravacao() {
  // Pede o email do destinatário
  emailDestino = prompt(
    'Digite o email para receber a ata (pode ser o seu):\n\nSepare múltiplos emails com vírgula.',
    ''
  )
  if (!emailDestino) return

  try {
    // Captura o áudio do sistema (a reunião) + microfone
    const streamTela = await navigator.mediaDevices.getDisplayMedia({
      video: false,   // não captura vídeo, economiza memória
      audio: true,    // captura o áudio do sistema (voz dos participantes)
    })

    const streamMic = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    // Mistura os dois streams (sistema + microfone)
    const audioContext = new AudioContext()
    const destino = audioContext.createMediaStreamDestination()

    audioContext.createMediaStreamSource(streamTela).connect(destino)
    audioContext.createMediaStreamSource(streamMic).connect(destino)

    const streamFinal = destino.stream

    // Iniciar o gravador
    mediaRecorder = new MediaRecorder(streamFinal, {
      mimeType: 'audio/webm;codecs=opus'
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    // Coleta um chunk a cada 30 segundos e envia para transcrição
    mediaRecorder.start(30000) // 30000ms = 30 segundos por chunk

    // A cada 30 segundos, processa o chunk acumulado
    intervalId = setInterval(async () => {
      if (audioChunks.length === 0) return

      const chunkParaEnviar = [...audioChunks]
      audioChunks = [] // limpa para o próximo ciclo

      await transcreverChunk(chunkParaEnviar)
    }, 30000)

    gravando = true
    atualizarBotao(true)
    console.log('[MeetMind] Gravação iniciada')

  } catch (erro) {
    console.error('[MeetMind] Erro ao iniciar gravação:', erro)
    alert('Erro ao acessar áudio. Verifique as permissões do navegador.')
  }
}

async function encerrarGravacao() {
  gravando = false
  clearInterval(intervalId)

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }

  // Processa os chunks finais que sobraram
  if (audioChunks.length > 0) {
    await transcreverChunk(audioChunks)
    audioChunks = []
  }

  atualizarBotao(false, 'Gerando ata...')

  // Envia a transcrição completa para o resumo
  await gerarResumoEEnviarEmail()
}

// ─── Transcrever um chunk de áudio ──────────────────────────────────────────

async function transcreverChunk(chunks) {
  try {
    const blob = new Blob(chunks, { type: 'audio/webm' })

    // Só envia se o chunk tiver tamanho mínimo (evita chunks vazios)
    if (blob.size < 1000) return

    const formData = new FormData()
    formData.append('audio', blob, 'chunk.webm')

    const resposta = await fetch(`${API_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    })

    const dados = await resposta.json()

    if (dados.transcript) {
      transcricaoCompleta += ' ' + dados.transcript
      console.log('[MeetMind] Chunk transcrito:', dados.transcript.slice(0, 80) + '...')
    }
  } catch (erro) {
    console.error('[MeetMind] Erro ao transcrever chunk:', erro)
  }
}

// ─── Gerar resumo e enviar email ─────────────────────────────────────────────

async function gerarResumoEEnviarEmail() {
  if (!transcricaoCompleta.trim()) {
    alert('[MeetMind] Nenhum áudio foi captado. Verifique as permissões.')
    atualizarBotao(false)
    return
  }

  try {
    // Gerar resumo
    const respostaResumo = await fetch(`${API_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcricaoCompleta }),
    })
    const resumo = await respostaResumo.json()

    if (resumo.error) throw new Error(resumo.error)

    // Enviar email
    const destinatarios = emailDestino.split(',').map(e => e.trim())
    const respostaEmail = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinatarios,
        dadosReuniao: {
          ...resumo,
          data_reuniao: new Date().toLocaleDateString('pt-BR'),
        },
      }),
    })
    const resultadoEmail = await respostaEmail.json()
    if (resultadoEmail.error) throw new Error(resultadoEmail.error)

    // Limpar para próxima reunião
    transcricaoCompleta = ''
    atualizarBotao(false, '✓ Ata enviada!')
    setTimeout(() => atualizarBotao(false), 3000)

    alert(`✓ Ata enviada para: ${emailDestino}\n\nTítulo: ${resumo.titulo}`)

  } catch (erro) {
    console.error('[MeetMind] Erro ao gerar resumo:', erro)
    alert('Erro ao gerar a ata. Verifique o console para detalhes.')
    atualizarBotao(false)
  }
}

// ─── Atualizar visual do botão ───────────────────────────────────────────────

function atualizarBotao(gravandoAgora, textoCustom = null) {
  const status = document.getElementById('meetmind-status')
  if (!status) return

  if (textoCustom) {
    status.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block"></span>
      ${textoCustom}
    `
    return
  }

  if (gravandoAgora) {
    status.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span>
      Gravando... (clique para encerrar)
    `
    status.style.background = '#1a1a1a'
  } else {
    status.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:#666;display:inline-block"></span>
      Iniciar ata
    `
  }
}

// ─── Inicializar ─────────────────────────────────────────────────────────────

// Aguarda a página do Meet carregar completamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injetarBotao)
} else {
  // Se já carregou, espera 3s para a UI do Meet renderizar
  setTimeout(injetarBotao, 3000)
}

// Tenta reinjetar se o Meet recarregar partes da UI (SPA)
const observer = new MutationObserver(() => {
  if (!document.getElementById('meetmind-btn')) {
    injetarBotao()
  }
})
observer.observe(document.body, { childList: true, subtree: true })