// =============================================================================
// SERVIÇO DE BUSCA - CASA DOS DADOS API
// =============================================================================
// API semi-pública que permite buscar empresas por CNAE
// Limite: ~100 resultados por busca (5 páginas x 20)

export interface SearchParams {
  cnae: string;
  uf?: string;
  cidade?: string;
  situacao?: 'ATIVA' | 'BAIXADA' | 'INAPTA' | 'SUSPENSA';
  apenasMatriz?: boolean;
  apenasMEI?: boolean;
  excluirMEI?: boolean;
  comEmail?: boolean;
  comTelefone?: boolean;
  capitalMin?: number;
  capitalMax?: number;
  page?: number;
}

export interface EmpresaResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnae_fiscal: string;
  cnae_descricao: string | null;
  uf: string;
  municipio: string;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  porte: string | null;
  data_abertura: string | null;
  situacao: string;
  capital_social: number | null;
}

export interface SearchResponse {
  success: boolean;
  data: EmpresaResult[];
  total: number;
  page: number;
  hasMore: boolean;
  error?: string;
}

export async function searchEmpresas(params: SearchParams): Promise<SearchResponse> {
  const {
    cnae,
    uf,
    cidade,
    situacao = 'ATIVA',
    apenasMatriz = false,
    apenasMEI = false,
    excluirMEI = false,
    comEmail = false,
    comTelefone = false,
    capitalMin,
    capitalMax,
    page = 1,
  } = params;

  try {
    const body = {
      query: {
        termo: [],
        atividade_principal: [cnae],
        natureza_juridica: [],
        uf: uf ? [uf] : [],
        municipio: cidade ? [cidade.toUpperCase()] : [],
        bairro: [],
        situacao_cadastral: situacao,
        cep: [],
        ddd: [],
      },
      range_query: {
        data_abertura: { lte: null, gte: null },
        capital_social: {
          gte: capitalMin || null,
          lte: capitalMax || null,
        },
      },
      extras: {
        somente_mei: apenasMEI,
        excluir_mei: excluirMEI,
        com_email: comEmail,
        incluir_atividade_secundaria: false,
        com_contato_telefonico: comTelefone,
        somente_matriz: apenasMatriz,
        somente_filial: false,
      },
      page,
    };

    const response = await fetch('https://api.casadosdados.com.br/v2/public/cnpj/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Casa dos Dados:', response.status, errorText);
      return {
        success: false,
        data: [],
        total: 0,
        page,
        hasMore: false,
        error: `Erro na API: ${response.status}`,
      };
    }

    const result = await response.json();
    
    // Mapear resultados para nosso formato
    const empresas: EmpresaResult[] = (result.data?.cnpj || []).map((emp: Record<string, unknown>) => {
      const cnpjLimpo = String(emp.cnpj || '').replace(/\D/g, '');
      
      // Montar telefone
      let telefone = null;
      if (emp.ddd_telefone_1 && emp.telefone_1) {
        telefone = `(${emp.ddd_telefone_1}) ${emp.telefone_1}`;
      } else if (emp.ddd_telefone_2 && emp.telefone_2) {
        telefone = `(${emp.ddd_telefone_2}) ${emp.telefone_2}`;
      }

      return {
        cnpj: cnpjLimpo,
        razao_social: emp.razao_social as string || '',
        nome_fantasia: emp.nome_fantasia as string || null,
        cnae_fiscal: cnae,
        cnae_descricao: emp.cnae_fiscal_descricao as string || null,
        uf: emp.uf as string || '',
        municipio: emp.municipio as string || '',
        bairro: emp.bairro as string || null,
        logradouro: emp.logradouro as string || null,
        numero: emp.numero as string || null,
        cep: emp.cep as string || null,
        telefone,
        email: emp.email as string || null,
        porte: emp.porte as string || null,
        data_abertura: emp.data_inicio_atividade as string || null,
        situacao: emp.situacao_cadastral as string || situacao,
        capital_social: emp.capital_social as number || null,
      };
    });

    // A API retorna no máximo 20 por página, até página 5
    const total = result.data?.count || empresas.length;
    const hasMore = page < 5 && empresas.length === 20;

    return {
      success: true,
      data: empresas,
      total,
      page,
      hasMore,
    };

  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return {
      success: false,
      data: [],
      total: 0,
      page,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Buscar múltiplas páginas de uma vez (para pegar mais resultados)
export async function searchEmpresasAll(
  params: SearchParams,
  maxPages = 5
): Promise<SearchResponse> {
  const allEmpresas: EmpresaResult[] = [];
  let currentPage = 1;
  let total = 0;

  while (currentPage <= maxPages) {
    const result = await searchEmpresas({ ...params, page: currentPage });
    
    if (!result.success) {
      if (currentPage === 1) return result;
      break;
    }

    allEmpresas.push(...result.data);
    total = result.total;

    if (!result.hasMore) break;
    
    currentPage++;
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    success: true,
    data: allEmpresas,
    total,
    page: 1,
    hasMore: false,
  };
}
