// =============================================================================
// SERVIÇO DE ENRIQUECIMENTO - BRASIL API + RECEITAWS
// =============================================================================

export interface Socio {
  nome: string;
  qualificacao: string | null;
  data_entrada: string | null;
}

export interface EnrichedData {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_fiscal: string | null;
  cnae_descricao: string | null;
  uf: string | null;
  municipio: string | null;
  bairro: string | null;
  logradouro: string | null;
  numero: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  capital_social: number | null;
  situacao: string | null;
  data_abertura: string | null;
  socios: Socio[];
  fonte: string;
}

// Rate limiting simples
const lastRequest: Record<string, number> = {};

async function waitRateLimit(api: string, reqPerMin: number): Promise<void> {
  const interval = (60 / reqPerMin) * 1000;
  const last = lastRequest[api] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < interval) {
    await new Promise(r => setTimeout(r, interval - elapsed));
  }
  lastRequest[api] = Date.now();
}

// Brasil API (gratuita, ~30 req/min)
async function fetchBrasilAPI(cnpj: string): Promise<EnrichedData | null> {
  await waitRateLimit('brasilapi', 30);

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;

    const d = await res.json();

    return {
      cnpj,
      razao_social: d.razao_social,
      nome_fantasia: d.nome_fantasia,
      cnae_fiscal: d.cnae_fiscal?.toString(),
      cnae_descricao: d.cnae_fiscal_descricao,
      uf: d.uf,
      municipio: d.municipio,
      bairro: d.bairro,
      logradouro: d.logradouro,
      numero: d.numero,
      cep: d.cep?.replace(/\D/g, ''),
      telefone: d.ddd_telefone_1,
      email: d.email,
      capital_social: d.capital_social,
      situacao: d.descricao_situacao_cadastral,
      data_abertura: d.data_inicio_atividade,
      socios: (d.qsa || []).map((s: Record<string, string>) => ({
        nome: s.nome_socio,
        qualificacao: s.qualificacao_socio,
        data_entrada: s.data_entrada_sociedade,
      })),
      fonte: 'brasilapi',
    };
  } catch (error) {
    console.error('Erro Brasil API:', error);
    return null;
  }
}

// ReceitaWS (3 req/min grátis)
async function fetchReceitaWS(cnpj: string): Promise<EnrichedData | null> {
  await waitRateLimit('receitaws', 3);

  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;

    const d = await res.json();
    if (d.status === 'ERROR') return null;

    const atividade = d.atividade_principal?.[0] || {};

    return {
      cnpj,
      razao_social: d.nome,
      nome_fantasia: d.fantasia,
      cnae_fiscal: atividade.code?.replace(/[.-]/g, ''),
      cnae_descricao: atividade.text,
      uf: d.uf,
      municipio: d.municipio,
      bairro: d.bairro,
      logradouro: d.logradouro,
      numero: d.numero,
      cep: d.cep?.replace(/[.-]/g, ''),
      telefone: d.telefone,
      email: d.email,
      capital_social: parseFloat(d.capital_social?.replace(/\./g, '').replace(',', '.')) || null,
      situacao: d.situacao,
      data_abertura: d.abertura,
      socios: (d.qsa || []).map((s: Record<string, string>) => ({
        nome: s.nome,
        qualificacao: s.qual,
        data_entrada: null,
      })),
      fonte: 'receitaws',
    };
  } catch (error) {
    console.error('Erro ReceitaWS:', error);
    return null;
  }
}

// Função principal com fallback
export async function enrichCNPJ(cnpj: string): Promise<EnrichedData | null> {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) throw new Error('CNPJ inválido');

  // Tentar Brasil API primeiro (mais rápida)
  let data = await fetchBrasilAPI(limpo);
  if (data) return data;

  // Fallback: ReceitaWS
  data = await fetchReceitaWS(limpo);
  return data;
}

// Enriquecer em lote (com progresso)
export async function enrichBatch(
  cnpjs: string[],
  onProgress?: (done: number, total: number, current?: EnrichedData) => void
): Promise<Map<string, EnrichedData | null>> {
  const results = new Map<string, EnrichedData | null>();

  for (let i = 0; i < cnpjs.length; i++) {
    const cnpj = cnpjs[i];

    try {
      const data = await enrichCNPJ(cnpj);
      results.set(cnpj, data);
      onProgress?.(i + 1, cnpjs.length, data || undefined);
    } catch {
      results.set(cnpj, null);
      onProgress?.(i + 1, cnpjs.length);
    }

    // Delay entre requests
    if (i < cnpjs.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}
