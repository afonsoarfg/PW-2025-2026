const mongoose = require('mongoose');

const loteCultivoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: ['ativo', 'concluido', 'comprometido'],
    default: 'ativo'
  },
  dataInicio: {
    type: Date,
    default: Date.now
  },
  dataFim: {
    type: Date
  },
  planoCultivo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlanoCultivo'
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
  quantidadeInicial: {
    type: Number,
    default: 0
  },
  quantidadeFinal: {
    type: Number,
    default: 0
  },
  perdas: {
    type: Number,
    default: 0
  },
  notas: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('LoteCultivo', loteCultivoSchema);