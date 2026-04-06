import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const audioFile = formData.get("audio") as File
        const meetingId = formData.get("meetingId") as string
        const userId = formData.get("userId") as string

        if (!audioFile) {
            return NextResponse.json({error: "Arquivo de audio obrigatorio"}, {status: 400})
        }

        // transcreve com whisper

        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "pt",
            response_format: "text",
        })

        // salvar no supabase

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabase
            .from('meetings')
            .update({transcript: transcription})
            .eq('id', meetingId)
        
        return NextResponse.json({transcript: transcription})

    } catch (error) {
        console.error('Erro na transcricao:', error)
        return NextResponse.json({error: "Erro na transcricao"}, {status: 500})
    }
}