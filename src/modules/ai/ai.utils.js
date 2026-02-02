function safeText(v, max = 5000) {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function normalizeCategoria(v) {
  return safeText(v, 120).toLowerCase();
}

function pickResumo(pre) {
  return (
    safeText(pre?.resumoProblema, 1200) ||
    safeText(pre?.mensagem, 1200) ||
    safeText(pre?.informacaoExtra, 1200) ||
    'Sem descrição informada.'
  );
}

function normalizeDocsList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((d) => {
      if (typeof d === 'string') return d.trim();
      if (d && typeof d === 'object' && typeof d.nome === 'string') return d.nome.trim();
      return '';
    })
    .filter(Boolean);
}

module.exports = {
  safeText,
  normalizeCategoria,
  pickResumo,
  normalizeDocsList,
};
