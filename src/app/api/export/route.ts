import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

// GET - Exportar leads do banco
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get('format') || 'csv';
  const status = params.get('status');
  const idsParam = params.get('ids');

  try {
    const db = getDb();
    let rows: Record<string, unknown>[];

    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter(Boolean);
      const placeholders = ids.map(() => '?').join(',');
      rows = db.prepare(`SELECT * FROM leads WHERE id IN (${placeholders})`).all(...ids) as Record<string, unknown>[];
    } else if (status) {
      rows = db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(status) as Record<string, unknown>[];
    } else {
      rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 10000').all() as Record<string, unknown>[];
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'Nenhum lead encontrado' }, { status: 404 });
    }

    return exportData(rows, format);

  } catch (error) {
    console.error('Erro na exportação:', error);
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }
}

// POST - Exportar resultados de busca diretamente
export async function POST(request: NextRequest) {
  try {
    const { empresas, format = 'csv' } = await request.json();

    if (!empresas?.length) {
      return NextResponse.json({ error: 'Lista vazia' }, { status: 400 });
    }

    return exportData(empresas, format);

  } catch (error) {
    console.error('Erro na exportação:', error);
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }
}

// Função de exportação
function exportData(rows: Record<string, unknown>[], format: string) {
  const data = rows.map(row => ({
    'CNPJ': formatCNPJ(String(row.cnpj || '')),
    'Razão Social': row.razao_social || '',
    'Nome Fantasia': row.nome_fantasia || '',
    'CNAE': row.cnae_fiscal || '',
    'Descrição CNAE': row.cnae_descricao || '',
    'UF': row.uf || '',
    'Cidade': row.cidade || row.municipio || '',
    'Bairro': row.bairro || '',
    'Endereço': row.endereco || [row.logradouro, row.numero].filter(Boolean).join(', ') || '',
    'CEP': row.cep || '',
    'Telefone': row.telefone || '',
    'Email': row.email || '',
    'Capital Social': row.capital_social || '',
    'Porte': row.porte || '',
    'Data Abertura': row.data_abertura || '',
    'Situação': row.situacao || '',
    'Sócio 1': row.nome_socio_1 || '',
    'Cargo Sócio 1': row.cargo_socio_1 || '',
    'Sócio 2': row.nome_socio_2 || '',
    'Cargo Sócio 2': row.cargo_socio_2 || '',
    'Status': row.status || '',
    'Notas': row.notas || '',
  }));

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 20 }, // CNPJ
      { wch: 40 }, // Razão Social
      { wch: 30 }, // Nome Fantasia
      { wch: 10 }, // CNAE
      { wch: 40 }, // Descrição CNAE
      { wch: 5 },  // UF
      { wch: 20 }, // Cidade
      { wch: 20 }, // Bairro
      { wch: 40 }, // Endereço
      { wch: 10 }, // CEP
      { wch: 15 }, // Telefone
      { wch: 35 }, // Email
      { wch: 15 }, // Capital Social
      { wch: 15 }, // Porte
      { wch: 12 }, // Data Abertura
      { wch: 10 }, // Situação
      { wch: 30 }, // Sócio 1
      { wch: 20 }, // Cargo Sócio 1
      { wch: 30 }, // Sócio 2
      { wch: 20 }, // Cargo Sócio 2
      { wch: 12 }, // Status
      { wch: 30 }, // Notas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="prospeccao_${Date.now()}.xlsx"`,
      },
    });
  }

  // CSV
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(h => {
        const v = String(row[h as keyof typeof row] || '');
        return v.includes(';') || v.includes('\n') || v.includes('"')
          ? `"${v.replace(/"/g, '""')}"`
          : v;
      }).join(';')
    ),
  ].join('\n');

  return new NextResponse('\ufeff' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="prospeccao_${Date.now()}.csv"`,
    },
  });
}

function formatCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return cnpj;
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
