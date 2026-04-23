import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET - Listar leads
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const uf = params.get('uf');
  const cnae = params.get('cnae');
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(500, Number(params.get('page_size')) || 50);

  try {
    const db = getDb();

    let where = 'WHERE 1=1';
    const queryParams: (string | number)[] = [];

    if (status) {
      where += ' AND status = ?';
      queryParams.push(status);
    }
    if (uf) {
      where += ' AND uf = ?';
      queryParams.push(uf);
    }
    if (cnae) {
      where += ' AND cnae_fiscal = ?';
      queryParams.push(cnae);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM leads ${where}`).get(...queryParams) as { total: number };
    const total = countResult?.total || 0;

    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`
      SELECT * FROM leads ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams, pageSize, offset);

    return NextResponse.json({
      data: rows,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
  }
}

// POST - Criar leads a partir de empresas buscadas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresas } = body as {
      empresas: Array<{
        cnpj: string;
        razao_social?: string;
        nome_fantasia?: string;
        cnae_fiscal?: string;
        cnae_descricao?: string;
        uf?: string;
        municipio?: string;
        bairro?: string;
        logradouro?: string;
        numero?: string;
        cep?: string;
        telefone?: string;
        email?: string;
        capital_social?: number;
        situacao?: string;
        data_abertura?: string;
      }>;
    };

    if (!empresas?.length) {
      return NextResponse.json({ error: 'Lista de empresas vazia' }, { status: 400 });
    }

    const db = getDb();

    // Verificar existentes
    const cnpjs = empresas.map(e => e.cnpj);
    const placeholders = cnpjs.map(() => '?').join(',');
    const existentes = db.prepare(`SELECT cnpj FROM leads WHERE cnpj IN (${placeholders})`).all(...cnpjs) as { cnpj: string }[];
    const cnpjsExistentes = new Set(existentes.map(e => e.cnpj));

    // Inserir novos
    const insert = db.prepare(`
      INSERT INTO leads (
        cnpj, razao_social, nome_fantasia, cnae_fiscal, cnae_descricao,
        uf, cidade, bairro, endereco, cep, telefone, email,
        capital_social, situacao, data_abertura, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo')
    `);

    let criados = 0;
    const insertMany = db.transaction((lista: typeof empresas) => {
      for (const emp of lista) {
        if (cnpjsExistentes.has(emp.cnpj)) continue;

        insert.run(
          emp.cnpj,
          emp.razao_social || null,
          emp.nome_fantasia || null,
          emp.cnae_fiscal || null,
          emp.cnae_descricao || null,
          emp.uf || null,
          emp.municipio || null,
          emp.bairro || null,
          [emp.logradouro, emp.numero].filter(Boolean).join(', ') || null,
          emp.cep || null,
          emp.telefone || null,
          emp.email || null,
          emp.capital_social || null,
          emp.situacao || null,
          emp.data_abertura || null
        );
        criados++;
      }
    });

    insertMany(empresas);

    return NextResponse.json({
      total_recebidos: empresas.length,
      duplicados: cnpjsExistentes.size,
      criados,
    });

  } catch (error) {
    console.error('Erro ao criar leads:', error);
    return NextResponse.json({ error: 'Erro ao criar leads' }, { status: 500 });
  }
}

// PATCH - Atualizar status
export async function PATCH(request: NextRequest) {
  try {
    const { ids, status } = await request.json();

    if (!ids?.length || !status) {
      return NextResponse.json({ error: 'ids e status obrigatórios' }, { status: 400 });
    }

    const statusValidos = ['novo', 'contatado', 'qualificado', 'descartado'];
    if (!statusValidos.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(status, ...ids);

    return NextResponse.json({ updated: ids.length });
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

// DELETE - Deletar leads
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids?.length) {
      return NextResponse.json({ error: 'ids obrigatório' }, { status: 400 });
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids);

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}
