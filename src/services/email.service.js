require('dotenv').config();
const { Resend } = require('resend');

// Inicializa o Resend com a chave de API que está no seu arquivo .env
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia um e-mail de lembrete de compromisso.
 * @param {string} to - O e-mail do destinatário.
 * @param {object} compromisso - O objeto do compromisso vindo do Firestore.
 */
async function sendReminderEmail(to, compromisso) {
  // Converte o Timestamp do Firestore para um objeto Date e depois formata
  const dataFormatada = new Date(compromisso.dataHora.seconds * 1000).toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  console.log(`Preparando para enviar e-mail para: ${to}`);

  try {
    const { data, error } = await resend.emails.send({
      // O domínio 'resend.dev' é usado para testes no plano gratuito.
      from: 'Sass Juridico <onboarding@resend.dev>', 
      to: [to],
      subject: `Lembrete de Compromisso: ${compromisso.titulo}`,
      html: `
        <div style="font-family: sans-serif;">
          <h1>Lembrete de Compromisso</h1>
          <p>Olá,</p>
          <p>Este é um lembrete automático para o seu compromisso agendado:</p>
          <p><strong>Título:</strong> ${compromisso.titulo}</p>
          <p><strong>Tipo:</strong> ${compromisso.tipo}</p>
          <p><strong>Data e Hora:</strong> ${dataFormatada}</p>
          <p>Atenciosamente,<br>Equipe Sass Jurídico</p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro retornado pelo Resend:', error);
      return;
    }

    console.log('E-mail enviado com sucesso! ID:', data.id);
  } catch (exception) {
    console.error('Exceção ao tentar enviar o e-mail:', exception);
  }
}

module.exports = { sendReminderEmail };