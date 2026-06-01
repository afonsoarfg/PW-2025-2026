const mongoose = require('mongoose');

const medicaoAmbientalSchema = new mongoose.Schema({
  loteCultivo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoteCultivo',
    required: true
  },
  temperatura: {
    type: Number,
    required: true
  },
  humidade: {
    type: Number,
    required: true
  },
  luminosidade: {
    type: Number,
    required: true
  },
  registadaPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilizador',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('MedicaoAmbiental', medicaoAmbientalSchema);