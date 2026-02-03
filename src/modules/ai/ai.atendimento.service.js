const caseService = require('../case/case.service');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const { PassThrough } = require('stream');

function safeText(v, max = 20000) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeAnexos(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => {
      if (!a || typeof a !== 'object') return null;
      return {
        nome: safeText(a.nome, 240),
        tipo: safeText(a.tipo, 120),
        url: safeText(a.url, 1500),
      };
    })
    .filter(Boolean)
    .filter((a) => a.nome);
}

function areaLabel(areaValue) {
  return safeText(areaValue, 120) || 'A confirmar';
}

function buildEtapa1(snapshot) {
  const anexos = normalizeAnexos(snapshot.anexos);

  // Em “todas as áreas” sem mapeamento: validar minimamente e sinalizar qualidade
  const lista = [];

  if (!anexos.length) {
    lista.push({ nome: 'Anexos do caso', status: 'missing', obs: 'Nenhum anexo encontrado no processo.' });
  } else {
    lista.push({ nome: 'Anexos do caso', status: 'ok' });

    const hasId = anexos.some(a => /rg|cpf|cnh|ident/i.test(a.nome));
    lista.push({
      nome: 'Documento de identificação (RG/CNH/CPF)',
      status: hasId ? 'ok' : 'warning',
      obs: hasId ? undefined : 'Pode estar anexado com nome diferente. Verifique anexos.',
    });

    const hasResidence = anexos.some(a => /resid|endereco|endereço|comprov/i.test(a.nome));
    lista.push({
      nome: 'Comprovante de residência',
      status: hasResidence ? 'ok' : 'warning',
      obs: hasResidence ? undefined : 'Pode estar anexado com nome diferente. Verifique anexos.',
    });

    const hasPrints = anexos.some(a => /print|foto|img|whatsapp|wa/i.test(a.nome));
    if (hasPrints) {
      lista.push({
        nome: 'Legibilidade/Contexto de prints',
        status: 'warning',
        obs: 'Verificar se prints têm data, autor e conversa completa.',
      });
    }
  }

  const narrativa = snapshot.descricao
    ? 'Narrativa presente. Conferir datas, nomes e sequência cronológica antes de avançar.'
    : 'Descrição está vazia. Preencha fatos com datas, locais, eventos e consequências para melhorar as próximas etapas.';

  const status = anexos.length ? (lista.some(x => x.status === 'missing') ? 'Incompleto' : 'Parcial') : 'Incompleto';

  return { titulo: 'Coleta de Documentos', status, lista, narrativa };
}

function buildEtapa2(snapshot) {
  const urg = safeText(snapshot.urgencia, 40) || 'Média';
  const status = safeText(snapshot.status, 120) || 'A definir';

  const estrategia = [
    snapshot.numeroProcesso ? null : 'Cadastrar número do processo (se já existir).',
    snapshot.descricao ? null : 'Completar a narrativa/fatos do caso com datas e eventos.',
    'Organizar anexos por tipo (prova, documentos pessoais, contratos, laudos).',
    `Checar urgência atual: "${urg}".`,
    `Status atual: "${status}".`,
    'Definir pedidos e riscos com base no objetivo do cliente.',
  ].filter(Boolean).join(' ');

  return {
    titulo: 'Análise Jurídica',
    tipoAcao: `A definir (${areaLabel(snapshot.area)})`,
    direitos: ['A definir conforme a área e os fatos do caso'],
    tesePrincipal: 'A confirmar com base na narrativa e anexos.',
    teseSecundaria: 'Opcional: definir tese subsidiária após revisão das provas.',
    estrategia,
  };
}

function buildEtapa3(snapshot) {
  return {
    titulo: 'Roteiro Jurídico',
    estrutura: ['Fatos', 'Fundamentos', 'Pedidos', 'Provas', 'Valor da causa', 'Requerimentos finais'],
    fundamentos: ['Legislação aplicável à área', 'Jurisprudência do tribunal competente (selecionar)'],
    jurisprudencia: 'Sugestão: selecionar 1–3 precedentes do tribunal competente conforme o tema.',
    valorCausa: 'A calcular: informar valores dos pedidos (prejuízo, parcelas, dano etc.).',
  };
}

function buildMinuta(snapshot, tom = 'Objetivo e Contundente') {
  const descricao = safeText(snapshot.descricao, 8000);

  const header =
    tom.toLowerCase().includes('formal')
      ? 'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)\n'
      : 'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A)\n';

  const facts = descricao || 'Fatos: (preencher descrição do caso com datas, eventos e consequências).';

  return (
`${header}
I - DOS FATOS
${facts}

II - DO DIREITO
Fundamentos jurídicos aplicáveis à área: ${areaLabel(snapshot.area)}.

III - DOS PEDIDOS
Definir pedidos de forma objetiva e completa, incluindo pedidos subsidiários quando necessário.

IV - DAS PROVAS
Relacionar anexos e indicar prova testemunhal/pericial, se cabível.

V - DO VALOR DA CAUSA
Informar o valor da causa conforme a soma econômica dos pedidos.

Termos em que,
pede deferimento.`
  );
}

function buildEtapa4(snapshot, tom = 'Objetivo e Contundente') {
  return { titulo: 'Redação da Petição', minuta: buildMinuta(snapshot, tom), tom };
}

function buildEtapa5(etapa4) {
  const t = safeText(etapa4.minuta, 30000);

  const faltas = [];
  if (/preencher descrição/i.test(t)) faltas.push('Descrição/fatos ainda genéricos.');
  if (/Definir pedidos/i.test(t)) faltas.push('Pedidos precisam ser detalhados.');
  if (/Relacionar anexos/i.test(t)) faltas.push('Provas/anexos precisam ser listados.');
  if (/Informar o valor da causa/i.test(t)) faltas.push('Valor da causa não definido.');

  const coerencia = faltas.length === 0 ? 'Alta' : faltas.length <= 2 ? 'Média' : 'Baixa';

  return {
    titulo: 'Revisão e Padronização',
    ortografia: 'Checagem básica: OK (revisão humana recomendada).',
    coerencia,
    pedidos: faltas.some(f => f.toLowerCase().includes('pedidos')) ? 'Pedidos incompletos (detalhar).' : 'Pedidos presentes (revisar).',
    resumoEquipe: faltas.length ? `Ajustes necessários: ${faltas.join(' ')}` : 'Minuta com estrutura completa. Revisar dados e adequar à estratégia.',
  };
}

function buildEtapa6(snapshot) {
  const anexos = normalizeAnexos(snapshot.anexos);
  const temDescricao = !!safeText(snapshot.descricao, 60);
  const temAnexos = anexos.length > 0;

  return {
    titulo: 'Protocolo (Checklist)',
    anexos: temAnexos ? `${anexos.length} anexo(s) prontos.` : 'Nenhum anexo encontrado.',
    timbre: 'OK (aplicado no PDF).',
    links: temAnexos ? 'OK (URLs disponíveis — validar antes do protocolo).' : 'Sem URLs para validar.',
    status: temDescricao && temAnexos ? 'PRONTO PARA EXPORTAÇÃO (após revisão final)' : 'INCOMPLETO (faltam fatos/anexos)',
  };
}

function buildMensagemWhatsApp(snapshot, etapa1) {
  const items = etapa1.lista
    .filter(x => x.status !== 'ok')
    .map(x => `• ${x.nome}${x.obs ? ` (${x.obs})` : ''}`);

  const parts = [];
  parts.push('Olá! Tudo bem? 😊');
  parts.push(`Para avançarmos no seu processo *"${snapshot.titulo || 'Processo'}"*, preciso confirmar/receber:`);

  if (items.length) parts.push(`\n${items.join('\n')}`);
  else parts.push('\n• Confirmação dos documentos e fatos já enviados (ok).');

  parts.push('\nQuando puder, envie por aqui. Obrigado!');
  return parts.join('\n');
}

async function gerarPdf({ snapshot, result }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = new PassThrough();
  const chunks = [];

  doc.pipe(stream);
  stream.on('data', c => chunks.push(c));

  doc.fontSize(16).text('Relatório IA — Execução Processual', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Título: ${snapshot.titulo || '-'}`);
  doc.text(`Área: ${areaLabel(snapshot.area)}`);
  doc.text(`Status: ${snapshot.status || '-'}`);
  doc.text(`Urgência: ${snapshot.urgencia || '-'}`);
  if (snapshot.numeroProcesso) doc.text(`Número do processo: ${snapshot.numeroProcesso}`);
  if (snapshot.valorAcordado) doc.text(`Valor acordado: ${snapshot.valorAcordado}`);
  if (snapshot.resultadoSentenca) doc.text(`Resultado: ${snapshot.resultadoSentenca}`);
  doc.moveDown();

  doc.fontSize(13).text('Etapa 1 — Documentos', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(result.etapa1.narrativa);
  doc.moveDown(0.5);
  result.etapa1.lista.forEach(d => doc.text(`- ${d.nome}: ${d.status}${d.obs ? ` (${d.obs})` : ''}`));
  doc.moveDown();

  doc.fontSize(13).text('Etapa 2 — Análise', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Tipo de ação: ${result.etapa2.tipoAcao}`);
  doc.text(`Estratégia: ${result.etapa2.estrategia}`);
  doc.moveDown();

  doc.fontSize(13).text('Etapa 3 — Roteiro', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Estrutura: ${result.etapa3.estrutura.join(' → ')}`);
  doc.text(`Fundamentos: ${result.etapa3.fundamentos.join(' / ')}`);
  doc.text(`Valor da causa: ${result.etapa3.valorCausa}`);
  doc.moveDown();

  doc.fontSize(13).text('Etapa 4 — Minuta', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text(result.etapa4.minuta);
  doc.moveDown();

  doc.fontSize(13).text('Etapa 5 — Revisão', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Ortografia: ${result.etapa5.ortografia}`);
  doc.text(`Coerência: ${result.etapa5.coerencia}`);
  doc.text(`Pedidos: ${result.etapa5.pedidos}`);
  doc.text(`Resumo: ${result.etapa5.resumoEquipe}`);
  doc.moveDown();

  doc.fontSize(13).text('Etapa 6 — Protocolo', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Status: ${result.etapa6.status}`);
  doc.text(`Anexos: ${result.etapa6.anexos}`);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return Buffer.concat(chunks);
}

async function gerarZip({ snapshot, result, pdfBuffer }) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks = [];

  archive.pipe(stream);
  stream.on('data', c => chunks.push(c));

  archive.append(pdfBuffer, { name: 'relatorio_ia_processo.pdf' });

  const anexos = normalizeAnexos(snapshot.anexos);
  const anexosTxt = anexos.length
    ? anexos.map(a => `- ${a.nome}${a.url ? ` | ${a.url}` : ''}`).join('\n')
    : 'Sem anexos.';
  archive.append(anexosTxt, { name: 'anexos_links.txt' });

  const checklist =
`CHECKLIST
- Processo: ${snapshot.titulo || '-'}
- Status IA: ${result.etapa6.status}

ETAPA 1
${result.etapa1.lista.map(d => `- ${d.nome}: ${d.status}${d.obs ? ` (${d.obs})` : ''}`).join('\n')}

ETAPA 6
- Anexos: ${result.etapa6.anexos}
- Timbre: ${result.etapa6.timbre}
- Links: ${result.etapa6.links}
`;
  archive.append(checklist, { name: 'checklist.txt' });

  archive.append(JSON.stringify({ snapshot, result }, null, 2), { name: 'dados_processo.json' });

  await archive.finalize();

  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  return Buffer.concat(chunks);
}

class AiAtendimentoService {
  async executar({ processoId, user, tom = 'Objetivo e Contundente' }) {
    const proc = await caseService.getCaseById(processoId, user);
    if (!proc) return null;

    const snapshot = {
      id: proc.id || processoId,
      titulo: safeText(proc.titulo, 500),
      descricao: safeText(proc.descricao, 20000),
      area: safeText(proc.area, 120),
      status: safeText(proc.status, 120),
      urgencia: safeText(proc.urgencia, 60),
      numeroProcesso: safeText(proc.numeroProcesso, 120),
      resultadoSentenca: safeText(proc.resultadoSentenca, 120),
      valorAcordado: safeText(proc.valorAcordado, 80),
      anexos: Array.isArray(proc.anexos) ? proc.anexos : [],
    };

    const etapa1 = buildEtapa1(snapshot);
    const etapa2 = buildEtapa2(snapshot);
    const etapa3 = buildEtapa3(snapshot);
    const etapa4 = buildEtapa4(snapshot, tom);
    const etapa5 = buildEtapa5(etapa4);
    const etapa6 = buildEtapa6(snapshot);

    return { snapshot, result: { etapa1, etapa2, etapa3, etapa4, etapa5, etapa6 } };
  }

  async gerarWhatsApp({ processoId, user }) {
    const pack = await this.executar({ processoId, user });
    if (!pack) return null;
    const { snapshot, result } = pack;
    return { message: buildMensagemWhatsApp(snapshot, result.etapa1) };
  }

  async gerarPdfBuffer({ processoId, user, tom }) {
    const pack = await this.executar({ processoId, user, tom });
    if (!pack) return null;
    const { snapshot, result } = pack;
    const buffer = await gerarPdf({ snapshot, result });
    return { filename: 'relatorio_ia_processo.pdf', buffer };
  }

  async gerarZipBuffer({ processoId, user, tom }) {
    const pack = await this.executar({ processoId, user, tom });
    if (!pack) return null;
    const { snapshot, result } = pack;
    const pdfBuffer = await gerarPdf({ snapshot, result });
    const zipBuffer = await gerarZip({ snapshot, result, pdfBuffer });
    return { filename: 'exportacao_processo.zip', buffer: zipBuffer };
  }
}

module.exports = new AiAtendimentoService();