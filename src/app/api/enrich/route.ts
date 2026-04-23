import { NextRequest, NextResponse } from 'next/server';
import { enrichCNPJ, enrichBatch } from '@/lib/enrichment';
import { getDb } from '@/lib/db';

// POST /api/enrich - Enriquecer CNPJ(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cnpj, cnpjs, salvar_lead } = body as {
      cnpj?: string;
      cnpjs?: string[];
      salvar_lead?: boolean;
    };

    // Enriquecimento em lote
    if (cnpjs?.length) {
      const results: Array<{
        cnpj: string;
        success: boolean;
        data?: Record<string, unknown>;
        error?: string;
      }> = [];

      for (const c of cnpjs) {
        try {
          const data = await enrichCNPJ(c);
          if (data) {
            results.push({ cnpj: c, success: true, data: data as unknown as Record<string, unknown> });

            // Salvar como lead se solicitado
            if (salvar_lead) {
              saveAsLead(data);
            }
          } else {
            results.push({ cnpj: c, success: false, error: 'Não encontrado' });
          }
        } catch (err) {
          results.push({ cnpj: c, success: false, error: String(err) });
        }
      }

      return NextResponse.json({
        total: cnpjs.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    }

    // Enriquecimento individual
    if (!cnpj) {
      return NextResponse.json({ error: 'CNPJ é obrigatório' }, { status: 400 });
    }

    const data = await enrichCNPJ(cnpj);

    if (!data) {
      return NextResponse.json({ error: 'Não foi possível enriquecer. Tente novamente.' }, { status: 503 });
    }

    // Salvar como lead se solicitado
    if (salvar_lead) {
      saveAsLead(data);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro no enriquecimento:', error);
    return NextResponse.json({ error: 'Erro ao enriquecer' }, { status: 500 });
  }
}

// Função auxiliar para salvar como lead
function saveAsLead(data: Record<string, unknown>) {
  try {
    const db = getDb();
    const socios = data.socios as Array<{ nome: string; qualificacao: string | null }> | undefined;

    db.prepare(`
      INSERT OR REPLACE INTO leads (
        cnpj, razao_social, nome_fantasia, cnae_fiscal, cnae_descricao,
        uf, cidade, bairro, endereco, cep, telefone, email,
        capital_social, situacao, data_abertura,
        nome_socio_1, cargo_socio_1, nome_socio_2, cargo_socio_2,
        fonte_enriquecimento, data_enriquecimento, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      data.cnpj,
      data.razao_social,
      data.nome_fantasia,
      data.cnae_fiscal,
      data.cnae_descricao,
      data.uf,
      data.municipio,
      data.bairro,
      [data.logradouro, data.numero].filter(Boolean).join(', '),
      data.cep,
      data.telefone,
      data.email,
      data.capital_social,
      data.situacao,
      data.data_abertura,
      socios?.[0]?.nome || null,
      socios?.[0]?.qualificacao || null,
      socios?.[1]?.nome || null,
      socios?.[1]?.qualificacao || null,
      data.fonte,
    );
  } catch (err) {
    console.error('Erro ao salvar lead:', err);
  }
}
