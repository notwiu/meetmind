import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

function montarEmailHTML(dados: any) {
  const linhasTarefas = dados.tarefas
    .map((t: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">${t.descricao}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666">${t.responsavel ?? '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666">${t.prazo ?? '—'}</td>
      </tr>`
    ).join('')

  const pontos = dados.pontos_principais
    .map((p: string) => `<li style="margin-bottom:6px;font-size:14px">${p}</li>`)
    .join('')

  return `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;padding:20px">
      <p style="font-size:11px;color:#999;margin:0;letter-spacing:.08em">ATA DE REUNIÃO · ${dados.data_reuniao}</p>
      <h1 style="font-size:22px;font-weight:500;margin:8px 0 24px">${dados.titulo}</h1>
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:500;color:#999;margin:0 0 8px">RESUMO</p>
        <p style="margin:0;font-size:14px;line-height:1.7">${dados.resumo}</p>
      </div>
      <div style="margin-bottom:24px">
        <p style="font-size:11px;font-weight:500;color:#999;margin:0 0 12px">PONTOS PRINCIPAIS</p>
        <ul style="margin:0;padding-left:20px">${pontos}</ul>
      </div>
      <div style="margin-bottom:24px">
        <p style="font-size:11px;font-weight:500;color:#999;margin:0 0 12px">TAREFAS</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f0f0f0">
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:500">O que fazer</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:500">Responsável</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:500">Prazo</th>
            </tr>
          </thead>
          <tbody>${linhasTarefas}</tbody>
        </table>
      </div>
      <div style="margin-bottom:32px">
        <p style="font-size:11px;font-weight:500;color:#999;margin:0 0 8px">PRÓXIMOS PASSOS</p>
        <p style="margin:0;font-size:14px;line-height:1.7">${dados.proximos_passos}</p>
      </div>
      <div style="border-top:1px solid #f0f0f0;padding-top:16px;text-align:center">
        <p style="font-size:11px;color:#ccc;margin:0">
          Gerado pelo <a href="https://meetmind.com.br" style="color:#ccc">MeetMind</a> · IA para reuniões
        </p>
      </div>
    </div>
  `
}

export async function POST(req: NextRequest) {
  try {
    const { destinatarios, dadosReuniao } = await req.json()

    const { data, error } = await resend.emails.send({
      from: 'MeetMind <onboarding@resend.dev>',
      to: destinatarios,
      subject: `Ata: ${dadosReuniao.titulo}`,
      html: montarEmailHTML(dadosReuniao),
    })

    if (error) throw new Error(JSON.stringify(error))

    return NextResponse.json({ sucesso: true, emailId: data?.id })

  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}