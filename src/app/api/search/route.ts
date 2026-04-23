import { NextRequest, NextResponse } from 'next/server';
import { searchEmpresas, searchEmpresasAll } from '@/lib/search-api';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const cnae = params.get('cnae');
  const uf = params.get('uf') || undefined;
  const cidade = params.get('cidade') || undefined;
  const situacao = (params.get('situacao') as 'ATIVA' | 'BAIXADA' | 'INAPTA' | 'SUSPENSA') || 'ATIVA';
  const apenasMatriz = params.get('apenas_matriz') === 'true';
  const comEmail = params.get('com_email') === 'true';
  const comTelefone = params.get('com_telefone') === 'true';
  const excluirMEI = params.get('excluir_mei') === 'true';
  const capitalMin = params.get('capital_min') ? Number(params.get('capital_min')) : undefined;
  const capitalMax = params.get('capital_max') ? Number(params.get('capital_max')) : undefined;
  const page = Number(params.get('page')) || 1;
  const buscarTodas = params.get('buscar_todas') === 'true';

  if (!cnae) {
    return NextResponse.json({ error: 'CNAE é obrigatório' }, { status: 400 });
  }

  try {
    const result = buscarTodas
      ? await searchEmpresasAll({
          cnae,
          uf,
          cidade,
          situacao,
          apenasMatriz,
          comEmail,
          comTelefone,
          excluirMEI,
          capitalMin,
          capitalMax,
        })
      : await searchEmpresas({
          cnae,
          uf,
          cidade,
          situacao,
          apenasMatriz,
          comEmail,
          comTelefone,
          excluirMEI,
          capitalMin,
          capitalMax,
          page,
        });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro na busca' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro na API de busca:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
