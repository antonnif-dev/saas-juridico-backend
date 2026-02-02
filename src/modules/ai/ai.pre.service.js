// src/modules/ai/ai.pre.service.js
const preatendimentoService = require('../preatendimento/preatendimento.service');
const preatendimentoRepository = require('../preatendimento/preatendimento.repository');

function safeText(v, max = 5000) {
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

function pickResumo(pre) {
  return (
    safeText(pre?.resumoProblema, 1200) ||
    safeText(pre?.mensagem, 1200) ||
    safeText(pre?.informacaoExtra, 1200) ||
    'Sem descrição informada.'
  );
}

function buildTriagem(pre) {
  const categoria = safeText(pre?.categoria, 120);
  const urgencia = safeText(pre?.urgencia, 40) || 'Média';
  const objetivo = safeText(pre?.objetivo, 300);
  const tipoRelacao = safeText(pre?.tipoRelacao, 120);
  const dataProblema = safeText(pre?.dataProblema, 60);
  const problemaContinuo = !!pre?.problemaContinuo;

  const pontos = [];
  if (!categoria) pontos.push('Categoria não informada.');
  if (!objetivo) pontos.push('Objetivo do cliente não informado.');
  if (!tipoRelacao) pontos.push('Tipo de relação não informado.');
  if (!dataProblema) pontos.push('Data do fato não informada (atenção a prazos).');
  if (problemaContinuo) pontos.push('Indicação de problema contínuo.');

  const pri =
    urgencia.toLowerCase().includes('alta') ? 'Alta' :
    urgencia.toLowerCase().includes('baixa') ? 'Baixa' :
    'Média';

  const header = `Categoria: ${categoria || 'Não informado'} | Urgência: ${urgencia} | Prioridade sugerida: ${pri}.`;

  if (!pontos.length) {
    return `${header}\nInformações mínimas parecem suficientes para avançar para coleta documental e definição de estratégia.`;
  }

  return `${header}\nPontos a confirmar:\n- ${pontos.join('\n- ')}`;
}

function suggestDocs(pre) {
  const categoria = safeText(pre?.categoria, 120).toLowerCase();
  const docs = new Set();

  if (categoria.includes('trabalh')) {
    ['CTPS', 'Holerites', 'Extrato FGTS', 'Comprovantes de ponto', 'Conversas/Emails'].forEach(d => docs.add(d));
  } else if (categoria.includes('fam')) {
    ['Certidões (nascimento/casamento)', 'Comprovante de residência', 'Provas (mensagens/fotos)', 'Documentos das partes'].forEach(d => docs.add(d));
  } else if (categoria.includes('consum')) {
    ['Contrato/Comprovante de compra', 'Nota fiscal', 'Protocolos de atendimento', 'Prints/Conversas'].forEach(d => docs.add(d));
  } else if (categoria.includes('civel') || categoria.includes('civil')) {
    ['Contratos', 'Comprovantes de pagamento', 'Notificações', 'Conversas/Emails'].forEach(d => docs.add(d));
  } else {
    ['Documentos pessoais', 'Comprovantes relacionados ao fato', 'Conversas/Emails/Prints', 'Contratos (se houver)'].forEach(d => docs.add(d));
  }

  return Array.from(docs);
}

function buildParecer(pre) {
  const urgencia = safeText(pre?.urgencia, 40) || 'Média';
  const resumo = pickResumo(pre);

  return (
    `Parecer inicial (regras):\n` +
    `Com base no relato, recomenda-se confirmar datas e objetivo, coletar os documentos essenciais e avaliar riscos/prazos. ` +
    `Urgência indicada: ${urgencia}.\n\n` +
    `Resumo considerado:\n${resumo}`
  );
}

class AiPreService {
  async triagem({ leadId, persist = false, user = null }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;

    const resumo = pickResumo(pre);
    const triagem = buildTriagem(pre);
    const documentos = suggestDocs(pre);
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
            docsEnviados: normalizeDocs(pre?.documentos),
          },
        },
        user
      );
    }

    return { resumo, triagem, documentos, parecer };
  }

  async draft({ leadId, type }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;

    const t = safeText(type, 40) || 'peça';
    return {
      titulo: `Minuta de ${t}`,
      conteudo:
        `EXCELENTÍSSIMO SENHOR DOUTOR JUIZ.\n\n` +
        `Resumo (pré-atendimento):\n${pickResumo(pre)}\n\n` +
        `[Estruture aqui: fatos → fundamentos → pedidos.]\n`,
      status: 'Draft gerado (modelo inicial)',
    };
  }

  async report({ leadId, type }) {
    const pre = await preatendimentoService.getById(leadId);
    if (!pre) return null;

    return {
      message: 'Relatório gerado (modelo inicial)',
      type: type || 'json',
      preatendimentoId: pre?.id || leadId,
      categoria: safeText(pre?.categoria, 120),
      urgencia: safeText(pre?.urgencia, 40),
      resumo: pickResumo(pre),
      note: type === 'pdf'
        ? 'Implementar geração de PDF no próximo passo.'
        : type === 'email'
          ? 'Implementar envio por e-mail no próximo passo.'
          : null,
    };
  }
}

module.exports = new AiPreService();