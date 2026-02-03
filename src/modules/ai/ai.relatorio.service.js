const caseService = require("../case/case.service");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");

function safeText(v, max = 20000) {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeAnexos(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      return {
        nome: safeText(a.nome, 240),
        tipo: safeText(a.tipo, 120),
        url: safeText(a.url, 1500),
      };
    })
    .filter(Boolean)
    .filter((a) => a.nome);
}

function normStatus(s) {
  return safeText(s, 80).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatDate(ts) {
  try {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    if (ts instanceof Date) return ts.toISOString();
    if (typeof ts === "object" && typeof ts.seconds === "number") {
      return new Date(ts.seconds * 1000).toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

async function gerarPdfBuffer({ titulo, conteudo }) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks = [];

  doc.pipe(stream);
  stream.on("data", (c) => chunks.push(c));

  doc.fontSize(16).text(titulo, { align: "center" });
  doc.moveDown();
  doc.fontSize(11).text(conteudo);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return Buffer.concat(chunks);
}

class AiRelatorioService {
  async getProcesso(processoId, user) {
    const p = await caseService.getCaseById(processoId, user);
    if (!p) return null;

    // se você tiver campos nomeados diferente em alguns docs, ajuste aqui.
    const processo = {
      ...p,
      titulo: safeText(p.titulo, 500),
      descricao: safeText(p.descricao, 20000),
      area: safeText(p.area, 120),
      status: safeText(p.status, 120),
      numeroProcesso: safeText(p.numeroProcesso, 120),
      resultadoSentenca: safeText(p.resultadoSentenca, 120),
      urgencia: safeText(p.urgencia, 60),
      valorAcordado: safeText(p.valorAcordado, 80),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      dataEncerramento: p.dataEncerramento,
      anexos: Array.isArray(p.anexos) ? p.anexos : [],
    };

    // Página é só arquivado: valida aqui também (definitivo)
    if (normStatus(processo.status) !== "arquivado") {
      return { error: "Este relatório é permitido apenas para processos com status 'Arquivado'." };
    }

    return processo;
  }

  buildRelatorioTexto(processo) {
    const anexos = normalizeAnexos(processo.anexos);
    const createdAt = formatDate(processo.createdAt);
    const updatedAt = formatDate(processo.updatedAt);
    const encerradoAt = formatDate(processo.dataEncerramento);

    const timeline = [];
    if (createdAt) timeline.push(`- ${createdAt}: Processo cadastrado no sistema.`);
    if (updatedAt && updatedAt !== createdAt) timeline.push(`- ${updatedAt}: Última atualização registrada.`);
    if (encerradoAt) timeline.push(`- ${encerradoAt}: Arquivamento/encerramento registrado.`);
    if (!timeline.length) timeline.push("- Sem datas suficientes para exibir histórico.");

    const anexosTxt = anexos.length
      ? anexos.slice(0, 25).map(a => `- ${a.nome}${a.url ? ` | ${a.url}` : ""}`).join("\n")
      : "- Nenhum anexo registrado.";

    const conteudo =
`RELATÓRIO FINAL — PRESTAÇÃO DE CONTAS

PROCESSO
- Título: ${processo.titulo || "-"}
- Área: ${processo.area || "-"}
- Status: ${processo.status || "-"}
- Nº do processo: ${processo.numeroProcesso || "-"}
- Resultado: ${processo.resultadoSentenca || "-"}

RESUMO DO CASO (conforme cadastro)
${processo.descricao || "(Sem descrição preenchida.)"}

LINHA DO TEMPO (com base em datas do sistema)
${timeline.join("\n")}

VALORES
- Valor acordado (se houver): ${processo.valorAcordado || "-"}

ANEXOS (nomes/links)
${anexosTxt}

OBSERVAÇÃO
Este relatório é gerado a partir dos dados registrados no sistema. Caso existam atos/andamentos fora do sistema, eles não aparecerão aqui.`;

    return { titulo: "Relatório Final Completo (PDF)", conteudo, acao: "Baixar PDF" };
  }

  buildPreventivoTexto(processo) {
    // recomendações seguras e gerais (sem inventar fatos)
    const conteudo =
`GUIA PREVENTIVO — ORIENTAÇÕES FUTURAS

Com base no encerramento do processo "${processo.titulo || "-"}", seguem recomendações práticas para reduzir riscos semelhantes:

1) Organização
- Manter documentos e comprovantes em pasta digital (por ano e por assunto).
- Registrar comunicações importantes por escrito (e-mail/WhatsApp).

2) Conduta preventiva
- Antes de assinar documentos/contratos, revisar cláusulas essenciais.
- Em caso de notificação/intimação, não responder sem orientação jurídica.

3) Quando procurar o escritório novamente
- Recebeu notificação, multa, cobrança ou convocação oficial.
- Surgiu um novo fato relacionado ao mesmo tema do processo.

OFERTA (opcional)
Acompanhamento preventivo mensal (modelo):
- Revisão e orientação rápida em dúvidas
- Checklist de documentos e riscos
- Prioridade no atendimento

(Edite valores e condições do seu escritório antes de enviar ao cliente.)`;

    return { titulo: "Guia de Orientações Futuras", conteudo, acao: "Copiar Texto" };
  }

  buildMensagemFidelizacao(processo) {
    const conteudo =
`Olá! 😊

Estou passando para te dar um fechamento oficial sobre o seu caso: "${processo.titulo || "-"}".
O processo foi encerrado e arquivado no nosso sistema.

✅ Se você quiser, posso te enviar um relatório final em PDF com:
- resumo do caso
- datas registradas no sistema
- anexos/links cadastrados
- valores (se houver)

📌 Uma pergunta rápida (NPS):
De 0 a 10, quanto você indicaria nosso escritório para um amigo/familiar?

Se puder, responda com um número e (opcional) uma frase do que mais gostou e o que poderíamos melhorar.
Isso ajuda muito a mantermos um atendimento excelente. 🙏`;

    return { titulo: "Mensagem de Encerramento e NPS", conteudo, acao: "Copiar Texto" };
  }

  async relatorioFinal({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;
    if (processo.error) return processo;

    return this.buildRelatorioTexto(processo);
  }

  async preventivo({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;
    if (processo.error) return processo;

    return this.buildPreventivoTexto(processo);
  }

  async mensagemNps({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;
    if (processo.error) return processo;

    return this.buildMensagemFidelizacao(processo);
  }

  async pdfFromText({ titulo, conteudo }) {
    const buffer = await gerarPdfBuffer({ titulo, conteudo });
    return { filename: "relatorio_final.pdf", buffer };
  }
}

module.exports = new AiRelatorioService();