const mongoose = require('mongoose');

const planoCultivoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['regular', 'emergencia', 'pontual'],
    required: true
  },
  ervaAromatica: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ErvaAromatica',
    required: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  },
  autorizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador'
  },
  // Campos para plano regular
  temperaturaMin: { type: Number },
  temperaturaMax: { type: Number },
  humidadeMin: { type: Number },
  humidadeMax: { type: Number },
  luminosidadeMin: { type: Number },
  luminosidadeMax: { type: Number },
  planoRega: { type: String },
  fertilizacao: { type: String },
  duracaoCiclo: { type: Number },

  // Campos para plano emergencia
  intervaloMinIntervencoes: { type: Number },
  tipoIntervencao: { type: String },
  dosagem: { type: String },

  // Estado do plano
  estado: {
    type: String,
    enum: ['ativo', 'concluido', 'cancelado'],
    default: 'ativo'
  },
  dataInicio: { type: Date, default: Date.now },
  dataFimPrevista: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('PlanoCultivo', planoCultivoSchema);