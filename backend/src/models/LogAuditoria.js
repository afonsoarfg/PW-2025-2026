const mongoose = require('mongoose');

const logAuditoriaSchema = new mongoose.Schema({
  utilizador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  },
  acao: {
    type: String,
    required: true
  },
  entidade: {
    type: String,
    required: true
  },
  entidadeId: {
    type: String
  },
  detalhes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('LogAuditoria', logAuditoriaSchema);