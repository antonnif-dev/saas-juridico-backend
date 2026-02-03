const caseService = require("../case/case.service");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");

function safeText(v, max = 30000) {
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

function formatDateMaybe(ts) {
  // aceita string ISO, Date, timestamp firebase já convertido por service/repo
  try {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    if (ts instanceof Date) return ts.toISOString();
    // se vier como { seconds: ... }
    if (typeof ts === "object" && typeof ts.seconds === "number") {
      return new Date(ts.seconds * 1000).toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

function extractKeywords(text) {
  const t = safeText(text, 60000).toLowerCase();
  if (!t) return [];

  const stop = new Set([
    "que","para","com","sem","uma","por","dos","das","de","do","da","em","no","na","nos","nas",
    "ao","aos","às","as","os","um","uma","uns","umas","e","ou","se","ser","foi","são","isso",
    "art","art.","lei","juiz","sentença","processo","autos","autor","réu","requerente","requerido",
  ]);

  const words = t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && w.length <= 24 && !stop.has(w));

  // frequência simples
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

function sliceAround(text, needles) {
  const src = safeText(text, 60000);
  if (!src) return [];
  const lower = src.toLowerCase();

  const out = [];
  for (const n of needles) {
    const idx = lower.indexOf(n);
    if (idx >= 0) {
      const start = Math.max(0, idx - 180);
      const end = Math.min(src.length, idx + 260);
      out.push(src.slice(start, end).trim());
    }
  }
  // remove duplicados aproximados
  return [...new Set(out)].slice(0, 8);
}

function analyzeSentencaVsProcesso({ processo, sentenca }) {
  const anexos = normalizeAnexos(processo.anexos);
  const hasDocs = anexos.length > 0;
  const hasNarrative = !!safeText(processo.descricao, 80);

  const sLower = safeText(sentenca, 60000).toLowerCase();
  const negKeys = ["improced", "indefer", "não comprov", "ausência de prova", "ônus da prova", "prescri", "ilegitim", "inépcia", "carência"];
  const posKeys = ["proced", "conden", "reconhec", "defiro", "parcialmente", "acolho", "defer"];

  const negHits = negKeys.filter(k => sLower.includes(k));
  const posHits = posKeys.filter(k => sLower.includes(k));

  const trechosChave = sliceAround(sentenca, [...negHits.slice(0, 5), ...posHits.slice(0, 5)]);

  const pros = [];
  const contras = [];

  // heurísticas reais (não inventa lei)
  if (posHits.length) pros.push("Há pontos acolhidos/trechos favoráveis na sentença (possível ampliar/defender em recurso).");
  if (negHits.includes("omissão") || sLower.includes("omiss")) pros.push("Possível omissão: verificar se todos os pedidos/teses foram enfrentados.");
  if (sLower.includes("contradi")) pros.push("Há menção a contradição: pode justificar embargos/ajustes antes do recurso.");
  if (sLower.includes("erro material") || sLower.includes("erro") && sLower.includes("material")) pros.push("Possível erro material (datas/valores/nomes): pode ser corrigido e fortalecer o recurso.");

  if (!hasDocs) contras.push("Não há anexos no processo: recurso tende a ser fraco sem prova mínima/organização documental.");
  if (!hasNarrative) contras.push("Descrição do caso está curta/genérica: dificulta identificar teses e pontos atacáveis.");
  if (negHits.length) contras.push("A sentença contém fundamentos desfavoráveis (ex.: ausência de prova / ônus da prova / prescrição). Recurso precisa atacar isso diretamente.");

  // score (0-100) simples e justificável
  let score = 50;
  if (hasDocs) score += 10;
  if (hasNarrative) score += 10;
  score += Math.min(10, posHits.length * 3);
  score -= Math.min(20, negHits.length * 6);

  score = Math.max(0, Math.min(100, score));

  const recomendacao =
    score >= 70 ? "Há indicativos de viabilidade. Recomenda-se preparar o recurso com foco nos fundamentos centrais da sentença e reforçar precedentes." :
    score >= 45 ? "Viabilidade moderada. Só vale avançar se houver argumento claro contra o fundamento do juiz e/ou prova relevante a acrescentar/ressaltar." :
                  "Baixa viabilidade com os dados atuais. Recomenda-se reavaliar custo/benefício e checar se há omissão/erro material antes de recorrer.";

  const checklist = [
    "Identificar qual fundamento foi determinante para o indeferimento (núcleo da sentença).",
    "Verificar se todos os pedidos foram enfrentados (omissão) e se há contradições/erro material.",
    "Separar anexos por tema (prova do fato, documentos pessoais, contratos, laudos).",
    "Definir tese recursal: atacar fundamento determinante (não só repetir a inicial).",
    "Levantar precedentes do tribunal competente sobre o tema.",
  ];

  return {
    resumoEstruturado: {
      area: safeText(processo.area, 120) || "A confirmar",
      status: safeText(processo.status, 120) || "-",
      resultadoSentenca: safeText(processo.resultadoSentenca, 120) || "-",
      fundamentosProvaveis: {
        positivosDetectados: posHits,
        negativosDetectados: negHits,
      },
      trechosChave,
    },
    paralelo: {
      alegadoNoProcesso: safeText(processo.descricao, 12000) || "(Descrição do processo não preenchida.)",
      observadoNaSentenca: trechosChave.length ? trechosChave.join("\n\n---\n\n") : "(Não foi possível extrair trechos automaticamente.)",
      anexosResumo: anexos.map(a => a.nome).slice(0, 20),
    },
    pros,
    contras,
    score,
    recomendacao,
    checklist,
  };
}

function buildTradutorCliente({ processo, analise }) {
  const titulo = processo.titulo || "Processo";
  const area = processo.area || "área não informada";
  const resultado = processo.resultadoSentenca || "resultado não informado";

  const mensagem =
`Olá! Tudo bem? 😊

Saiu uma decisão do juiz (sentença) no processo "${titulo}" (${area}).

📌 Resultado: ${resultado}.
📍 O que isso significa em linguagem simples:
- O juiz analisou os pedidos e tomou uma decisão com base nos documentos e nos fatos apresentados.
- Neste momento, o escritório está avaliando se vale a pena recorrer.

✅ Próximos passos (do escritório):
${analise.checklist.slice(0, 3).map(i => `- ${i}`).join("\n")}

Assim que fecharmos a estratégia, te avisamos com clareza sobre as chances e os custos/benefícios de seguir.`;

  return { titulo: "Explicação para o Cliente (WhatsApp/Email)", conteudo: mensagem, acao: "Copiar Texto" };
}

function buildRelatorioMensal({ processo }) {
  // sem inventar movimentações: usa datas reais disponíveis
  const lines = [];
  const createdAt = formatDateMaybe(processo.createdAt);
  const updatedAt = formatDateMaybe(processo.updatedAt);
  const encerramento = formatDateMaybe(processo.dataEncerramento);

  if (createdAt) lines.push(`- ${createdAt}: Processo criado no sistema.`);
  if (updatedAt && updatedAt !== createdAt) lines.push(`- ${updatedAt}: Última atualização registrada.`);
  if (encerramento) lines.push(`- ${encerramento}: Data de encerramento registrada.`);

  if (!lines.length) lines.push("- Sem datas suficientes para gerar histórico.");

  const conteudo =
`Relatório do Processo: ${processo.titulo || "-"}
Status: ${processo.status || "-"}

Histórico (com base em datas registradas no sistema):
${lines.join("\n")}

Próximos passos:
- Revisar sentença e fundamentos
- Decidir sobre recurso com base na viabilidade`;

  return { titulo: "Relatório Mensal (Baseado em Datas do Sistema)", conteudo, acao: "Gerar PDF" };
}

function buildGuiaEstrategia({ processo, analise }) {
  const conteudo =
`Guia de Estratégia (Pós-Sentença)

1) O que atacar no recurso:
- Foco no fundamento determinante da sentença (núcleo do indeferimento).
- Evitar repetir a inicial; estruturar resposta direta ao motivo do juiz.

2) Pontos positivos:
${analise.pros.length ? analise.pros.map(p => `- ${p}`).join("\n") : "- Nenhum ponto positivo detectado automaticamente. Revisar manualmente."}

3) Pontos de risco:
${analise.contras.length ? analise.contras.map(c => `- ${c}`).join("\n") : "- Nenhum risco detectado automaticamente. Revisar manualmente."}

4) Checklist prático:
${analise.checklist.map(i => `- ${i}`).join("\n")}

Score de viabilidade: ${analise.score}/100
Recomendação: ${analise.recomendacao}`;

  return { titulo: "Estratégia Recursal — Viabilidade e Checklist", conteudo, acao: "Gerar PDF" };
}

function buildMinutaRecurso({ processo, analise }) {
  const area = processo.area || "A confirmar";
  const titulo = processo.titulo || "Processo";
  const num = processo.numeroProcesso || "";

  const conteudo =
`MINUTA — RECURSO (MODELO BASE)

Processo: ${titulo}
Número: ${num}
Área: ${area}

I — SÍNTESE DO CASO
${safeText(processo.descricao, 12000) || "(Descrição não preenchida.)"}

II — SÍNTESE DA SENTENÇA (PONTOS RELEVANTES)
${analise.resumoEstruturado.trechosChave?.length ? analise.resumoEstruturado.trechosChave.join("\n\n") : "(Inserir trechos essenciais da sentença.)"}

III — RAZÕES PARA REFORMA/ANULAÇÃO (ESTRUTURA)
1) Ataque ao fundamento determinante
- (Escrever aqui o motivo principal usado pelo juiz e a resposta direta)

2) Omissões/contradições/erro material (se houver)
- (Listar e fundamentar)

3) Reforço probatório e precedentes
- Palavras-chave para busca: ${extractKeywords((processo.descricao || "") + " " + (processo.sentenca || "")).join(", ")}

IV — PEDIDOS
- Conhecimento do recurso
- Reforma/Anulação nos pontos indicados
- Demais requerimentos cabíveis

(Observação: ajustar a espécie recursal conforme o rito/tribunal competente.)`;

  return { titulo: "Minuta de Recurso (Modelo Base)", conteudo, acao: "Exportar (TXT/PDF)" };
}

function buildDatajudVisual({ processo }) {
  const baseText = `${processo.descricao || ""}\n${processo.sentenca || ""}`;
  const keywords = extractKeywords(baseText);
  const payload = {
    // contrato “pronto” para Datajud no futuro
    query: keywords.join(" "),
    filtros: {
      area: processo.area || null,
      numeroProcesso: processo.numeroProcesso || null,
    },
    keywords,
  };

  const conteudo =
`Pesquisa CNJ/Datajud (VISUAL — contrato pronto para API)

Palavras-chave sugeridas:
${keywords.length ? keywords.map(k => `- ${k}`).join("\n") : "- (Sem palavras-chave suficientes; preencha descrição/sentença.)"}

Query sugerida:
${payload.query || "(vazia)"}

Filtros sugeridos:
- Área: ${payload.filtros.area || "-"}
- Nº processo: ${payload.filtros.numeroProcesso || "-"}

(Quando o Datajud estiver integrado, esta mesma função retornará a lista de casos semelhantes.)`;

  return { titulo: "Consulta CNJ/Datajud (Visual)", conteudo, acao: "Copiar Query", payload };
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

class AiPosService {
  async getProcesso(processoId, user) {
    const p = await caseService.getCaseById(processoId, user);
    if (!p) return null;

    // garante campo sentenca
    const processo = {
      ...p,
      sentenca: safeText(p.sentenca, 60000),
      descricao: safeText(p.descricao, 30000),
      area: safeText(p.area, 120),
      titulo: safeText(p.titulo, 500),
      status: safeText(p.status, 120),
      resultadoSentenca: safeText(p.resultadoSentenca, 120),
      numeroProcesso: safeText(p.numeroProcesso, 120),
      valorAcordado: safeText(p.valorAcordado, 80),
      urgencia: safeText(p.urgencia, 60),
      anexos: Array.isArray(p.anexos) ? p.anexos : [],
    };

    return processo;
  }

  async analisarSentenca({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;

    if (!processo.sentenca) {
      // definitivo: não “simula”; retorna erro claro
      return { error: "Processo não possui campo 'sentenca' preenchido." };
    }

    return analyzeSentencaVsProcesso({ processo, sentenca: processo.sentenca });
  }

  async tradutorCliente({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;

    const analise = processo.sentenca
      ? analyzeSentencaVsProcesso({ processo, sentenca: processo.sentenca })
      : { checklist: ["Aguardar preenchimento da sentença no processo."], pros: [], contras: [], score: 0, recomendacao: "Sem sentença." , resumoEstruturado: { trechosChave: [] }};

    return buildTradutorCliente({ processo, analise });
  }

  async relatorioMensal({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;
    return buildRelatorioMensal({ processo });
  }

  async estrategiaRecursal({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;

    if (!processo.sentenca) {
      return { error: "Processo não possui campo 'sentenca' preenchido." };
    }

    const analise = analyzeSentencaVsProcesso({ processo, sentenca: processo.sentenca });
    return buildGuiaEstrategia({ processo, analise });
  }

  async consultaDatajudVisual({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;
    return buildDatajudVisual({ processo });
  }

  async minutarRecurso({ processoId, user }) {
    const processo = await this.getProcesso(processoId, user);
    if (!processo) return null;

    if (!processo.sentenca) {
      return { error: "Processo não possui campo 'sentenca' preenchido." };
    }

    const analise = analyzeSentencaVsProcesso({ processo, sentenca: processo.sentenca });
    return buildMinutaRecurso({ processo, analise });
  }

  async pdfFromResult({ titulo, conteudo }) {
    const buffer = await gerarPdfBuffer({ titulo, conteudo });
    return { filename: "ia_pos_atendimento.pdf", buffer };
  }
}

module.exports = new AiPosService();