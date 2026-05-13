const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const utilizadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true //sao unicos
  },
  password: {
    type: String,
    required: true
  },
  perfil: {
    type: String,
    enum: ['Tecnico', 'Responsavel', 'Administrador'],//so aceita um desses
    default: 'Tecnico'
  }
}, { timestamps: true });//adiciona automaticamente createdAT(data e hora que o documento foi criado) e updateAT(ultima alteracao) a cada documento
// Encripta a password antes de guardar
utilizadorSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Método para verificar a password
utilizadorSchema.methods.verificarPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Utilizador', utilizadorSchema);