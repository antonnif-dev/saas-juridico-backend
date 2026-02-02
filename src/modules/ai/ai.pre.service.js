// src/modules/ai/ai.pre.service.js
const preatendimentoService = require('../preatendimento/preatendimento.service');
const preatendimentoRepository = require('../preatendimento/preatendimento.repository');

function safeText(v, max = 8000) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeDocs(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((d) => {
      if (typeof d === 'string') return d.trim();
      if (d && typeof d === 'object' && typeof d.nome === 'string') return d.nome.trim();
      return '';
    })
    .filter(Boolean);
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

module.exports = new AiPreService();