'use client';

import { useState, useCallback } from 'react';
import {
  Search, Download, Building2, Filter, X,
  RefreshCw, CheckCircle, Users, FileSpreadsheet, Sparkles, Loader2
} from 'lucide-react';
import { ESTADOS_BR, formatarCNPJ } from '@/lib/utils';

// CNAE fixo: Escolas de Idiomas
const CNAE_ESCOLAS_IDIOMAS = '8593700';

interface Empresa {
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
  socios?: Array<{ nome: string; qualificacao: string | null }>;
  enriched?: boolean;
}

interface SearchResult {
  success: boolean;
  data: Empresa[];
  total: number;
  page: number;
  hasMore: boolean;
}

type Tab = 'busca' | 'leads';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('busca');

  // Filtros
  const [uf, setUf] = useState('');
  const [apenasMatriz, setApenasMatriz] = useState(false);
  const [comEmail, setComEmail] = useState(false);
  const [comTelefone, setComTelefone] = useState(false);
  const [excluirMEI, setExcluirMEI] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Resultados
  const [results, setResults] = useState<Empresa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Seleção
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Loading states
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });

  // Mensagens
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Leads salvos
  const [leads, setLeads] = useState<Empresa[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);

  // ========== BUSCA ==========
  const search = useCallback(async (pageNum = 1, append = false) => {
    setIsSearching(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        cnae: CNAE_ESCOLAS_IDIOMAS,
        situacao: 'ATIVA',
        page: String(pageNum),
      });

      if (uf) params.set('uf', uf);
      if (apenasMatriz) params.set('apenas_matriz', 'true');
      if (comEmail) params.set('com_email', 'true');
      if (comTelefone) params.set('com_telefone', 'true');
      if (excluirMEI) params.set('excluir_mei', 'true');

      const res = await fetch(`/api/search?${params}`);
      const data: SearchResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error('Erro ao conectar com a API');
      }

      if (append) {
        setResults(prev => [...prev, ...data.data]);
      } else {
        setResults(data.data);
        setSelected(new Set());
      }

      setTotal(data.total);
      setPage(pageNum);
      setHasMore(data.hasMore);

      if (data.data.length === 0 && pageNum === 1) {
        setError('Nenhuma escola de idiomas encontrada neste estado.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na busca');
    } finally {
      setIsSearching(false);
    }
  }, [uf, apenasMatriz, comEmail, comTelefone, excluirMEI]);

  // ========== ENRIQUECIMENTO ==========
  const enrichSelected = useCallback(async () => {
    const toEnrich = selected.size > 0
      ? results.filter(e => selected.has(e.cnpj) && !e.enriched)
      : results.filter(e => !e.enriched);

    if (toEnrich.length === 0) {
      setError('Nenhuma empresa para enriquecer');
      return;
    }

    setIsEnriching(true);
    setEnrichProgress({ done: 0, total: toEnrich.length });
    setError(null);

    try {
      const enriched: Empresa[] = [...results];

      for (let i = 0; i < toEnrich.length; i++) {
        const emp = toEnrich[i];
        setEnrichProgress({ done: i + 1, total: toEnrich.length });

        try {
          const res = await fetch('/api/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: emp.cnpj }),
          });

          if (res.ok) {
            const data = await res.json();
            const idx = enriched.findIndex(e => e.cnpj === emp.cnpj);
            if (idx !== -1) {
              enriched[idx] = {
                ...enriched[idx],
                telefone: data.telefone || enriched[idx].telefone,
                email: data.email || enriched[idx].email,
                socios: data.socios,
                enriched: true,
              };
            }
          }
        } catch {
          // Continua mesmo se falhar um
        }

        // Delay entre requests
        if (i < toEnrich.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }

      setResults(enriched);
      setSuccess(`${toEnrich.length} empresas enriquecidas!`);

    } catch (err) {
      setError('Erro ao enriquecer');
    } finally {
      setIsEnriching(false);
    }
  }, [results, selected]);

  // ========== SALVAR LEADS ==========
  const saveAsLeads = useCallback(async () => {
    const toSave = selected.size > 0
      ? results.filter(e => selected.has(e.cnpj))
      : results;

    if (toSave.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresas: toSave }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`${data.criados} leads salvos! (${data.duplicados} já existiam)`);
      setSelected(new Set());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, [results, selected]);

  // ========== EXPORTAR ==========
  const exportResults = useCallback(async (format: 'csv' | 'xlsx') => {
    const toExport = selected.size > 0
      ? results.filter(e => selected.has(e.cnpj))
      : results;

    if (toExport.length === 0) return;

    setIsExporting(true);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresas: toExport, format }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospeccao_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

    } catch {
      setError('Erro ao exportar');
    } finally {
      setIsExporting(false);
    }
  }, [results, selected]);

  // ========== CARREGAR LEADS ==========
  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads?page_size=100');
      const data = await res.json();
      setLeads(data.data || []);
      setLeadsTotal(data.total || 0);
    } catch {
      // Ignora erro
    }
  }, []);

  // ========== SELEÇÃO ==========
  const toggleSelect = (cnpj: string) => {
    const newSet = new Set(selected);
    if (newSet.has(cnpj)) newSet.delete(cnpj);
    else newSet.add(cnpj);
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(e => e.cnpj)));
    }
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Prospecção de Escolas de Idiomas</h1>
                <p className="text-sm text-gray-500">Busque escolas de idiomas e exporte com contatos</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'busca'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('busca')}
              >
                <Search className="h-4 w-4 inline mr-2" />
                Buscar
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'leads'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => { setActiveTab('leads'); loadLeads(); }}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Leads Salvos
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mensagens */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <X className="h-5 w-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {activeTab === 'busca' && (
          <>
            {/* Formulário de Busca */}
            <div className="card p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Estado</label>
                  <select className="select" value={uf} onChange={e => setUf(e.target.value)}>
                    <option value="">Todos os estados</option>
                    {ESTADOS_BR.map(e => (
                      <option key={e.sigla} value={e.sigla}>{e.sigla} - {e.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    className="btn-primary flex items-center gap-2 w-full justify-center"
                    onClick={() => search(1)}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isSearching ? 'Buscando...' : 'Buscar Escolas de Idiomas'}
                  </button>
                </div>
              </div>

              {/* Filtros avançados */}
              <div className="mb-4">
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Ocultar filtros' : 'Mais filtros'}
                </button>

                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={apenasMatriz}
                        onChange={e => setApenasMatriz(e.target.checked)}
                      />
                      <span className="text-sm">Apenas matrizes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={comEmail}
                        onChange={e => setComEmail(e.target.checked)}
                      />
                      <span className="text-sm">Com email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={comTelefone}
                        onChange={e => setComTelefone(e.target.checked)}
                      />
                      <span className="text-sm">Com telefone</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={excluirMEI}
                        onChange={e => setExcluirMEI(e.target.checked)}
                      />
                      <span className="text-sm">Excluir MEI</span>
                    </label>
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <p className="text-sm text-gray-500">
                  {results.length} de ~{total} escolas encontradas
                </p>
              )}
            </div>

            {/* Resultados */}
            {results.length > 0 && (
              <div className="card overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                        checked={selected.size === results.length && results.length > 0}
                        onChange={toggleSelectAll}
                      />
                      <span className="text-sm text-gray-700">
                        {selected.size > 0 ? `${selected.size} selecionadas` : 'Selecionar todas'}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Enriquecer */}
                    <button
                      className="btn-secondary btn-sm flex items-center gap-1"
                      onClick={enrichSelected}
                      disabled={isEnriching}
                    >
                      {isEnriching ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {enrichProgress.done}/{enrichProgress.total}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Enriquecer
                        </>
                      )}
                    </button>

                    {/* Salvar leads */}
                    <button
                      className="btn-success btn-sm flex items-center gap-1"
                      onClick={saveAsLeads}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Salvar Leads
                    </button>

                    {/* Exportar */}
                    <button
                      className="btn-secondary btn-sm flex items-center gap-1"
                      onClick={() => exportResults('xlsx')}
                      disabled={isExporting}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </button>
                    <button
                      className="btn-secondary btn-sm flex items-center gap-1"
                      onClick={() => exportResults('csv')}
                      disabled={isExporting}
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  </div>
                </div>

                {/* Tabela */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-4 py-3"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sócios</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map(emp => (
                        <tr key={emp.cnpj} className={`hover:bg-gray-50 ${emp.enriched ? 'bg-green-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600"
                              checked={selected.has(emp.cnpj)}
                              onChange={() => toggleSelect(emp.cnpj)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{emp.razao_social}</div>
                            {emp.nome_fantasia && (
                              <div className="text-sm text-gray-500">{emp.nome_fantasia}</div>
                            )}
                            <div className="text-xs text-gray-400 font-mono">{formatarCNPJ(emp.cnpj)}</div>
                            {emp.enriched && <span className="badge-green text-xs mt-1">Enriquecido</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{emp.municipio}/{emp.uf}</div>
                            {emp.bairro && <div className="text-xs text-gray-500">{emp.bairro}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {emp.telefone && <div className="text-sm text-gray-900">{emp.telefone}</div>}
                            {emp.email && (
                              <div className="text-xs text-blue-600 truncate max-w-[200px]">
                                <a href={`mailto:${emp.email}`}>{emp.email}</a>
                              </div>
                            )}
                            {!emp.telefone && !emp.email && <span className="text-xs text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3">
                            {emp.socios && emp.socios.length > 0 ? (
                              <div className="text-sm">
                                {emp.socios.slice(0, 2).map((s, i) => (
                                  <div key={i} className="text-gray-900">
                                    {s.nome}
                                    {s.qualificacao && (
                                      <span className="text-xs text-gray-500 ml-1">({s.qualificacao})</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Carregar mais */}
                {hasMore && (
                  <div className="p-4 border-t border-gray-200 text-center">
                    <button
                      className="btn-secondary"
                      onClick={() => search(page + 1, true)}
                      disabled={isSearching}
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Carregar mais
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'leads' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Leads Salvos ({leadsTotal})</h2>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = '/api/export?format=xlsx';
                  a.download = `leads_${Date.now()}.xlsx`;
                  a.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Todos
              </button>
            </div>

            {leads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sócio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead: Record<string, unknown>) => (
                      <tr key={lead.id as number} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{lead.razao_social as string || '-'}</div>
                          <div className="text-xs text-gray-400 font-mono">{formatarCNPJ(lead.cnpj as string)}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {lead.cidade || '-'}/{lead.uf || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {lead.telefone && <div className="text-sm">{lead.telefone as string}</div>}
                          {lead.email && <div className="text-xs text-blue-600">{lead.email as string}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{lead.nome_socio_1 as string || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`badge-${lead.status === 'novo' ? 'blue' : lead.status === 'qualificado' ? 'green' : 'gray'}`}>
                            {lead.status as string}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum lead salvo ainda</p>
                <p className="text-sm text-gray-400 mt-1">Faça uma busca e salve empresas como leads</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
