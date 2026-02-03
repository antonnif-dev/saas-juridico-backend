const preatendimentoService = require('../preatendimento/preatendimento.service');
const preatendimentoRepository = require('../preatendimento/preatendimento.repository');
const caseService = require('../case/case.service');

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
          url: safeText(d.url, 500),
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter(d => d.nome);
}

function pickRawNarrative(pre) {
  return (
    safeText(pre?.resumoProblema, 4000) ||
    safeText(pre?.mensagem, 4000) ||
    safeText(pre?.informacaoExtra, 4000) ||
    ''
  );
}

function toTitle(s) {
  const t = safeText(s, 140);
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function guessArea(pre) {
  const cat = safeText(pre?.categoria, 120).toLowerCase();
  const text = (safeText(pre?.resumoProblema, 2000) + ' ' + safeText(pre?.mensagem, 2000)).toLowerCase();

  // heurística simples (melhor que nada)
  if (cat.includes('trabalh') || text.includes('fgts') || text.includes('ctps') || text.includes('demissão')) return 'Trabalhista';
  if (cat.includes('fam') || text.includes('guarda') || text.includes('pensão') || text.includes('divórc')) return 'Família';
  if (cat.includes('consum') || text.includes('produto') || text.includes('defeito') || text.includes('reembolso') || text.includes('cobrança indevida')) return 'Consumidor';
  if (cat.includes('civel') || cat.includes('civil') || text.includes('contrato') || text.includes('inadimpl')) return 'Cível/Contratos';
  return toTitle(pre?.categoria) || 'A confirmar';
}

function guessArea(processo) {
  const area = safeText(processo.area, 80).toLowerCase();
  const texto = (safeText(processo.titulo, 300) + ' ' + safeText(processo.descricao, 2000)).toLowerCase();

  if (area.includes('trabalh') || texto.includes('clt') || texto.includes('fgts') || texto.includes('demiss')) return 'Trabalhista';
  if (area.includes('fam') || texto.includes('guarda') || texto.includes('pensão') || texto.includes('divórc')) return 'Família';
  if (area.includes('consum') || texto.includes('produto') || texto.includes('reembolso') || texto.includes('cobrança')) return 'Consumidor';
  if (area.includes('civel') || area.includes('civil') || texto.includes('contrato') || texto.includes('inadimpl')) return 'Cível/Contratos';
  return processo.area || 'A confirmar';
}

function docChecklistByArea(areaLabel) {
  const area = (areaLabel || '').toLowerCase();
  if (area.includes('trabalh')) {
    return ['RG e CPF', 'Comprovante de Residência', 'CTPS (todas as páginas do contrato)', 'Holerites', 'Extrato FGTS', 'Cartões de ponto', 'Conversas/Emails'];
  }
  if (area.includes('fam')) {
    return ['RG e CPF', 'Comprovante de Residência', 'Certidões (nascimento/casamento)', 'Comprovantes de renda', 'Provas (mensagens/fotos)', 'Documentos das partes'];
  }
  if (area.includes('consum')) {
    return ['RG e CPF', 'Comprovante de Residência', 'Nota fiscal/comprovante', 'Contrato/termos', 'Protocolos', 'Prints/Conversas', 'Faturas/Boletos'];
  }
  return ['RG e CPF', 'Comprovante de Residência', 'Contratos/recibos (se houver)', 'Provas (prints, fotos, mensagens)', 'Comprovantes de pagamento'];
}

function guessUrgency(pre) {
  const u = safeText(pre?.urgencia, 30).toLowerCase();
  if (u.includes('alta')) return { level: 'Alta', why: 'Usuário marcou urgência alta.' };
  if (u.includes('baixa')) return { level: 'Baixa', why: 'Usuário marcou urgência baixa.' };

  // heurística por palavras-chave
  const t = (safeText(pre?.resumoProblema, 2000) + ' ' + safeText(pre?.mensagem, 2000)).toLowerCase();
  if (t.includes('liminar') || t.includes('ameaça') || t.includes('bloqueio') || t.includes('despejo') || t.includes('prisão') || t.includes('medida protetiva')) {
    return { level: 'Alta', why: 'Texto contém indícios de urgência (liminar/risco imediato).' };
  }
  return { level: 'Média', why: 'Sem indício forte de urgência além do padrão.' };
}

function buildStructuredResumo(pre) {
  const area = guessArea(pre);
  const objetivo = safeText(pre?.objetivo, 500);
  const tipoRelacao = safeText(pre?.tipoRelacao, 200);
  const parteContraria = safeText(pre?.parteContrariaNome, 200);
  const dataProblema = safeText(pre?.dataProblema, 80);
  const continuo = pre?.problemaContinuo ? 'Sim' : 'Não';
  const narrativa = pickRawNarrative(pre);

  const docsEnviados = normalizeDocs(pre?.documentos);

  const linhas = [];
  linhas.push(`**Área provável:** ${area}`);
  if (tipoRelacao) linhas.push(`**Relação:** ${tipoRelacao}`);
  if (parteContraria) linhas.push(`**Parte contrária:** ${parteContraria}`);
  if (dataProblema) linhas.push(`**Quando começou:** ${dataProblema}`);
  linhas.push(`**Problema contínuo:** ${continuo}`);
  if (objetivo) linhas.push(`**Objetivo do cliente:** ${objetivo}`);
  linhas.push('');
  linhas.push('**Fatos (texto base):**');
  linhas.push(narrativa ? narrativa : '[Sem narrativa registrada]');
  linhas.push('');
  linhas.push(`**Documentos enviados:** ${docsEnviados.length ? docsEnviados.join(', ') : 'Nenhum'}`);

  // lacunas: perguntas
  const lacunas = [];
  if (!dataProblema) lacunas.push('Qual a data aproximada do fato/início?');
  if (!objetivo) lacunas.push('O que exatamente o cliente quer obter (pedido final)?');
  if (!tipoRelacao) lacunas.push('Qual a relação entre as partes (contrato, emprego, consumo, família etc.)?');
  if (!parteContraria) lacunas.push('Quem é a parte contrária (nome/empresa/CPF-CNPJ se possível)?');
  if (!docsEnviados.length) lacunas.push('Quais documentos/provas existem (contrato, comprovantes, prints)?');

  linhas.push('');
  linhas.push('**Lacunas / Perguntas essenciais:**');
  linhas.push(lacunas.length ? `- ${lacunas.join('\n- ')}` : '- Sem lacunas críticas detectadas.');

  return linhas.join('\n');
}

function buildEtapa1(processo, docsNorm) {
  const area = guessArea(processo);
  const required = docChecklistByArea(area);

  const docsLower = new Set(docsNorm.map(d => d.nome.toLowerCase()));
  const lista = required.map((nome) => {
    const has = docsLower.has(nome.toLowerCase());
    return has
      ? { nome, status: 'ok' }
      : { nome, status: 'missing', obs: 'Documento não encontrado nos anexos do processo.' };
  });

  for (const d of docsNorm) {
    const n = d.nome.toLowerCase();
    if (n.includes('foto') || n.includes('whatsapp') || n.includes('print')) {
      const idx = lista.findIndex(x => x.nome.toLowerCase().includes('print'));
      if (idx >= 0 && lista[idx].status === 'ok') {
        lista[idx] = { ...lista[idx], status: 'warning', obs: 'Verificar legibilidade/inteireza das capturas.' };
      }
    }
  }

  function buildEtapa2(processo) {
    const area = guessArea(processo);
    const texto = (safeText(processo.titulo, 400) + ' ' + safeText(processo.descricao, 2000)).toLowerCase();

    // Heurística inicial por área
    let tipoAcao = 'A definir';
    let tesePrincipal = 'A confirmar com base nos fatos.';
    let estrategia = 'Completar fatos e anexos para sugerir estratégia.';
    let direitos = [];

    if (area.toLowerCase().includes('trabalh')) {
      tipoAcao = 'Reclamação Trabalhista';
      tesePrincipal = 'Reconhecimento/regularização de vínculo e verbas rescisórias (conforme fatos).';
      estrategia = 'Organizar cronologia (admissão, função, jornada, demissão) e separar prova documental + testemunhal.';
      direitos = ['Verbas rescisórias', 'FGTS', 'Horas extras (se aplicável)', 'Multas CLT (se aplicável)'];
    } else if (area.toLowerCase().includes('consum')) {
      tipoAcao = 'Ação de Obrigação/Indenização (Consumidor)';
      tesePrincipal = 'Falha na prestação/defeito e reparação (conforme fatos).';
      estrategia = 'Priorizar provas: comprovante de compra, protocolos e tentativa de solução; avaliar dano material/moral.';
      direitos = ['Reembolso/abatimento', 'Cumprimento forçado', 'Danos materiais', 'Danos morais (se cabível)'];
    } else if (area.toLowerCase().includes('fam')) {
      tipoAcao = 'Ação de Família (conforme objetivo)';
      tesePrincipal = 'A definir conforme pedido (guarda, alimentos, visitas, divórcio).';
      estrategia = 'Coletar documentos e avaliar urgência (medidas provisórias).';
      direitos = ['Alimentos', 'Guarda', 'Regulamentação de visitas', 'Partilha (se cabível)'];
    }

    // Ajuste por palavras-chave
    if (texto.includes('liminar') || texto.includes('urgente')) {
      estrategia += ' Há indícios de urgência: avaliar pedido de tutela de urgência.';
    }

    return {
      titulo: 'Análise Jurídica',
      tipoAcao,
      direitos,
      tesePrincipal,
      teseSecundaria: 'Opcional: avaliar tese subsidiária após revisão das provas.',
      estrategia,
    };
  }

  function buildEtapa3(processo) {
    const area = guessArea(processo);
    // Roteiro/estrutura base, sem inventar jurisprudência específica (evito alucinar)
    const estrutura = ['Fatos', 'Do direito (fundamentos)', 'Dos pedidos', 'Provas', 'Valor da causa', 'Requerimentos finais'];

    const fundamentos = [];
    if (area.toLowerCase().includes('trabalh')) fundamentos.push('CLT (dispositivos aplicáveis)', 'Súmulas/TST conforme tema');
    if (area.toLowerCase().includes('consum')) fundamentos.push('CDC (arts. aplicáveis)', 'Jurisprudência do tribunal competente');
    if (!fundamentos.length) fundamentos.push('Legislação aplicável ao caso', 'Precedentes do tribunal competente');

    // Valor da causa: apenas sugestão de cálculo/inputs
    const valorCausa = 'A calcular (informar valores: salários, prejuízos, pedidos).';

    return {
      titulo: 'Roteiro Jurídico',
      estrutura,
      fundamentos,
      jurisprudencia: 'Sugestão: buscar precedentes do tribunal competente sobre o tema (não gerado automaticamente nesta versão).',
      valorCausa,
    };
  }

  function buildEtapa4(processo, etapa2, etapa3) {
    const area = guessArea(processo);

    const minuta =
      `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO/DO TRABALHO

I - DOS FATOS
${processo.descricao ? safeText(processo.descricao, 2500) : '[Descreva aqui os fatos com datas, locais e consequências.]'}

II - DO DIREITO
[Inserir fundamentos jurídicos aplicáveis ao caso: ${etapa3.fundamentos.join(', ')}]

III - DOS PEDIDOS
[Liste pedidos principais e subsidiários, conforme a estratégia: ${safeText(etapa2.estrategia, 600)}]

IV - DAS PROVAS
[Relacione documentos anexados e requerimentos de prova testemunhal/pericial, se cabível.]

V - DO VALOR DA CAUSA
${etapa3.valorCausa}

Termos em que, pede deferimento.`;

    return {
      titulo: 'Redação da Petição',
      minuta,
      tom: area.toLowerCase().includes('trabalh') ? 'Objetivo e técnico' : 'Objetivo e claro',
    };
  }

  function buildEtapa5(etapa4) {
    // Qualidade: heurística simples
    const texto = safeText(etapa4.minuta, 20000);
    const temFatos = texto.includes('DOS FATOS') && !texto.includes('[Descreva aqui os fatos');
    const temPedidos = texto.includes('DOS PEDIDOS') && !texto.includes('[Liste pedidos');

    return {
      titulo: 'Revisão e Padronização',
      ortografia: 'Verificação automática pendente (implementar).',
      coerencia: temFatos && temPedidos ? 'Alta (estrutura completa)' : 'Média (faltam campos)',
      pedidos: temPedidos ? 'Pedidos presentes (revisar detalhamento).' : 'Pedidos incompletos (preencher).',
      resumoEquipe: 'Revisar campos em aberto, validar estratégia e ajustar pedidos/valor da causa.',
    };
  }

  function buildEtapa6(processo, docsNorm) {
    const pronto = processo.descricao && docsNorm.length > 0;
    return {
      titulo: 'Protocolo (Checklist)',
      anexos: pronto ? `${docsNorm.length} arquivo(s) anexado(s) no processo.` : 'Sem anexos suficientes para protocolo.',
      timbre: 'Aplicar timbre na exportação (implementação futura).',
      links: 'Revisar URLs dos anexos e integridade (implementação futura).',
      status: pronto ? 'PRONTO PARA EXPORTAÇÃO (após revisão final)' : 'INCOMPLETO (faltam fatos/anexos)',
    };
  }

  const narrativa = processo.descricao
    ? 'Narrativa presente. Conferir datas, nomes e sequência cronológica antes da peça.'
    : 'Descrição está vazia. Preencha os fatos (o que ocorreu, quando, onde e consequências) para a IA produzir etapas 2–4 corretamente.';

  return {
    titulo: 'Coleta de Documentos',
    status: lista.some(x => x.status !== 'ok') ? 'Incompleto' : 'Completo',
    lista,
    narrativa,
  };
}

function suggestDocuments(pre) {
  const area = guessArea(pre).toLowerCase();
  const docsEnviados = new Set(normalizeDocs(pre?.documentos).map(d => d.toLowerCase()));

  const packs = [];

  // cada item: { item, prioridade, motivo }
  const add = (item, prioridade, motivo) => {
    if (!item) return;
    if (docsEnviados.has(item.toLowerCase())) return;
    packs.push({ item, prioridade, motivo });
  };

  // gerais
  add('Documento de identidade (RG/CNH)', 'essencial', 'Identificação do cliente');
  add('CPF', 'essencial', 'Identificação do cliente');
  add('Comprovante de residência', 'recomendado', 'Competência/qualificação');

  if (area.includes('trabalh')) {
    add('CTPS', 'essencial', 'Vínculo e histórico');
    add('Holerites', 'essencial', 'Prova de remuneração');
    add('Extrato FGTS', 'recomendado', 'Verificar depósitos');
    add('Cartões de ponto / controle de jornada', 'recomendado', 'Horas extras');
    add('Conversas/Emails/Comunicados', 'recomendado', 'Prova de fatos');
  } else if (area.includes('fam')) {
    add('Certidões (nascimento/casamento)', 'essencial', 'Vínculo familiar');
    add('Provas (mensagens/fotos)', 'recomendado', 'Contexto e fatos');
    add('Comprovantes de renda', 'recomendado', 'Pensão/alimentos');
  } else if (area.includes('consum')) {
    add('Nota fiscal / comprovante de compra', 'essencial', 'Relação de consumo');
    add('Contrato/termos de serviço', 'recomendado', 'Cláusulas e obrigações');
    add('Protocolos de atendimento', 'recomendado', 'Tentativas de solução');
    add('Prints/Conversas', 'recomendado', 'Prova de contato');
    add('Faturas/Boletos', 'recomendado', 'Cobranças');
  } else if (area.includes('cível') || area.includes('civil') || area.includes('contrat')) {
    add('Contrato', 'essencial', 'Base da obrigação');
    add('Comprovantes de pagamento', 'essencial', 'Adimplemento/inadimplemento');
    add('Notificações (se houver)', 'recomendado', 'Constituição em mora');
    add('Conversas/Emails', 'recomendado', 'Negociação e fatos');
  } else {
    add('Contrato (se existir)', 'recomendado', 'Base da relação');
    add('Comprovantes do fato (prints, fotos, recibos)', 'recomendado', 'Provas iniciais');
  }

  // entrega como string[] para sua UI (mas mantendo prioridade no texto)
  const out = packs.map(p => `${p.prioridade.toUpperCase()}: ${p.item} — ${p.motivo}`);
  return out.length ? out : ['Sem sugestões adicionais (dados insuficientes).'];
}

function buildTriagemText(pre) {
  const area = guessArea(pre);
  const urg = guessUrgency(pre);

  const objetivo = safeText(pre?.objetivo, 500);
  const dataProblema = safeText(pre?.dataProblema, 80);
  const tipoRelacao = safeText(pre?.tipoRelacao, 200);

  const riscos = [];
  if (!dataProblema) riscos.push('Data do fato não informada (pode impactar prazos).');
  if (!objetivo) riscos.push('Objetivo do cliente não definido (pode gerar desalinhamento).');
  if (!tipoRelacao) riscos.push('Relação entre as partes não esclarecida (define tese/competência).');

  const perguntas = [];
  perguntas.push('Qual a data aproximada do início/fato principal?');
  perguntas.push('Existe contrato, comprovante, nota fiscal ou documento-chave?');
  perguntas.push('Houve tentativa de acordo/atendimento/protocolo?');
  perguntas.push('Quais prejuízos concretos (valores, danos, consequências)?');
  perguntas.push('Qual resultado esperado (pedido final)?');

  const linhas = [];
  linhas.push(`**Área provável:** ${area}`);
  linhas.push(`**Urgência sugerida:** ${urg.level} (${urg.why})`);
  linhas.push('');
  linhas.push('**Riscos / pontos críticos:**');
  linhas.push(riscos.length ? `- ${riscos.join('\n- ')}` : '- Nenhum risco crítico óbvio (a confirmar).');
  linhas.push('');
  linhas.push('**Perguntas para completar a triagem:**');
  linhas.push(`- ${perguntas.join('\n- ')}`);

  return linhas.join('\n');
}

function buildParecer(pre) {
  const area = guessArea(pre);
  const urg = guessUrgency(pre);
  const docsEnviados = normalizeDocs(pre?.documentos);

  const passos = [];
  passos.push('Confirmar dados básicos (datas, partes, objetivo).');
  passos.push('Coletar documentos essenciais e organizar em pasta do caso.');
  passos.push('Avaliar viabilidade: prova mínima, riscos e estratégia (acordo vs ação).');
  if (urg.level === 'Alta') passos.push('Priorizar atendimento imediato e checar medidas urgentes (liminar).');

  const linhas = [];
  linhas.push(`**Parecer inicial (operacional):**`);
  linhas.push(`Área provável: ${area}. Urgência: ${urg.level}.`);
  linhas.push('');
  linhas.push('**Próximos passos recomendados:**');
  linhas.push(`- ${passos.join('\n- ')}`);
  linhas.push('');
  linhas.push(`**Situação documental atual:** ${docsEnviados.length ? 'há documentos anexados' : 'sem documentos anexados'}.`);
  linhas.push('Observação: esta análise é preliminar e depende da confirmação das informações acima.');

  return linhas.join('\n');
}

class AiPreService {
  async triagem({ leadId, persist = false, user = null }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;

    // Agora “Resumo Estruturado” é realmente estruturado:
    const resumo = buildStructuredResumo(pre);

    // “Triagem” vira checklist real de perguntas + riscos
    const triagem = buildTriagemText(pre);

    // “Documentos” vira lista priorizada e considerando docs já enviados
    const documentos = suggestDocuments(pre);

    // “Parecer” vira próximos passos operacionais
    const parecer = buildParecer(pre);

    if (persist) {
      await preatendimentoRepository.update(
        leadId,
        {
          triagem: {
            resumo,
            triagem,
            documentos,
            parecer,
          },
        },
        user
      );
    }

    return { resumo, triagem, documentos, parecer };
  }

  // Você ainda pode evoluir draft/report depois
  async draft({ leadId, type }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;
    return {
      titulo: `Minuta (${type || 'modelo'})`,
      conteudo: `Resumo estruturado:\n${buildStructuredResumo(pre)}\n\n[Minuta a evoluir]`,
    };
  }

  async report({ leadId, type }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;
    return {
      type: type || 'json',
      resumo: buildStructuredResumo(pre),
      triagem: buildTriagemText(pre),
      documentos: suggestDocuments(pre),
      parecer: buildParecer(pre),
      note: 'Relatório inicial. Você pode gerar PDF depois.',
    };
  }
}

class AiAtendimentoService {
  async executar({ processoId, user, persist = false }) {
    const processo = await caseService.getCaseById(processoId, user);
    if (!processo) return null;

    const docsNorm = normalizeDocs(processo.documentos);

    const etapa1 = buildEtapa1(processo, docsNorm);
    const etapa2 = buildEtapa2(processo);
    const etapa3 = buildEtapa3(processo);
    const etapa4 = buildEtapa4(processo, etapa2, etapa3);
    const etapa5 = buildEtapa5(etapa4);
    const etapa6 = buildEtapa6(processo, docsNorm);

    const result = { etapa1, etapa2, etapa3, etapa4, etapa5, etapa6 };

    if (persist) {
    }

    return result;
  }
}

module.exports = new AiAtendimentoService();