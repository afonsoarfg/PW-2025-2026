const mongoose = require('mongoose');

const alertaSchema = new mongoose.Schema({
  loteCultivo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoteCultivo',
    required: true
  },
  medicaoAmbiental: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicaoAmbiental'
  },
  tipo: {
    type: String,
    enum: ['temperatura', 'humidade', 'luminosidade', 'sensor'],
    required: true
  },
  mensagem: {
    type: String,
    required: true
  },
  severidade: {
    type: String,
    enum: ['Informativo', 'Aviso', 'Critico'],
    default: 'Informativo'
  },
  estado: {
    type: String,
    enum: ['ativo', 'resolvido', 'ignorado'],
    default: 'ativo'
  },
  justificacao: {
    type: String
  },
  resolvidoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador'
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Alerta', alertaSchema);