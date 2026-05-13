const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB ligado com sucesso'))
  .catch((err) => console.error('Erro ao ligar ao MongoDB:', err));

// Rotas
const authRoutes = require('./routes/auth');
const planosRoutes = require('./routes/planos');
const ervasRoutes = require('./routes/ervas');

app.use('/api/auth', authRoutes);
app.use('/api/planos', planosRoutes);
app.use('/api/ervas', ervasRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API GREENHERB a funcionar!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});

module.exports = app;