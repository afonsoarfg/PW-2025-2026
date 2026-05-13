const express = require('express');
const router = express.Router();//mini servidor dentro do Express
const jwt = require('jsonwebtoken');
const Utilizador = require('../models/Utilizador');

// Registar utilizador
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nome, email, password, perfil } = req.body;

    const existe = await Utilizador.findOne({ email });
    if (existe) {
      return res.status(400).json({ erro: 'Email já registado.' });
    }

    const utilizador = new Utilizador({ nome, email, password, perfil });
    await utilizador.save();

    res.status(201).json({ mensagem: 'Utilizador criado com sucesso!' });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Login
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const utilizador = await Utilizador.findOne({ email });
    if (!utilizador) {
      return res.status(400).json({ erro: 'Email ou password incorretos.' });
    }

    const passwordCorreta = await utilizador.verificarPassword(password);
    if (!passwordCorreta) {
      return res.status(400).json({ erro: 'Email ou password incorretos.' });
    }

    const token = jwt.sign(
      { id: utilizador._id, perfil: utilizador.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      utilizador: {
        id: utilizador._id,
        nome: utilizador.nome,
        email: utilizador.email,
        perfil: utilizador.perfil
      }
    });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;