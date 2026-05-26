const mongoose = require('mongoose');

const ervaAromaticaSchema = new mongoose.Schema({ 
  nome: {
    type: String,
    required: true,
    unique: true
  },
  descricao: {
    type: String
  },
  temperaturaMin: {
    type: Number,
    required: true
  },
  temperaturaMax: {
    type: Number,
    required: true
  },
  humidadeMin: {
    type: Number,
    required: true
  },
  humidadeMax: {
    type: Number,
    required: true
  },
  luminosidadeMin: {
    type: Number,
    required: true
  },
  luminosidadeMax: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ErvaAromatica', ervaAromaticaSchema);