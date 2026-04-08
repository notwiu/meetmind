const API_URL = 'https://meetmind.vercel.app' // troque pelo seu domínio

let mediaRecorder = null
let audioChunks = []
let transcricaoCompleta = ''
let emailDestino = ''
let intervalId = null
let gravando = false

// ─── Criar o botão flutuante ──────────────────────────────────────────────────
// Em vez de injetar na barra do Meet (que muda sempre),
// criamos um botão flutuante fixo no canto da tela.
// Funciona 100% independente da versão do Meet.

function criarBotaoFlutuante() {
  if (document.getElementById('meetmind-fab')) return

  const fab = document.createElement('div')
  fab.id = 'meetmind-fab'
  fab.innerHTML = `
    <div id="meetmind-inner" style="
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      font-family: -apple-system, sans-serif;
    ">
      <!-- Notificação de status (aparece durante gravação) -->
      <div id="meetmind-toast" style="
        display: none;
        background: #1a1a1a;
        color: white;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 20px;
        white-space: nowrap;
      ">⏺ Gravando...</div>

      <!-- Botão principal -->
      <button id="meetmind-btn" style="
        background: #1a1a1a;
        color: white;
        border: none;
        border-radius: 24px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: background 0.2s;
      ">
        <span id="meetmind-dot" style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
          display: inline-block;
          flex-shrink: 0;
        "></span>
        <span id="meetmind-label">Iniciar ata</span>
      </button>
    </div>
  `

  document.body.appendChild(fab)

  document.getElementById('meetmind-btn').addEventListener('click', toggleGravacao)

  console.log('[MeetMind] Botão flutuante criado com sucesso')
}

// ─── Ligar / desligar gravação ────────────────────────────────────────────────

async function toggleGravacao() {
  if (!gravando) {
    await iniciarGravacao()
  } else {
    await encerrarGravacao()
  }
}

async function iniciarGravacao() {
  emailDestino = prompt(
    'Digite o email para receber a ata:\n(separe múltiplos emails com vírgula)',
    ''
  )
  if (!emailDestino || !emailDestino.trim()) return

  try {
    // Captura áudio do sistema (vozes dos participantes)
    const streamTela = await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
      },
    })

    // Captura o microfone (sua própria voz)
    const streamMic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })

    // Mistura os dois áudios num único stream
    const ctx = new AudioContext()
    const destino = ctx.createMediaStreamDestination()
    ctx.createMediaStreamSource(streamTela).connect(destino)
    ctx.createMediaStreamSource(streamMic).connect(destino)

    mediaRecorder = new MediaRecorder(destino.stream, {
      mimeType: 'audio/webm;codecs=opus',
    })

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data)
    }

    // Coleta chunks a cada 30 segundos
    mediaRecorder.start(30000)

    intervalId = setInterval(async () => {
      if (audioChunks.length === 0) return
      const chunks = [...audioChunks]
      audioChunks = []
      await transcreverChunk(chunks)
    }, 30000)

    gravando = true
    atualizarVisual('gravando')

    // Para automaticamente se o usuário fechar o compartilhamento
    streamTela.getAudioTracks()[0].onended = () => {
      if (gravando) encerrarGravacao()
    }

    console.log('[MeetMind] Gravação iniciada')

  } catch (erro) {
    console.error('[MeetMind] Erro ao iniciar:', erro)

    if (erro.name === 'NotAllowedError') {
      alert('Permissão negada.\n\nVocê precisa:\n1. Clicar em "Compartilhar"\n2. Selecionar "Aba do Chrome"\n3. Marcar "Compartilhar áudio da aba"')
    } else {
      alert('Erro ao acessar áudio: ' + erro.message)
    }
  }
}

async function encerrarGravacao() {
  gravando = false
  clearInterval(intervalId)

  if (mediaRecorder?.state !== 'inactive') {
    mediaRecorder.stop()
  }

  atualizarVisual('processando')

  // Processa os chunks que sobraram
  if (audioChunks.length > 0) {
    await transcreverChunk([...audioChunks])
    audioChunks = []
  }

  await gerarResumoEEnviarEmail()
}

// ─── Transcrever chunk de áudio ───────────────────────────────────────────────

async function transcreverChunk(chunks) {
  try {
    const blob = new Blob(chunks, { type: 'audio/webm' })
    if (blob.size < 500) return // ignora chunks muito pequenos

    const form = new FormData()
    form.append('audio', blob, 'chunk.webm')

    const res = await fetch(`${API_URL}/api/transcribe`, {
      method: 'POST',
      body: form,
    })
    const dados = await res.json()

    if (dados.transcript && dados.transcript.trim()) {
      transcricaoCompleta += ' ' + dados.transcript
      console.log('[MeetMind] +', dados.transcript.slice(0, 60) + '...')
    }
  } catch (e) {
    console.error('[MeetMind] Erro ao transcrever chunk:', e)
  }
}

// ─── Gerar resumo e enviar email ──────────────────────────────────────────────

async function gerarResumoEEnviarEmail() {
  if (!transcricaoCompleta.trim()) {
    alert('[MeetMind] Nenhum áudio foi capturado.\nCertifique-se de selecionar "Compartilhar áudio da aba" ao compartilhar.')
    atualizarVisual('idle')
    return
  }

  try {
    // Gerar resumo
    const resResumo = await fetch(`${API_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcricaoCompleta }),
    })
    const resumo = await resResumo.json()
    if (resumo.error) throw new Error(resumo.error)

    // Enviar email
    const destinatarios = emailDestino.split(',').map(e => e.trim()).filter(Boolean)
    const resEmail = await fetch(`${API_URL}/api/send-email`, {
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
    const resultEmail = await resEmail.json()
    if (resultEmail.error) throw new Error(resultEmail.error)

    // Sucesso
    transcricaoCompleta = ''
    atualizarVisual('enviado')
    setTimeout(() => atualizarVisual('idle'), 4000)

    console.log('[MeetMind] Ata enviada para:', emailDestino)

  } catch (erro) {
    console.error('[MeetMind] Erro ao gerar ata:', erro)
    alert('Erro ao gerar a ata: ' + erro.message)
    atualizarVisual('idle')
  }
}

// ─── Atualizar visual do botão ────────────────────────────────────────────────

function atualizarVisual(estado) {
  const btn = document.getElementById('meetmind-btn')
  const dot = document.getElementById('meetmind-dot')
  const label = document.getElementById('meetmind-label')
  const toast = document.getElementById('meetmind-toast')
  if (!btn || !dot || !label) return

  if (estado === 'gravando') {
    dot.style.background = '#ef4444'
    dot.style.animation = 'meetmind-pulse 1s infinite'
    label.textContent = 'Parar e gerar ata'
    btn.style.background = '#1a1a1a'
    toast.style.display = 'block'
    toast.textContent = '⏺ Gravando reunião...'

    // Adiciona animação de pulse
    if (!document.getElementById('meetmind-style')) {
      const style = document.createElement('style')
      style.id = 'meetmind-style'
      style.textContent = `
        @keyframes meetmind-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `
      document.head.appendChild(style)
    }

  } else if (estado === 'processando') {
    dot.style.background = '#f59e0b'
    dot.style.animation = 'none'
    label.textContent = 'Gerando ata...'
    btn.style.background = '#333'
    toast.style.display = 'block'
    toast.textContent = '⏳ Processando com IA...'

  } else if (estado === 'enviado') {
    dot.style.background = '#22c55e'
    dot.style.animation = 'none'
    label.textContent = '✓ Ata enviada!'
    btn.style.background = '#166534'
    toast.style.display = 'none'

  } else { // idle
    dot.style.background = '#666'
    dot.style.animation = 'none'
    label.textContent = 'Iniciar ata'
    btn.style.background = '#1a1a1a'
    toast.style.display = 'none'
  }
}

// ─── Inicializar ──────────────────────────────────────────────────────────────
// Só injeta o botão quando estiver numa reunião ativa (URL tem /xxx-xxxx-xxx)

function verificarEIniciar() {
  const estaEmReuniao = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(window.location.href)

  if (estaEmReuniao) {
    // Aguarda 3s para a UI do Meet carregar completamente
    setTimeout(criarBotaoFlutuante, 3000)
  }
}

// Verifica na carga da página
verificarEIniciar()

// Verifica quando a URL muda (Meet é SPA — a URL muda sem recarregar a página)
let urlAnterior = window.location.href
setInterval(() => {
  if (window.location.href !== urlAnterior) {
    urlAnterior = window.location.href
    verificarEIniciar()
  }
}, 1000)