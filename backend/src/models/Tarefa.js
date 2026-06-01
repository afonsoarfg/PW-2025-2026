const mongoose = require('mongoose');

const tarefaSchema = new mongoose.Schema({
  loteCultivo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoteCultivo',
    required: true
  },
  tipo: {
    type: String,
    enum: ['rega', 'fertilizacao', 'colheita', 'monitorizacao'],
    required: true
  },
  estado: {
    type: String,
    enum: ['pendente', 'executada'],
    default: 'pendente'
  },
  descricao: {
    type: String
  },
  dataExecucao: {
    type: Date
  },
  executadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador'
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Tarefa', tarefaSchema);