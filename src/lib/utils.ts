// Formatação de CNPJ
export function formatarCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return cnpj;
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// Formatação de valores
export function formatarMoeda(valor: number | null): string {
  if (valor === null || valor === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// CNAEs populares para prospecção
export const CNAES_POPULARES = [
  { codigo: '8593700', descricao: 'Ensino de idiomas', nicho: 'Escolas de idiomas' },
  { codigo: '9313100', descricao: 'Condicionamento físico', nicho: 'Academias' },
  { codigo: '8630502', descricao: 'Atividade médica ambulatorial', nicho: 'Clínicas médicas' },
  { codigo: '8630504', descricao: 'Atividade odontológica', nicho: 'Dentistas' },
  { codigo: '8650004', descricao: 'Fisioterapia', nicho: 'Fisioterapeutas' },
  { codigo: '8650003', descricao: 'Psicologia e psicanálise', nicho: 'Psicólogos' },
  { codigo: '8650002', descricao: 'Atividades de nutrição', nicho: 'Nutricionistas' },
  { codigo: '5611201', descricao: 'Restaurantes e similares', nicho: 'Restaurantes' },
  { codigo: '5611203', descricao: 'Lanchonetes e casas de sucos', nicho: 'Lanchonetes' },
  { codigo: '6920601', descricao: 'Atividades de contabilidade', nicho: 'Contabilidade' },
  { codigo: '6920602', descricao: 'Assessoria e consultoria contábil', nicho: 'Assessoria contábil' },
  { codigo: '7311400', descricao: 'Agências de publicidade', nicho: 'Agências de marketing' },
  { codigo: '7319002', descricao: 'Promoção de vendas', nicho: 'Promoção/Eventos' },
  { codigo: '9602501', descricao: 'Cabeleireiros', nicho: 'Salões de beleza' },
  { codigo: '9602502', descricao: 'Estética e beleza', nicho: 'Estética' },
  { codigo: '6201501', descricao: 'Desenvolvimento de software', nicho: 'Software houses' },
  { codigo: '6202300', descricao: 'Desenvolvimento de software customizado', nicho: 'Desenvolvimento' },
  { codigo: '6209100', descricao: 'Suporte técnico em TI', nicho: 'Suporte de TI' },
  { codigo: '7020400', descricao: 'Consultoria em gestão', nicho: 'Consultorias' },
  { codigo: '8599604', descricao: 'Treinamento profissional', nicho: 'Treinamentos' },
  { codigo: '4781400', descricao: 'Comércio de vestuário', nicho: 'Lojas de roupa' },
  { codigo: '4771701', descricao: 'Comércio de farmacêuticos', nicho: 'Farmácias' },
  { codigo: '4744099', descricao: 'Comércio de materiais de construção', nicho: 'Material de construção' },
  { codigo: '4530703', descricao: 'Comércio de peças automotivas', nicho: 'Autopeças' },
  { codigo: '6110801', descricao: 'Provedores de internet', nicho: 'Provedores de internet' },
];

// Estados brasileiros
export const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];
