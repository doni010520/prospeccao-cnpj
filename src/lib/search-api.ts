// =============================================================================
// SERVIÇO DE BUSCA - CNPJá (https://cnpja.com)
// =============================================================================
// Endpoint GET https://api.cnpja.com/office com filtros por CNAE e UF.
// Autenticação: header `Authorization: <token>` (sem prefixo Bearer).
// Paginação: token-based (campo `next` na resposta, reuse como `?token=...`).
// Token obrigatório via env CNPJA_TOKEN. Sem token, a rota devolve erro claro.

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

// Shape parcial do record retornado pelo GET /office
interface CnpjaRecord {
  taxId: string;
  alias: string | null;
  founded: string | null;
  head: boolean;
  statusDate: string | null;
  status: { id: number; text: string };
  company: {
    name: string;
    equity: number | null;
    size?: { id: number; text: string };
  };
  address: {
    street: string | null;
    number: string | null;
    district: string | null;
    city: string | null;
    state: string;
    zip: string | null;
  };
  phones: Array<{ type: string; area: string; number: string }>;
  emails: Array<{ address: string; domain: string; ownership: string }>;
  mainActivity: { id: number; text: string };
}

interface CnpjaPage {
  next?: string;
  limit: number;
  count: number;
  records: CnpjaRecord[];
}

const CNPJA_BASE = 'https://api.cnpja.com';

// Códigos de situação cadastral da Receita (CNPJá usa o mesmo enum)
const STATUS_ID: Record<NonNullable<SearchParams['situacao']>, number> = {
  ATIVA: 2,
  SUSPENSA: 3,
  INAPTA: 4,
  BAIXADA: 8,
};

function buildQuery(params: SearchParams, limit: number): URLSearchParams {
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  q.set('mainActivity.id.in', params.cnae);
  q.set('status.id.in', String(STATUS_ID[params.situacao || 'ATIVA']));

  if (params.uf) q.set('address.state.in', params.uf);
  if (params.apenasMatriz) q.set('head.eq', 'true');
  if (params.comEmail) q.set('emails.ex', 'true');
  if (params.comTelefone) q.set('phones.ex', 'true');

  // Porte 1 = MEI. Excluir MEI → incluir apenas ME(1), EPP(3), Demais(5) — mas
  // a API só suporta include (size.id.in), não exclude. Então mandamos 3,5.
  // Ao excluir MEI perdemos MEIs reais, que é exatamente a intenção.
  if (params.excluirMEI) q.set('company.size.id.in', '3,5');

  if (params.capitalMin != null) q.set('company.equity.gte', String(params.capitalMin));
  if (params.capitalMax != null) q.set('company.equity.lte', String(params.capitalMax));

  return q;
}

function mapRecord(r: CnpjaRecord, fallbackCnae: string): EmpresaResult {
  const phone = r.phones?.[0];
  const email = r.emails?.[0];
  const endereco = [r.address.street, r.address.number].filter(Boolean).join(', ');

  return {
    cnpj: r.taxId,
    razao_social: r.company.name,
    nome_fantasia: r.alias || null,
    cnae_fiscal: String(r.mainActivity?.id || fallbackCnae),
    cnae_descricao: r.mainActivity?.text || null,
    uf: r.address.state,
    municipio: r.address.city || '',
    bairro: r.address.district,
    logradouro: r.address.street,
    numero: r.address.number,
    cep: r.address.zip,
    telefone: phone ? `(${phone.area}) ${phone.number}` : null,
    email: email?.address || null,
    porte: r.company.size?.text || null,
    data_abertura: r.founded,
    situacao: r.status.text,
    capital_social: r.company.equity,
  };
}

async function fetchPage(token: string, query: URLSearchParams): Promise<CnpjaPage> {
  const res = await fetch(`${CNPJA_BASE}/office?${query.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: token,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CNPJá ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function searchEmpresas(params: SearchParams): Promise<SearchResponse> {
  const token = process.env.CNPJA_TOKEN;
  if (!token) {
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      hasMore: false,
      error: 'CNPJA_TOKEN não configurado. Defina a variável no Easypanel.',
    };
  }

  try {
    const query = buildQuery(params, 100);
    const page = await fetchPage(token, query);

    const data = page.records.map((r) => mapRecord(r, params.cnae));
    return {
      success: true,
      data,
      total: page.count,
      page: 1,
      hasMore: Boolean(page.next),
    };
  } catch (error) {
    console.error('Erro CNPJá search:', error);
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Paginar até totalMax resultados (cap de segurança: 1000)
export async function searchEmpresasAll(
  params: SearchParams,
  totalMax = 1000,
): Promise<SearchResponse> {
  const token = process.env.CNPJA_TOKEN;
  if (!token) {
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      hasMore: false,
      error: 'CNPJA_TOKEN não configurado. Defina a variável no Easypanel.',
    };
  }

  const all: EmpresaResult[] = [];
  let nextToken: string | undefined;
  let total = 0;

  try {
    // Primeira página com filtros
    const firstQuery = buildQuery(params, 100);
    let page = await fetchPage(token, firstQuery);
    total = page.count;
    all.push(...page.records.map((r) => mapRecord(r, params.cnae)));
    nextToken = page.next;

    // Páginas seguintes: só `token` (mutuamente exclusivo com filtros)
    while (nextToken && all.length < totalMax) {
      const pageQuery = new URLSearchParams({ token: nextToken });
      page = await fetchPage(token, pageQuery);
      all.push(...page.records.map((r) => mapRecord(r, params.cnae)));
      nextToken = page.next;
      // Pequeno delay para respeitar rate limit do plano gratuito
      if (nextToken) await new Promise((r) => setTimeout(r, 500));
    }

    return {
      success: true,
      data: all.slice(0, totalMax),
      total,
      page: 1,
      hasMore: Boolean(nextToken) && all.length >= totalMax,
    };
  } catch (error) {
    console.error('Erro CNPJá searchAll:', error);
    // Se já coletamos algo antes do erro, devolve parcial como sucesso
    if (all.length > 0) {
      return {
        success: true,
        data: all,
        total: total || all.length,
        page: 1,
        hasMore: false,
      };
    }
    return {
      success: false,
      data: [],
      total: 0,
      page: 1,
      hasMore: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
