import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const meetingId = formData.get('meetingId') as string

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Nenhum arquivo de áudio enviado' },
        { status: 400 }
      )
    }

    // Detecta o formato pelo tipo do arquivo
    const extensao = audioFile.type.includes('webm') ? 'chunk.webm'
      : audioFile.type.includes('mp4') ? 'audio.mp4'
      : audioFile.type.includes('wav') ? 'audio.wav'
      : 'audio.mp3'

    // Cria um novo File com nome correto para o Whisper identificar o formato
    const audioComNome = new File([audioFile], extensao, { type: audioFile.type })

    const transcription = await openai.audio.transcriptions.create({
      file: audioComNome,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    })

    if (meetingId) {
      await supabaseAdmin
        .from('meetings')
        .update({ transcript: transcription })
        .eq('id', meetingId)
    }

    return NextResponse.json({ transcript: transcription })

  } catch (error: any) {
    console.error('Erro na transcrição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao transcrever áudio' },
      { status: 500 }
    )
  }
}