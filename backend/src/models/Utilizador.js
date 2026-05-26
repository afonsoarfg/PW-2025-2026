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
    unique: true 
  },
  password: {
    type: String,
    required: true
  },
  perfil: {
    type: String,
    enum: ['Tecnico', 'Responsavel', 'Administrador'],
    default: 'Tecnico'
  }
}, { timestamps: true });
utilizadorSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

utilizadorSchema.methods.verificarPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Utilizador', utilizadorSchema);