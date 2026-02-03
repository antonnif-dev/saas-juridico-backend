const aiAtendimentoService = require('../../modules/ai/ai.atendimento.service');
const caseService = require('../case/case.service');

// Helpers
function safeText(v, max = 8000) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeDocs(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((d) => {
      if (typeof d === 'string') return { nome: d.trim(), tipo: '', url: '' };
      if (d && typeof d === 'object') {
        return {
          nome: safeText(d.nome || d.name, 200),
          tipo: safeText(d.tipo || d.type, 60),
          url: safeText(d.url, 800),
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter((d) => d.nome);
}

function guessArea(snapshot) {
  const a = safeText(snapshot.area, 80).toLowerCase();
  const t = (safeText(snapshot.titulo, 400) + ' ' + safeText(snapshot.descricao, 2500)).toLowerCase();

  if (a.includes('trabalh') || t.includes('clt') || t.includes('fgts') || t.includes('demiss')) return 'Trabalhista';
  if (a.includes('fam') || t.includes('guarda') || t.includes('pensão') || t.includes('divórc')) return 'Família';
  if (a.includes('consum') || t.includes('produto') || t.includes('reembolso') || t.includes('cobrança')) return 'Consumidor';
  if (a.includes('civel') || a.includes('civil') || t.includes('contrato') || t.includes('inadimpl')) return 'Cível/Contratos';
  return snapshot.area || 'A confirmar';
}

function requiredDocsByArea(areaLabel) {
  const area = (areaLabel || '').toLowerCase();
  if (area.includes('trabalh')) {
    return [
      'RG e CPF',
      'Comprovante de Residência',
      'Carteira de Trabalho (CTPS)',
      'Holerites',
      'Extrato FGTS',
      'Comprovantes de jornada (ponto/escala)',
      'Conversas/Emails (se houver)',
    ];
  }
  if (area.includes('consum')) {
    return [
      'RG e CPF',
      'Comprovante de Residência',
      'Nota fiscal / comprovante de compra',
      'Contrato/termos (se houver)',
      'Protocolos de atendimento',
      'Prints/Conversas',
      'Faturas/Boletos (se houver)',
    ];
  }
  if (area.includes('fam')) {
    return [
      'RG e CPF',
      'Comprovante de Residência',
      'Certidões (nascimento/casamento)',
      'Provas (mensagens/fotos)',
      'Comprovantes de renda',
      'Documentos das partes',
    ];
  }
  return [
    'RG e CPF',
    'Comprovante de Residência',
    'Contrato/recibos (se houver)',
    'Provas (prints, fotos, mensagens)',
    'Comprovantes de pagamento',
  ];
}

// Etapas
function gerarEtapa1(snapshot) {
  const area = guessArea(snapshot);
  const required = requiredDocsByArea(area);

  const anexos = normalizeDocs(snapshot.documentos);
  const anexosLower = new Set(anexos.map((d) => d.nome.toLowerCase()));

  const lista = required.map((nome) => {
    const has = anexosLower.has(nome.toLowerCase());
    if (has) return { nome, status: 'ok' };

    // alguns docs essenciais viram "warning" quando pode ser substituído por equivalente
    if (nome.toLowerCase().includes('rg') || nome.toLowerCase().includes('cpf')) {
      return { nome, status: 'warning', obs: 'Pode estar anexado com nome diferente. Verificar anexos.' };
    }
    return { nome, status: 'missing', obs: 'Documento não localizado nos anexos do processo.' };
  });

  // Heurística de legibilidade/qualidade baseada em nomes
  for (const a of anexos) {
    const n = a.nome.toLowerCase();
    if (n.includes('foto') || n.includes('print') || n.includes('whatsapp')) {
      const idx = lista.findIndex((x) => x.nome.toLowerCase().includes('prints') || x.nome.toLowerCase().includes('conversas'));
      if (idx >= 0 && lista[idx].status === 'ok') {
        lista[idx] = { ...lista[idx], status: 'warning', obs: 'Verificar legibilidade e contexto completo (data/autor).' };
      }
    }
  }

  const faltando = lista.filter((x) => x.status === 'missing').length;
  const status = faltando > 0 ? 'Incompleto' : 'Completo';

  const narrativa = snapshot.descricao
    ? 'Narrativa presente. Conferir datas, nomes e sequência cronológica antes de avançar para a peça.'
    : 'Descrição do processo está vazia. Preencha os fatos (o que ocorreu, quando e consequências) para melhorar as próximas etapas.';

  return { titulo: 'Coleta de Documentos', status, lista, narrativa };
}

function gerarEtapa2(snapshot) {
  const area = guessArea(snapshot);
  const texto = (safeText(snapshot.titulo, 400) + ' ' + safeText(snapshot.descricao, 2500)).toLowerCase();

  let tipoAcao = 'A definir';
  let direitos = [];
  let tesePrincipal = 'A confirmar com base nos fatos.';
  let teseSecundaria = 'Opcional: definir após revisão das provas.';
  let estrategia = 'Complete fatos e anexos para sugestões mais específicas.';

  if (area.toLowerCase().includes('trabalh')) {
    tipoAcao = 'Reclamação Trabalhista - Rito a definir';
    direitos = ['Verbas rescisórias', 'FGTS', 'Horas extras (se aplicável)', 'Multas CLT (se cabível)'];
    tesePrincipal = 'Irregularidades no vínculo/jornada/verbas (conforme descrição e provas).';
    teseSecundaria = 'Dano moral por conduta reiterada (se houver base fática).';
    estrategia = 'Organizar cronologia (admissão→função→jornada→demissão) e separar prova documental e testemunhal.';
  } else if (area.toLowerCase().includes('consum')) {
    tipoAcao = 'Ação de Obrigação de Fazer/Indenização (CDC)';
    direitos = ['Reembolso/abatimento', 'Cumprimento forçado', 'Danos materiais', 'Danos morais (se cabível)'];
    tesePrincipal = 'Falha na prestação / defeito do produto/serviço.';
    teseSecundaria = 'Dano moral por desvio produtivo/abuso (se aplicável).';
    estrategia = 'Priorizar comprovantes, protocolos e tentativa de solução. Quantificar prejuízos.';
  } else if (area.toLowerCase().includes('fam')) {
    tipoAcao = 'Ação de Família (conforme objetivo)';
    direitos = ['Alimentos', 'Guarda', 'Visitas', 'Partilha (se cabível)'];
    tesePrincipal = 'Definir pedido principal conforme fatos (guarda/alimentos/divórcio).';
    teseSecundaria = 'Tutela provisória (se urgência).';
    estrategia = 'Checar documentos, avaliar urgência e preparar pedido provisório se necessário.';
  } else {
    tipoAcao = 'Ação Cível (conforme pedido)';
    direitos = ['Obrigação', 'Indenização', 'Cumprimento contratual (se cabível)'];
    tesePrincipal = 'Inadimplemento/descumprimento/lesão a direito (conforme fatos).';
    teseSecundaria = 'Danos morais/materiais (se quantificáveis).';
    estrategia = 'Mapear prova mínima, definir pedidos e estimar valor da causa.';
  }

  if (texto.includes('liminar') || texto.includes('urgente') || texto.includes('tutela')) {
    estrategia += ' Há sinais de urgência: avaliar tutela de urgência.';
  }

  return { titulo: 'Análise Jurídica', tipoAcao, direitos, tesePrincipal, teseSecundaria, estrategia };
}

function gerarEtapa3(snapshot, etapa2) {
  const area = guessArea(snapshot);

  const estrutura = [
    'Fatos',
    'Do direito',
    'Da competência',
    'Dos pedidos',
    'Das provas',
    'Do valor da causa',
    'Requerimentos finais',
  ];

  const fundamentos = [];
  if (area.toLowerCase().includes('trabalh')) fundamentos.push('CLT (dispositivos aplicáveis)', 'Súmulas/TST conforme tema');
  if (area.toLowerCase().includes('consum')) fundamentos.push('CDC (arts. aplicáveis)', 'Jurisprudência do tribunal competente');
  if (area.toLowerCase().includes('fam')) fundamentos.push('CC/Lei de Alimentos/ECA (conforme caso)');
  if (!fundamentos.length) fundamentos.push('Legislação aplicável', 'Precedentes do tribunal competente');

  const jurisprudencia = 'Sugestão: buscar precedentes do tribunal competente sobre o tema (não gerado automaticamente nesta versão).';

  // Valor da causa: não inventar número
  const valorCausa = 'A calcular: informar valores (prejuízo, salários, parcelas, pedidos).';

  return {
    titulo: 'Roteiro Jurídico',
    estrutura,
    fundamentos,
    jurisprudencia,
    valorCausa,
    // extras não usados pelo frontend, mas úteis p/ evoluir
    guia: {
      tipoAcao: etapa2.tipoAcao,
      estrategia: etapa2.estrategia,
    },
  };
}

function gerarEtapa4(snapshot, etapa2, etapa3) {
  const descricao = safeText(snapshot.descricao, 4000);

  const minuta =
`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)

I - DOS FATOS
${descricao || '[Descreva aqui os fatos com datas, locais, eventos e consequências.]'}

II - DO DIREITO
[Fundamentos sugeridos: ${etapa3.fundamentos.join('; ')}]

III - DOS PEDIDOS
[Pedidos conforme estratégia: ${safeText(etapa2.estrategia, 800)}]

IV - DAS PROVAS
[Relacionar documentos anexados e requerer provas necessárias.]

V - DO VALOR DA CAUSA
${etapa3.valorCausa}

Termos em que,
pede deferimento.`;

  return {
    titulo: 'Redação da Petição',
    minuta,
    tom: 'Objetivo e técnico',
  };
}

function gerarEtapa5(etapa4) {
  const t = safeText(etapa4.minuta, 20000);
  const faltas = [];
  if (t.includes('[Descreva aqui os fatos')) faltas.push('Fatos incompletos.');
  if (t.includes('[Pedidos conforme estratégia')) faltas.push('Pedidos não detalhados.');
  if (t.includes('[Relacionar documentos')) faltas.push('Provas/anexos não listados.');

  const coerencia = faltas.length === 0 ? 'Alta' : faltas.length <= 2 ? 'Média' : 'Baixa';

  return {
    titulo: 'Revisão e Padronização',
    ortografia: 'Verificação automática pendente (implementar).',
    coerencia,
    pedidos: faltas.some(f => f.toLowerCase().includes('pedidos'))
      ? 'Pedidos incompletos (preencher).'
      : 'Pedidos presentes (revisar).',
    resumoEquipe: faltas.length ? `Ajustes necessários: ${faltas.join(' ')}` : 'Petição com estrutura completa. Revisar detalhes e adequar ao caso.',
  };
}

function gerarEtapa6(snapshot) {
  const docs = normalizeDocs(snapshot.documentos);
  const temDescricao = !!safeText(snapshot.descricao, 50);
  const temDocs = docs.length > 0;

  const status = temDescricao && temDocs
    ? 'PRONTO PARA EXPORTAÇÃO (após revisão final)'
    : 'INCOMPLETO (faltam fatos/anexos)';

  return {
    titulo: 'Protocolo (Checklist)',
    anexos: temDocs ? `${docs.length} arquivo(s) anexado(s).` : 'Nenhum anexo encontrado.',
    timbre: 'Aplicar timbre na exportação (implementar).',
    links: 'Verificar URLs dos anexos (implementar).',
    status,
  };
}

class AiAtendimentoService {
  async executar({ processoId, user, persist = false }) {
    // Busca processo com permissão
    const processo = await caseService.getCaseById(processoId, user);
    if (!processo) return null;

    // Snapshot normalizado
    const snapshot = {
      id: processo.id || processoId,
      titulo: safeText(processo.titulo, 400),
      descricao: safeText(processo.descricao, 8000),
      area: safeText(processo.area, 80),
      status: safeText(processo.status, 80),
      urgencia: safeText(processo.urgencia, 40),
      numeroProcesso: safeText(processo.numeroProcesso, 80),
      documentos: Array.isArray(processo.documentos) ? processo.documentos : [],
      // se você tiver mais campos úteis, inclua aqui
    };

    const etapa1 = gerarEtapa1(snapshot);
    const etapa2 = gerarEtapa2(snapshot);
    const etapa3 = gerarEtapa3(snapshot, etapa2);
    const etapa4 = gerarEtapa4(snapshot, etapa2, etapa3);
    const etapa5 = gerarEtapa5(etapa4);
    const etapa6 = gerarEtapa6(snapshot);

    const result = { etapa1, etapa2, etapa3, etapa4, etapa5, etapa6 };

    if (persist) {
      // Opcional: salvar no documento do processo
      // Só faça isso se você tiver update e quiser armazenar histórico
      // await caseService.updateCase(processoId, { iaAtendimento: result }, user);
    }

    return result;
  }
}

module.exports = new AiAtendimentoService();