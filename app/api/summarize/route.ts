import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

const PROMPT = `Você é um assistente especializado em analisar reuniões em português brasileiro.

Dada a transcrição de uma reunião, retorne APENAS um JSON válido com esta estrutura exata, sem texto adicional:

{
  "titulo": "título curto da reunião (máximo 8 palavras)",
  "resumo": "parágrafo de 3 a 5 frases com as principais decisões tomadas",
  "pontos_principais": ["ponto 1", "ponto 2", "ponto 3"],
  "tarefas": [
    {
      "descricao": "o que precisa ser feito",
      "responsavel": "nome da pessoa ou null",
      "prazo": "prazo mencionado ou null"
    }
  ],
  "proximos_passos": "o que deve acontecer após esta reunião"
}`

export async function POST(request: NextRequest) {
    try {
        const { transcript, meetingId } = await request.json()

        if (!transcript){
            return NextResponse.json({error: "Transcrição não enviada"}, {status: 400})
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: 'system', content: PROMPT },
                { role: 'user', content: 'Transcrição da reunião:\n\n${transcript}' }
            ],
            response_format: { type: 'json_object' },
            temperature : 0.2,
        })

        const resultado = JSON.parse(completion.choices[0].message.content  || '{}')

        if (meetingId) {
            await supabaseAdmin
                .from('meetings')
                .update({ title: resultado.titulo, summary: resultado.resumo })
                .eq('id', meetingId)

        if (resultado.tarefas?.length > 0) {
            const tarefas = resultado.tarefas.map((tarefa: any) => ({
                meetingId: meetingId,
                description: t.descricao,
                responsible: t.responsavel,
                due_date: t.prazo,
            }))
            await supabaseAdmin.from('tasks').insert(tarefas)       
        }
    }

    return NextResponse.json(resultado)

    } catch (error: any) {
        console.error('Erro ao resumir reunião:', error)
        return NextResponse.json({error: "Erro ao resumir reunião"}, {status: 500})
    }
}
    