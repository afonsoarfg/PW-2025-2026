const LogAuditoria = require('../models/LogAuditoria');

async function registarLog(utilizadorId, acao, entidade, entidadeId = null, detalhes = null) {
  try {
    const log = new LogAuditoria({
      utilizador: utilizadorId,
      acao,
      entidade,
      entidadeId,
      detalhes
    });
    await log.save();
  } catch (err) {
    console.error('Erro ao registar log:', err.message);
  }
}

module.exports = registarLog;